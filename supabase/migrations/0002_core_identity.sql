-- ============================================================
-- Core identity tables
-- ============================================================
create table if not exists public.locations (
  id           uuid primary key default gen_random_uuid(),
  name         text not null unique,
  code         text unique,
  address      text,
  gps_lat      numeric(9,6),
  gps_lng      numeric(9,6),
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  full_name      text not null default '',
  email          text,
  phone          text,
  role           user_role not null default 'viewer',
  business_units business_unit[] not null default '{wifi,services,refreshment}',
  location_ids   uuid[] not null default '{}',
  avatar_url     text,
  is_active      boolean not null default true,
  last_seen_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table if not exists public.counters (
  key           text primary key,
  prefix        text not null,
  current_value bigint not null default 0,
  padding       int not null default 5
);

create table if not exists public.settings (
  key        text primary key,
  value      jsonb not null,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

create table if not exists public.fx_rates (
  id            uuid primary key default gen_random_uuid(),
  effective_date date not null unique,
  ssp_per_usd   numeric(14,4) not null check (ssp_per_usd > 0),
  created_by    uuid references public.profiles(id),
  created_at    timestamptz not null default now()
);

create table if not exists public.audit_log (
  id         bigserial primary key,
  table_name text not null,
  record_id  uuid,
  action     text not null,
  actor_id   uuid,
  before     jsonb,
  after      jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_audit_table_record on public.audit_log(table_name, record_id);
create index if not exists idx_audit_created on public.audit_log(created_at desc);

create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  type       text not null,
  title      text not null,
  body       text,
  link       text,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_notifications_user on public.notifications(user_id, read_at);

create table if not exists public.error_log (
  id         bigserial primary key,
  user_id    uuid,
  route      text,
  message    text not null,
  stack      text,
  context    jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Shared helper functions (grown incrementally as later
-- migrations add the tables/RPCs that need them; the full set
-- lands in 0008_functions_views_triggers.sql).
-- ============================================================
create or replace function public.set_updated_at() returns trigger
language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end $$;

create or replace function public.next_code(p_key text) returns text
language plpgsql security definer set search_path = public as $$
declare v_prefix text; v_val bigint; v_pad int;
begin
  update public.counters
     set current_value = current_value + 1
   where key = p_key
  returning prefix, current_value, padding into v_prefix, v_val, v_pad;
  if v_prefix is null then
    raise exception 'Unknown counter key: %', p_key;
  end if;
  return v_prefix || lpad(v_val::text, v_pad, '0');
end $$;

-- auth helpers (security definer: bypass RLS, no recursion)
create or replace function public.auth_role() returns user_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.auth_units() returns business_unit[]
language sql stable security definer set search_path = public as $$
  select coalesce(business_units, '{}') from public.profiles where id = auth.uid()
$$;

create or replace function public.auth_locations() returns uuid[]
language sql stable security definer set search_path = public as $$
  select coalesce(location_ids, '{}') from public.profiles where id = auth.uid()
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.auth_role() in ('owner','admin'), false)
$$;

create or replace function public.can_write() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.auth_role() <> 'viewer', false)
$$;

-- Central visibility rule used by every business-table policy.
create or replace function public.row_visible(
  p_units    business_unit[],
  p_location uuid,
  p_owner    uuid,
  p_creator  uuid
) returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when public.auth_role() is null then false
    when public.is_admin() then true
    when p_units is not null and not (p_units && public.auth_units()) then false
    when public.auth_role() in ('manager','viewer') then
      cardinality(public.auth_locations()) = 0
      or p_location is null
      or p_location = any(public.auth_locations())
    else
      p_owner = auth.uid()
      or p_creator = auth.uid()
      or (p_location is not null and p_location = any(public.auth_locations()))
  end
$$;

create or replace function public.fn_audit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_log(table_name, record_id, action, actor_id, before, after)
  values (
    tg_table_name,
    case when tg_op = 'DELETE' then (old.id)::uuid else (new.id)::uuid end,
    tg_op,
    auth.uid(),
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) else null end
  );
  return coalesce(new, old);
end $$;

-- Never trusts a client-supplied role: only the very first account ever
-- created becomes 'owner' (bootstrapping the app); everyone after starts as
-- 'viewer' and must be promoted explicitly by an admin/owner. An advisory
-- lock serializes concurrent signups so two simultaneous first-runs can't
-- both become 'owner'.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform pg_advisory_xact_lock(hashtext('hzx_first_run_owner'));

  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
    new.email,
    case when not exists (select 1 from public.profiles) then 'owner'::user_role else 'viewer'::user_role end
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Lets the signed-out login screen know whether to render "create the first
-- owner account" instead of a normal login form. Leaks no data beyond that
-- single boolean.
create or replace function public.is_first_run() returns boolean
language sql stable security definer set search_path = public as $$
  select not exists (select 1 from public.profiles)
$$;

-- updated_at triggers for this migration's tables
drop trigger if exists trg_locations_updated on public.locations;
create trigger trg_locations_updated before update on public.locations
  for each row execute function public.set_updated_at();

drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- audit trigger on profiles (identity changes are always audited)
drop trigger if exists trg_profiles_audit on public.profiles;
create trigger trg_profiles_audit after insert or update or delete on public.profiles
  for each row execute function public.fn_audit();

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.locations enable row level security;
drop policy if exists locations_read on public.locations;
create policy locations_read on public.locations for select to authenticated using (true);
drop policy if exists locations_write on public.locations;
create policy locations_write on public.locations for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

alter table public.profiles enable row level security;
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.auth_role() is not null);
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()) and role = public.auth_role());
drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all on public.profiles for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

