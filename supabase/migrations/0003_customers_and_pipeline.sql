-- ============================================================
-- Tags, customers, pipeline, activities, tasks
-- ============================================================
create table if not exists public.tags (
  id     uuid primary key default gen_random_uuid(),
  name   text not null unique,
  color  text not null default '#14B8A6'
);

create table if not exists public.customers (
  id              uuid primary key default gen_random_uuid(),
  customer_code   text unique,
  type            customer_type not null default 'individual',
  full_name       text,
  business_name   text,
  display_name    text generated always as (coalesce(nullif(business_name,''), full_name)) stored,
  phone_primary   text not null,
  phone_alt       text,
  whatsapp        text,
  email           text,
  address_text    text,
  area            text,
  location_id     uuid references public.locations(id),
  gps_lat         numeric(9,6),
  gps_lng         numeric(9,6),
  business_units  business_unit[] not null default '{wifi}',
  status          customer_status not null default 'lead',
  source          text,
  owner_id        uuid references public.profiles(id),
  tags            text[] not null default '{}',
  preferred_language text not null default 'en',
  opted_out       boolean not null default false,
  notes           text,
  last_contact_at timestamptz,
  created_by      uuid references public.profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);
create unique index if not exists uq_customers_phone_active
  on public.customers(phone_primary) where deleted_at is null;
create index if not exists idx_customers_status   on public.customers(status) where deleted_at is null;
create index if not exists idx_customers_owner    on public.customers(owner_id);
create index if not exists idx_customers_location on public.customers(location_id);
create index if not exists idx_customers_units    on public.customers using gin(business_units);
create index if not exists idx_customers_search   on public.customers using gin (
  (coalesce(full_name,'') || ' ' || coalesce(business_name,'') || ' ' || phone_primary) extensions.gin_trgm_ops
);

