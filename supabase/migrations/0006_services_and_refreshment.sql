-- ============================================================
-- Phase 4: Services unit (projects, milestones, retainers) and the
-- Refreshment Centre (suppliers, supplier orders, event bookings).
-- ============================================================

create table if not exists public.projects (
  id           uuid primary key default gen_random_uuid(),
  project_code text unique,
  customer_id  uuid not null references public.customers(id) on delete cascade,
  deal_id      uuid references public.deals(id) on delete set null,
  name         text not null,
  project_type text not null default 'website',
  status       project_status not null default 'discovery',
  start_date   date,
  due_date     date,
  budget       numeric(14,2) not null default 0,
  currency     currency_code not null default 'SSP',
  progress_pct int not null default 0 check (progress_pct between 0 and 100),
  owner_id     uuid references public.profiles(id),
  description  text,
  created_by   uuid references public.profiles(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);
create index if not exists idx_projects_customer on public.projects(customer_id);
create index if not exists idx_projects_deal on public.projects(deal_id);
create index if not exists idx_projects_owner on public.projects(owner_id, status) where deleted_at is null;
create index if not exists idx_projects_created_by on public.projects(created_by);

create table if not exists public.project_milestones (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  title       text not null,
  due_date    date,
  amount      numeric(14,2) not null default 0,
  status      milestone_status not null default 'pending',
  invoice_id  uuid references public.invoices(id) on delete set null,
  sort_order  int not null default 0,
  completed_at timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists idx_project_milestones_project on public.project_milestones(project_id, sort_order);
create index if not exists idx_project_milestones_invoice on public.project_milestones(invoice_id);

create table if not exists public.contracts (
  id             uuid primary key default gen_random_uuid(),
  contract_code  text unique,
  customer_id    uuid not null references public.customers(id) on delete cascade,
  business_unit  business_unit not null default 'services',
  title          text not null,
  monthly_amount numeric(14,2) not null default 0,
  currency       currency_code not null default 'SSP',
  start_date     date not null,
  end_date       date,
  renewal_date   date,
  auto_renew     boolean not null default true,
  is_active      boolean not null default true,
  document_path  text,
  notes          text,
  -- Dedups renewal-reminder tasks the same way subscriptions.last_reminder_at
  -- does for the expiry sweep — not in the spec's literal column list, added
  -- so the daily renewal sweep can't fire the same reminder twice.
  last_reminder_at timestamptz,
  created_by     uuid references public.profiles(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists idx_contracts_customer on public.contracts(customer_id);
create index if not exists idx_contracts_renewal on public.contracts(renewal_date) where is_active = true;
create index if not exists idx_contracts_created_by on public.contracts(created_by);

create table if not exists public.suppliers (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  category      text not null default 'beverages',
  phone         text,
  email         text,
  address       text,
  payment_terms text,
  is_active     boolean not null default true,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.supplier_orders (
  id            uuid primary key default gen_random_uuid(),
  order_code    text unique,
  supplier_id   uuid not null references public.suppliers(id) on delete cascade,
  order_date    date not null default current_date,
  expected_date date,
  received_date date,
  status        supplier_order_status not null default 'ordered',
  items         jsonb not null default '[]'::jsonb,
  total         numeric(14,2) not null default 0,
  currency      currency_code not null default 'SSP',
  amount_paid   numeric(14,2) not null default 0,
  notes         text,
  created_by    uuid references public.profiles(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_supplier_orders_supplier on public.supplier_orders(supplier_id, order_date desc);
create index if not exists idx_supplier_orders_created_by on public.supplier_orders(created_by);

create table if not exists public.bookings (
  id           uuid primary key default gen_random_uuid(),
  booking_code text unique,
  customer_id  uuid not null references public.customers(id) on delete cascade,
  event_date   date not null,
  start_time   time,
  end_time     time,
  event_type   text not null default 'private',
  guests_count int not null default 0,
  package      text,
  total        numeric(14,2) not null default 0,
  deposit      numeric(14,2) not null default 0,
  currency     currency_code not null default 'SSP',
  status       booking_status not null default 'enquiry',
  host_id      uuid references public.profiles(id),
  requirements text,
  created_by   uuid references public.profiles(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);
create index if not exists idx_bookings_date on public.bookings(event_date, status);
create index if not exists idx_bookings_customer on public.bookings(customer_id);
create index if not exists idx_bookings_host on public.bookings(host_id);
create index if not exists idx_bookings_created_by on public.bookings(created_by);

-- ============================================================
-- Code generation
-- ============================================================
create or replace function public.fn_project_code() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.project_code is null then
    new.project_code := public.next_code('project');
  end if;
  return new;
end $$;
revoke execute on function public.fn_project_code() from public, anon, authenticated;
drop trigger if exists trg_project_code on public.projects;
create trigger trg_project_code before insert on public.projects
  for each row execute function public.fn_project_code();

create or replace function public.fn_contract_code() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.contract_code is null then
    new.contract_code := public.next_code('contract');
  end if;
  return new;
end $$;
revoke execute on function public.fn_contract_code() from public, anon, authenticated;
drop trigger if exists trg_contract_code on public.contracts;
create trigger trg_contract_code before insert on public.contracts
  for each row execute function public.fn_contract_code();

create or replace function public.fn_supplier_order_code() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.order_code is null then
    new.order_code := public.next_code('supplier_order');
  end if;
  return new;
end $$;
revoke execute on function public.fn_supplier_order_code() from public, anon, authenticated;
drop trigger if exists trg_supplier_order_code on public.supplier_orders;
create trigger trg_supplier_order_code before insert on public.supplier_orders
  for each row execute function public.fn_supplier_order_code();

create or replace function public.fn_booking_code() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.booking_code is null then
    new.booking_code := public.next_code('booking');
  end if;
  return new;
end $$;
revoke execute on function public.fn_booking_code() from public, anon, authenticated;
drop trigger if exists trg_booking_code on public.bookings;
create trigger trg_booking_code before insert on public.bookings
  for each row execute function public.fn_booking_code();

-- ============================================================
-- updated_at triggers
-- ============================================================
drop trigger if exists trg_projects_updated on public.projects;
create trigger trg_projects_updated before update on public.projects
  for each row execute function public.set_updated_at();

drop trigger if exists trg_contracts_updated on public.contracts;
create trigger trg_contracts_updated before update on public.contracts
  for each row execute function public.set_updated_at();

drop trigger if exists trg_suppliers_updated on public.suppliers;
create trigger trg_suppliers_updated before update on public.suppliers
  for each row execute function public.set_updated_at();

drop trigger if exists trg_supplier_orders_updated on public.supplier_orders;
create trigger trg_supplier_orders_updated before update on public.supplier_orders
  for each row execute function public.set_updated_at();

drop trigger if exists trg_bookings_updated on public.bookings;
create trigger trg_bookings_updated before update on public.bookings
  for each row execute function public.set_updated_at();

-- ============================================================
-- Row Level Security
-- ============================================================
-- projects: no business_unit column (the whole table belongs to the
-- Services unit) — same fixed-literal pattern used for installations.
alter table public.projects enable row level security;
drop policy if exists projects_select on public.projects;
create policy projects_select on public.projects for select to authenticated
  using (deleted_at is null and public.row_visible(array['services']::business_unit[], null, owner_id, created_by));
drop policy if exists projects_insert on public.projects;
create policy projects_insert on public.projects for insert to authenticated
  with check (public.can_write());
drop policy if exists projects_update on public.projects;
create policy projects_update on public.projects for update to authenticated
  using (public.can_write() and public.row_visible(array['services']::business_unit[], null, owner_id, created_by))
  with check (public.can_write());
drop policy if exists projects_delete on public.projects;
create policy projects_delete on public.projects for delete to authenticated
  using (public.is_admin());

alter table public.project_milestones enable row level security;
drop policy if exists project_milestones_select on public.project_milestones;
create policy project_milestones_select on public.project_milestones for select to authenticated
  using (exists (
    select 1 from public.projects p
    where p.id = project_milestones.project_id and p.deleted_at is null
      and public.row_visible(array['services']::business_unit[], null, p.owner_id, p.created_by)
  ));
drop policy if exists project_milestones_write on public.project_milestones;
create policy project_milestones_write on public.project_milestones for all to authenticated
  using (public.can_write() and exists (
    select 1 from public.projects p
    where p.id = project_milestones.project_id and p.deleted_at is null
      and public.row_visible(array['services']::business_unit[], null, p.owner_id, p.created_by)
  ))
  with check (public.can_write());

alter table public.contracts enable row level security;
drop policy if exists contracts_select on public.contracts;
create policy contracts_select on public.contracts for select to authenticated
  using (public.row_visible(array[business_unit], null, null, created_by));
drop policy if exists contracts_insert on public.contracts;
create policy contracts_insert on public.contracts for insert to authenticated
  with check (public.can_write());
drop policy if exists contracts_update on public.contracts;
create policy contracts_update on public.contracts for update to authenticated
  using (public.can_write() and public.row_visible(array[business_unit], null, null, created_by))
  with check (public.can_write());
drop policy if exists contracts_delete on public.contracts;
create policy contracts_delete on public.contracts for delete to authenticated
  using (public.is_admin());

-- suppliers: an admin-managed catalogue like service_plans — no owner or
-- business_unit column in the spec's schema for it, so it follows the
-- "reference data" special case (§7.9) rather than row_visible.
alter table public.suppliers enable row level security;
drop policy if exists suppliers_read on public.suppliers;
create policy suppliers_read on public.suppliers for select to authenticated using (true);
drop policy if exists suppliers_write on public.suppliers;
create policy suppliers_write on public.suppliers for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

alter table public.supplier_orders enable row level security;
drop policy if exists supplier_orders_select on public.supplier_orders;
create policy supplier_orders_select on public.supplier_orders for select to authenticated
  using (public.row_visible(array['refreshment']::business_unit[], null, null, created_by));
drop policy if exists supplier_orders_insert on public.supplier_orders;
create policy supplier_orders_insert on public.supplier_orders for insert to authenticated
  with check (public.can_write());
drop policy if exists supplier_orders_update on public.supplier_orders;
create policy supplier_orders_update on public.supplier_orders for update to authenticated
  using (public.can_write() and public.row_visible(array['refreshment']::business_unit[], null, null, created_by))
  with check (public.can_write());
drop policy if exists supplier_orders_delete on public.supplier_orders;
create policy supplier_orders_delete on public.supplier_orders for delete to authenticated
  using (public.is_admin());

alter table public.bookings enable row level security;
drop policy if exists bookings_select on public.bookings;
create policy bookings_select on public.bookings for select to authenticated
  using (deleted_at is null and public.row_visible(array['refreshment']::business_unit[], null, host_id, created_by));
drop policy if exists bookings_insert on public.bookings;
create policy bookings_insert on public.bookings for insert to authenticated
  with check (public.can_write());
drop policy if exists bookings_update on public.bookings;
create policy bookings_update on public.bookings for update to authenticated
  using (public.can_write() and public.row_visible(array['refreshment']::business_unit[], null, host_id, created_by))
  with check (public.can_write());
drop policy if exists bookings_delete on public.bookings;
create policy bookings_delete on public.bookings for delete to authenticated
  using (public.is_admin());