alter table public.counters enable row level security;
drop policy if exists counters_admin_only on public.counters;
create policy counters_admin_only on public.counters for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

alter table public.settings enable row level security;
drop policy if exists settings_read on public.settings;
create policy settings_read on public.settings for select to authenticated using (true);
drop policy if exists settings_write on public.settings;
create policy settings_write on public.settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

alter table public.fx_rates enable row level security;
drop policy if exists fx_rates_read on public.fx_rates;
create policy fx_rates_read on public.fx_rates for select to authenticated using (true);
drop policy if exists fx_rates_write on public.fx_rates;
create policy fx_rates_write on public.fx_rates for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

alter table public.audit_log enable row level security;
drop policy if exists audit_read on public.audit_log;
create policy audit_read on public.audit_log for select to authenticated using (public.is_admin());
-- No insert/update/delete policy for any client role: audit rows are written
-- exclusively by the security-definer fn_audit() trigger function.

alter table public.notifications enable row level security;
drop policy if exists notif_own on public.notifications;
create policy notif_own on public.notifications for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

alter table public.error_log enable row level security;
drop policy if exists error_log_insert on public.error_log;
create policy error_log_insert on public.error_log for insert to authenticated
  with check (user_id = (select auth.uid()) or user_id is null);
drop policy if exists error_log_read on public.error_log;
create policy error_log_read on public.error_log for select to authenticated
  using (public.is_admin());

create index if not exists idx_fx_rates_created_by on public.fx_rates(created_by);
create index if not exists idx_settings_updated_by on public.settings(updated_by);

-- ============================================================
-- Lock down direct RPC access to internal helper/trigger functions.
-- auth_role/auth_units/auth_locations/is_admin/can_write/row_visible stay
-- callable by `authenticated` because RLS policies need to invoke them for
-- that role; anon never needs them since every policy above is "to
-- authenticated" only. next_code/fn_audit/handle_new_user are only ever
-- invoked from other SECURITY DEFINER functions or the trigger mechanism
-- (both run as the function owner regardless of role grants), so no client
-- role needs direct EXECUTE on them.
-- ============================================================
revoke execute on function public.auth_role()      from public, anon;
revoke execute on function public.auth_units()     from public, anon;
revoke execute on function public.auth_locations() from public, anon;
revoke execute on function public.is_admin()       from public, anon;
revoke execute on function public.can_write()      from public, anon;
revoke execute on function public.row_visible(business_unit[], uuid, uuid, uuid) from public, anon;
grant execute on function public.auth_role()      to authenticated;
grant execute on function public.auth_units()     to authenticated;
grant execute on function public.auth_locations() to authenticated;
grant execute on function public.is_admin()       to authenticated;
grant execute on function public.can_write()      to authenticated;
grant execute on function public.row_visible(business_unit[], uuid, uuid, uuid) to authenticated;

revoke execute on function public.next_code(text) from public, anon, authenticated;
revoke execute on function public.fn_audit() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.is_first_run() to anon, authenticated;