create table if not exists public.customer_contacts (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  name        text not null,
  job_title   text,
  phone       text,
  email       text,
  is_primary  boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists idx_customer_contacts_customer on public.customer_contacts(customer_id);

create table if not exists public.customer_files (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  storage_path text not null,
  file_name   text not null,
  doc_type    text,
  size_bytes  bigint,
  uploaded_by uuid references public.profiles(id),
  created_at  timestamptz not null default now()
);
create index if not exists idx_customer_files_customer on public.customer_files(customer_id);

create table if not exists public.pipelines (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  business_unit business_unit not null,
  is_default    boolean not null default false,
  unique (name, business_unit)
);

create table if not exists public.pipeline_stages (
  id          uuid primary key default gen_random_uuid(),
  pipeline_id uuid not null references public.pipelines(id) on delete cascade,
  name        text not null,
  sort_order  int not null default 0,
  probability int not null default 0 check (probability between 0 and 100),
  is_won      boolean not null default false,
  is_lost     boolean not null default false,
  unique (pipeline_id, name)
);
create index if not exists idx_pipeline_stages_pipeline on public.pipeline_stages(pipeline_id, sort_order);

create table if not exists public.deals (
  id             uuid primary key default gen_random_uuid(),
  deal_code      text unique,
  title          text not null,
  customer_id    uuid not null references public.customers(id) on delete cascade,
  pipeline_id    uuid not null references public.pipelines(id),
  stage_id       uuid not null references public.pipeline_stages(id),
  business_unit  business_unit not null,
  value          numeric(14,2) not null default 0,
  currency       currency_code not null default 'SSP',
  probability    int check (probability between 0 and 100),
  expected_close date,
  status         deal_status not null default 'open',
  lost_reason    text,
  source         text,
  owner_id       uuid references public.profiles(id),
  location_id    uuid references public.locations(id),
  last_activity_at timestamptz default now(),
  closed_at      timestamptz,
  created_by     uuid references public.profiles(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz,
  constraint deals_lost_reason_required check (status <> 'lost' or lost_reason is not null)
);
create index if not exists idx_deals_stage    on public.deals(stage_id) where deleted_at is null;
create index if not exists idx_deals_customer on public.deals(customer_id);
create index if not exists idx_deals_owner    on public.deals(owner_id);

create table if not exists public.activities (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete cascade,
  deal_id     uuid references public.deals(id) on delete set null,
  ticket_id   uuid,
  project_id  uuid,
  type        activity_type not null,
  direction   activity_direction not null default 'outbound',
  subject     text,
  body        text,
  outcome     text,
  duration_minutes int,
  occurred_at timestamptz not null default now(),
  user_id     uuid references public.profiles(id),
  created_at  timestamptz not null default now()
);
create index if not exists idx_activities_customer on public.activities(customer_id, occurred_at desc);
create index if not exists idx_activities_deal     on public.activities(deal_id, occurred_at desc);

create table if not exists public.tasks (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text,
  due_at       timestamptz,
  priority     priority_level not null default 'normal',
  status       task_status not null default 'open',
  assigned_to  uuid references public.profiles(id),
  customer_id  uuid references public.customers(id) on delete cascade,
  related_type text,
  related_id   uuid,
  completed_at timestamptz,
  created_by   uuid references public.profiles(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_tasks_assignee on public.tasks(assigned_to, status, due_at);

-- ============================================================
-- Code-generation triggers
-- ============================================================
create or replace function public.fn_customer_code() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.customer_code is null then
    new.customer_code := public.next_code('customer');
  end if;
  return new;
end $$;
revoke execute on function public.fn_customer_code() from public, anon, authenticated;

drop trigger if exists trg_customer_code on public.customers;
create trigger trg_customer_code before insert on public.customers
  for each row execute function public.fn_customer_code();

create or replace function public.fn_deal_code() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.deal_code is null then
    new.deal_code := public.next_code('deal');
  end if;
  return new;
end $$;
revoke execute on function public.fn_deal_code() from public, anon, authenticated;

drop trigger if exists trg_deal_code on public.deals;
create trigger trg_deal_code before insert on public.deals
  for each row execute function public.fn_deal_code();

drop trigger if exists trg_customers_updated on public.customers;
create trigger trg_customers_updated before update on public.customers
  for each row execute function public.set_updated_at();

drop trigger if exists trg_deals_updated on public.deals;
create trigger trg_deals_updated before update on public.deals
  for each row execute function public.set_updated_at();

drop trigger if exists trg_customers_audit on public.customers;
create trigger trg_customers_audit after insert or update or delete on public.customers
  for each row execute function public.fn_audit();

drop trigger if exists trg_deals_audit on public.deals;
create trigger trg_deals_audit after insert or update or delete on public.deals
  for each row execute function public.fn_audit();

-- Touch the deal's last_activity_at whenever a new activity is logged
-- against it, so the pipeline's rotting indicator reflects reality.
create or replace function public.fn_deal_touch_activity() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.deal_id is not null then
    update public.deals set last_activity_at = new.occurred_at where id = new.deal_id;
  end if;
  return new;
end $$;
revoke execute on function public.fn_deal_touch_activity() from public, anon, authenticated;

drop trigger if exists trg_activities_touch_deal on public.activities;
create trigger trg_activities_touch_deal after insert on public.activities
  for each row execute function public.fn_deal_touch_activity();

drop trigger if exists trg_tasks_updated on public.tasks;
create trigger trg_tasks_updated before update on public.tasks
  for each row execute function public.set_updated_at();

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.tags enable row level security;
drop policy if exists tags_read on public.tags;
create policy tags_read on public.tags for select to authenticated using (true);
drop policy if exists tags_write on public.tags;
create policy tags_write on public.tags for all to authenticated
  using (public.can_write()) with check (public.can_write());

alter table public.customers enable row level security;
drop policy if exists customers_select on public.customers;
create policy customers_select on public.customers
  for select to authenticated
  using (deleted_at is null and public.row_visible(business_units, location_id, owner_id, created_by));
drop policy if exists customers_insert on public.customers;
create policy customers_insert on public.customers
  for insert to authenticated
  with check (public.can_write());
drop policy if exists customers_update on public.customers;
create policy customers_update on public.customers
  for update to authenticated
  using (public.can_write() and public.row_visible(business_units, location_id, owner_id, created_by))
  with check (public.can_write());
drop policy if exists customers_delete on public.customers;
create policy customers_delete on public.customers
  for delete to authenticated
  using (public.is_admin());

alter table public.customer_contacts enable row level security;
drop policy if exists customer_contacts_select on public.customer_contacts;
create policy customer_contacts_select on public.customer_contacts for select to authenticated
  using (exists (
    select 1 from public.customers c
    where c.id = customer_contacts.customer_id and c.deleted_at is null
      and public.row_visible(c.business_units, c.location_id, c.owner_id, c.created_by)
  ));
drop policy if exists customer_contacts_write on public.customer_contacts;
create policy customer_contacts_write on public.customer_contacts for all to authenticated
  using (public.can_write() and exists (
    select 1 from public.customers c
    where c.id = customer_contacts.customer_id and c.deleted_at is null
      and public.row_visible(c.business_units, c.location_id, c.owner_id, c.created_by)
  ))
  with check (public.can_write());

alter table public.customer_files enable row level security;
drop policy if exists customer_files_select on public.customer_files;
create policy customer_files_select on public.customer_files for select to authenticated
  using (exists (
    select 1 from public.customers c
    where c.id = customer_files.customer_id and c.deleted_at is null
      and public.row_visible(c.business_units, c.location_id, c.owner_id, c.created_by)
  ));
drop policy if exists customer_files_write on public.customer_files;
create policy customer_files_write on public.customer_files for all to authenticated
  using (public.can_write() and exists (
    select 1 from public.customers c
    where c.id = customer_files.customer_id and c.deleted_at is null
      and public.row_visible(c.business_units, c.location_id, c.owner_id, c.created_by)
  ))
  with check (public.can_write());

alter table public.pipelines enable row level security;
drop policy if exists pipelines_read on public.pipelines;
create policy pipelines_read on public.pipelines for select to authenticated using (true);
drop policy if exists pipelines_write on public.pipelines;
create policy pipelines_write on public.pipelines for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

alter table public.pipeline_stages enable row level security;
drop policy if exists pipeline_stages_read on public.pipeline_stages;
create policy pipeline_stages_read on public.pipeline_stages for select to authenticated using (true);
drop policy if exists pipeline_stages_write on public.pipeline_stages;
create policy pipeline_stages_write on public.pipeline_stages for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

alter table public.deals enable row level security;
drop policy if exists deals_select on public.deals;
create policy deals_select on public.deals for select to authenticated
  using (deleted_at is null and public.row_visible(array[business_unit], location_id, owner_id, created_by));
drop policy if exists deals_insert on public.deals;
create policy deals_insert on public.deals for insert to authenticated
  with check (public.can_write());
drop policy if exists deals_update on public.deals;
create policy deals_update on public.deals for update to authenticated
  using (public.can_write() and public.row_visible(array[business_unit], location_id, owner_id, created_by))
  with check (public.can_write());
drop policy if exists deals_delete on public.deals;
create policy deals_delete on public.deals for delete to authenticated
  using (public.is_admin());

alter table public.activities enable row level security;
drop policy if exists activities_select on public.activities;
create policy activities_select on public.activities for select to authenticated
  using (public.row_visible(null, null, user_id, user_id));
drop policy if exists activities_insert on public.activities;
create policy activities_insert on public.activities for insert to authenticated
  with check (public.can_write());
drop policy if exists activities_update on public.activities;
create policy activities_update on public.activities for update to authenticated
  using (public.can_write() and public.row_visible(null, null, user_id, user_id))
  with check (public.can_write());
drop policy if exists activities_delete on public.activities;
create policy activities_delete on public.activities for delete to authenticated
  using (public.is_admin());

alter table public.tasks enable row level security;
drop policy if exists tasks_select on public.tasks;
create policy tasks_select on public.tasks for select to authenticated
  using (public.row_visible(null, null, assigned_to, created_by));
drop policy if exists tasks_insert on public.tasks;
create policy tasks_insert on public.tasks for insert to authenticated
  with check (public.can_write());
drop policy if exists tasks_update on public.tasks;
create policy tasks_update on public.tasks for update to authenticated
  using (public.can_write() and public.row_visible(null, null, assigned_to, created_by))
  with check (public.can_write());
drop policy if exists tasks_delete on public.tasks;
create policy tasks_delete on public.tasks for delete to authenticated
  using (public.is_admin());

-- ============================================================
-- Pipelines & stages seed (§5.3)
-- ============================================================
insert into public.pipelines (name, business_unit, is_default) values
  ('WiFi Pipeline', 'wifi', true),
  ('Services Pipeline', 'services', true),
  ('Refreshment Pipeline', 'refreshment', true)
on conflict (name, business_unit) do nothing;

insert into public.pipeline_stages (pipeline_id, name, sort_order, probability, is_won, is_lost)
select p.id, s.name, s.sort_order, s.probability, s.is_won, s.is_lost
from public.pipelines p
join (values
  ('wifi', 'New Lead',      1, 10,  false, false),
  ('wifi', 'Contacted',     2, 20,  false, false),
  ('wifi', 'Site Survey',   3, 35,  false, false),
  ('wifi', 'Quoted',        4, 50,  false, false),
  ('wifi', 'Negotiation',   5, 70,  false, false),
  ('wifi', 'Won',           6, 100, true,  false),
  ('wifi', 'Lost',          7, 0,   false, true)
) as s(unit, name, sort_order, probability, is_won, is_lost)
  on s.unit::business_unit = p.business_unit
where p.is_default
on conflict (pipeline_id, name) do nothing;

insert into public.pipeline_stages (pipeline_id, name, sort_order, probability, is_won, is_lost)
select p.id, s.name, s.sort_order, s.probability, s.is_won, s.is_lost
from public.pipelines p
join (values
  ('services', 'New Lead',        1, 10,  false, false),
  ('services', 'Requirements',    2, 25,  false, false),
  ('services', 'Proposal Sent',   3, 45,  false, false),
  ('services', 'Negotiation',     4, 65,  false, false),
  ('services', 'Contract Signed', 5, 85,  false, false),
  ('services', 'Won',             6, 100, true,  false),
  ('services', 'Lost',            7, 0,   false, true)
) as s(unit, name, sort_order, probability, is_won, is_lost)
  on s.unit::business_unit = p.business_unit
where p.is_default
on conflict (pipeline_id, name) do nothing;

-- Covering indexes for foreign keys the Supabase performance advisor flags
-- (created_by / uploaded_by columns and the cross-references off deals/tasks).
create index if not exists idx_activities_user on public.activities(user_id);
create index if not exists idx_customer_files_uploaded_by on public.customer_files(uploaded_by);
create index if not exists idx_customer_notes_created_by on public.customer_notes(created_by);
create index if not exists idx_customers_created_by on public.customers(created_by);
create index if not exists idx_deals_created_by on public.deals(created_by);
create index if not exists idx_deals_location on public.deals(location_id);
create index if not exists idx_deals_pipeline on public.deals(pipeline_id);
create index if not exists idx_tasks_created_by on public.tasks(created_by);
create index if not exists idx_tasks_customer on public.tasks(customer_id);

insert into public.pipeline_stages (pipeline_id, name, sort_order, probability, is_won, is_lost)
select p.id, s.name, s.sort_order, s.probability, s.is_won, s.is_lost
from public.pipelines p
join (values
  ('refreshment', 'Enquiry',                 1, 10,  false, false),
  ('refreshment', 'Menu/Package Discussed',  2, 30,  false, false),
  ('refreshment', 'Quoted',                  3, 50,  false, false),
  ('refreshment', 'Deposit Paid',            4, 80,  false, false),
  ('refreshment', 'Confirmed',               5, 100, true,  false),
  ('refreshment', 'Lost',                    6, 0,   false, true)
) as s(unit, name, sort_order, probability, is_won, is_lost)
  on s.unit::business_unit = p.business_unit
where p.is_default
on conflict (pipeline_id, name) do nothing;
