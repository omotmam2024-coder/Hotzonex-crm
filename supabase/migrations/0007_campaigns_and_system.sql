-- ============================================================
-- Phase 5: campaigns & messaging. Audience filters are stored as jsonb
-- and re-evaluated at send time (never frozen into a recipient list) —
-- the frontend re-runs the same filter against `customers` both for the
-- preview count and for building the work queue.
-- ============================================================

create table if not exists public.message_templates (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  channel    message_channel not null default 'whatsapp',
  language   text not null default 'en',
  body       text not null,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.campaigns (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  business_unit business_unit not null default 'wifi',
  channel       message_channel not null default 'whatsapp',
  template_id   uuid references public.message_templates(id),
  audience_filter jsonb not null default '{}'::jsonb,
  scheduled_at  timestamptz,
  status        campaign_status not null default 'draft',
  budget        numeric(14,2) not null default 0,
  currency      currency_code not null default 'SSP',
  created_by    uuid references public.profiles(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_campaigns_created_by on public.campaigns(created_by);
create index if not exists idx_campaigns_template on public.campaigns(template_id);

create table if not exists public.message_log (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete set null,
  campaign_id uuid references public.campaigns(id) on delete set null,
  template_id uuid references public.message_templates(id),
  channel     message_channel not null default 'whatsapp',
  to_number   text,
  body        text not null,
  status      message_status not null default 'queued',
  provider_ref text,
  error       text,
  sent_by     uuid references public.profiles(id),
  sent_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists idx_message_log_customer on public.message_log(customer_id, created_at desc);
create index if not exists idx_message_log_campaign on public.message_log(campaign_id, status);
create index if not exists idx_message_log_template on public.message_log(template_id);
create index if not exists idx_message_log_sent_by on public.message_log(sent_by);

create table if not exists public.saved_views (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  entity     text not null,
  name       text not null,
  filters    jsonb not null default '{}'::jsonb,
  is_shared  boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, entity, name)
);

-- ============================================================
-- updated_at triggers
-- ============================================================
drop trigger if exists trg_message_templates_updated on public.message_templates;
create trigger trg_message_templates_updated before update on public.message_templates
  for each row execute function public.set_updated_at();

drop trigger if exists trg_campaigns_updated on public.campaigns;
create trigger trg_campaigns_updated before update on public.campaigns
  for each row execute function public.set_updated_at();

-- ============================================================
-- Row Level Security
-- ============================================================
-- message_templates: reference data (§7.9's special case), same as
-- service_plans/locations — readable by all signed-in staff, admin-write.
alter table public.message_templates enable row level security;
drop policy if exists message_templates_read on public.message_templates;
create policy message_templates_read on public.message_templates for select to authenticated using (true);
drop policy if exists message_templates_write on public.message_templates;
create policy message_templates_write on public.message_templates for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

alter table public.campaigns enable row level security;
drop policy if exists campaigns_select on public.campaigns;
create policy campaigns_select on public.campaigns for select to authenticated
  using (public.row_visible(array[business_unit], null, null, created_by));
drop policy if exists campaigns_insert on public.campaigns;
create policy campaigns_insert on public.campaigns for insert to authenticated
  with check (public.can_write());
drop policy if exists campaigns_update on public.campaigns;
create policy campaigns_update on public.campaigns for update to authenticated
  using (public.can_write() and public.row_visible(array[business_unit], null, null, created_by))
  with check (public.can_write());
drop policy if exists campaigns_delete on public.campaigns;
create policy campaigns_delete on public.campaigns for delete to authenticated
  using (public.is_admin());

-- message_log: a per-customer activity log, same visibility shape as
-- `activities` (§7.9: null units, null location, owner = creator = the
-- staff member who sent it).
alter table public.message_log enable row level security;
drop policy if exists message_log_select on public.message_log;
create policy message_log_select on public.message_log for select to authenticated
  using (public.row_visible(null, null, sent_by, sent_by));
drop policy if exists message_log_insert on public.message_log;
create policy message_log_insert on public.message_log for insert to authenticated
  with check (public.can_write());
drop policy if exists message_log_delete on public.message_log;
create policy message_log_delete on public.message_log for delete to authenticated
  using (public.is_admin());

-- saved_views: personal filters, optionally shared read-only with the team.
alter table public.saved_views enable row level security;
drop policy if exists saved_views_select on public.saved_views;
create policy saved_views_select on public.saved_views for select to authenticated
  using (user_id = (select auth.uid()) or is_shared = true);
drop policy if exists saved_views_write on public.saved_views;
create policy saved_views_write on public.saved_views for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
