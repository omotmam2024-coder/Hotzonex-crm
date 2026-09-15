-- ============================================================
-- Payments (pulled forward from the Phase 3 billing schema): both
-- voucher sales and subscription renewals need to record money taken
-- now. payment_allocations/invoices arrive with Phase 3 and link back
-- to these same rows — nothing here will need to change shape then.
-- ============================================================
create table if not exists public.payments (
  id             uuid primary key default gen_random_uuid(),
  payment_number text unique,
  customer_id    uuid not null references public.customers(id) on delete restrict,
  amount         numeric(14,2) not null check (amount > 0),
  currency       currency_code not null default 'SSP',
  fx_rate_used   numeric(14,4),
  method         payment_method not null default 'cash',
  reference      text,
  location_id    uuid references public.locations(id),
  received_by    uuid references public.profiles(id),
  received_at    timestamptz not null default now(),
  notes          text,
  created_at     timestamptz not null default now(),
  deleted_at     timestamptz
);
create index if not exists idx_payments_customer on public.payments(customer_id, received_at desc);
create index if not exists idx_payments_received_by on public.payments(received_by);
create index if not exists idx_payments_location on public.payments(location_id);

-- ============================================================
-- WiFi operations
-- ============================================================
create table if not exists public.service_plans (
  id             uuid primary key default gen_random_uuid(),
  business_unit  business_unit not null default 'wifi',
  name           text not null,
  code           text not null unique,
  description    text,
  price_ssp      numeric(14,2) not null default 0,
  price_usd      numeric(14,2),
  duration_hours int,
  duration_days  int,
  data_cap_mb    bigint,
  speed_mbps     numeric(6,2),
  device_limit   int not null default 1,
  reorder_level  int not null default 50,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table if not exists public.resellers (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  phone           text not null,
  customer_id     uuid references public.customers(id),
  location_id     uuid references public.locations(id),
  commission_rate numeric(5,2) not null default 0,
  is_active       boolean not null default true,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists public.voucher_batches (
  id           uuid primary key default gen_random_uuid(),
  batch_code   text unique,
  plan_id      uuid not null references public.service_plans(id),
  location_id  uuid references public.locations(id),
  quantity     int not null check (quantity > 0),
  reseller_id  uuid references public.resellers(id),
  notes        text,
  generated_by uuid references public.profiles(id),
  created_at   timestamptz not null default now()
);
create index if not exists idx_voucher_batches_plan on public.voucher_batches(plan_id);
create index if not exists idx_voucher_batches_location on public.voucher_batches(location_id);
create index if not exists idx_voucher_batches_reseller on public.voucher_batches(reseller_id);
create index if not exists idx_voucher_batches_generated_by on public.voucher_batches(generated_by);

create table if not exists public.vouchers (
  id           uuid primary key default gen_random_uuid(),
  code         text not null unique,
  batch_id     uuid references public.voucher_batches(id) on delete cascade,
  plan_id      uuid not null references public.service_plans(id),
  location_id  uuid references public.locations(id),
  status       voucher_status not null default 'available',
  reseller_id  uuid references public.resellers(id),
  customer_id  uuid references public.customers(id),
  price_sold   numeric(14,2),
  currency     currency_code not null default 'SSP',
  sold_by      uuid references public.profiles(id),
  sold_at      timestamptz,
  used_at      timestamptz,
  expires_at   timestamptz,
  void_reason  text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_vouchers_status on public.vouchers(status, plan_id, location_id);
create index if not exists idx_vouchers_sold   on public.vouchers(sold_at desc);
create index if not exists idx_vouchers_customer on public.vouchers(customer_id);
create index if not exists idx_vouchers_reseller on public.vouchers(reseller_id);
create index if not exists idx_vouchers_sold_by on public.vouchers(sold_by);

create table if not exists public.reseller_settlements (
  id          uuid primary key default gen_random_uuid(),
  reseller_id uuid not null references public.resellers(id) on delete cascade,
  period_start date not null,
  period_end   date not null,
  vouchers_sold int not null default 0,
  gross_amount numeric(14,2) not null default 0,
  commission   numeric(14,2) not null default 0,
  amount_paid  numeric(14,2) not null default 0,
  settled_at   timestamptz,
  created_by   uuid references public.profiles(id),
  created_at   timestamptz not null default now()
);
create index if not exists idx_settlements_reseller on public.reseller_settlements(reseller_id);
create index if not exists idx_settlements_created_by on public.reseller_settlements(created_by);

create table if not exists public.subscriptions (
  id               uuid primary key default gen_random_uuid(),
  subscription_code text unique,
  customer_id      uuid not null references public.customers(id) on delete cascade,
  plan_id          uuid not null references public.service_plans(id),
  location_id      uuid references public.locations(id),
  status           subscription_status not null default 'pending',
  start_date       date not null default current_date,
  end_date         date not null,
  monthly_fee      numeric(14,2) not null default 0,
  currency         currency_code not null default 'SSP',
  auto_renew       boolean not null default true,
  router_username  text,
  mac_address      text,
  static_ip        inet,
  suspend_reason   text,
  last_reminder_at timestamptz,
  created_by       uuid references public.profiles(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz,
  constraint subscriptions_dates check (end_date >= start_date)
);
create index if not exists idx_subs_customer on public.subscriptions(customer_id);
create index if not exists idx_subs_expiry   on public.subscriptions(end_date) where deleted_at is null;
create index if not exists idx_subs_plan on public.subscriptions(plan_id);
create index if not exists idx_subs_location on public.subscriptions(location_id);
create index if not exists idx_subs_created_by on public.subscriptions(created_by);

create table if not exists public.installations (
  id              uuid primary key default gen_random_uuid(),
  job_code        text unique,
  customer_id     uuid not null references public.customers(id) on delete cascade,
  deal_id         uuid references public.deals(id) on delete set null,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  job_type        text not null default 'home',
  status          installation_status not null default 'scheduled',
  scheduled_at    timestamptz,
  technician_id   uuid references public.profiles(id),
  location_id     uuid references public.locations(id),
  equipment       jsonb not null default '[]'::jsonb,
  install_fee     numeric(14,2) not null default 0,
  currency        currency_code not null default 'SSP',
  gps_lat         numeric(9,6),
  gps_lng         numeric(9,6),
  signature_path  text,
  photo_paths     text[] not null default '{}',
  notes           text,
  started_at      timestamptz,
  completed_at    timestamptz,
  created_by      uuid references public.profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists idx_installs_tech on public.installations(technician_id, scheduled_at);
create index if not exists idx_installs_customer on public.installations(customer_id);
create index if not exists idx_installs_deal on public.installations(deal_id);
create index if not exists idx_installs_subscription on public.installations(subscription_id);
create index if not exists idx_installs_location on public.installations(location_id);
create index if not exists idx_installs_created_by on public.installations(created_by);

-- Covering indexes for foreign keys the Supabase performance advisor flags.
create index if not exists idx_resellers_customer on public.resellers(customer_id);
create index if not exists idx_resellers_location on public.resellers(location_id);
create index if not exists idx_vouchers_batch on public.vouchers(batch_id);
create index if not exists idx_vouchers_location on public.vouchers(location_id);
create index if not exists idx_vouchers_plan on public.vouchers(plan_id);

-- ============================================================
-- Code-generation triggers
-- ============================================================
create or replace function public.fn_payment_code() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.payment_number is null then
    new.payment_number := public.next_code('payment');
  end if;
  return new;
end $$;
revoke execute on function public.fn_payment_code() from public, anon, authenticated;
drop trigger if exists trg_payment_code on public.payments;
create trigger trg_payment_code before insert on public.payments
  for each row execute function public.fn_payment_code();

create or replace function public.fn_voucher_batch_code() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.batch_code is null then
    new.batch_code := public.next_code('voucher_batch');
  end if;
  return new;
end $$;
revoke execute on function public.fn_voucher_batch_code() from public, anon, authenticated;
drop trigger if exists trg_voucher_batch_code on public.voucher_batches;
create trigger trg_voucher_batch_code before insert on public.voucher_batches
  for each row execute function public.fn_voucher_batch_code();

create or replace function public.fn_subscription_code() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.subscription_code is null then
    new.subscription_code := public.next_code('subscription');
  end if;
  return new;
end $$;
revoke execute on function public.fn_subscription_code() from public, anon, authenticated;
drop trigger if exists trg_subscription_code on public.subscriptions;
create trigger trg_subscription_code before insert on public.subscriptions
  for each row execute function public.fn_subscription_code();

create or replace function public.fn_installation_code() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.job_code is null then
    new.job_code := public.next_code('installation');
  end if;
  return new;
end $$;
revoke execute on function public.fn_installation_code() from public, anon, authenticated;
drop trigger if exists trg_installation_code on public.installations;
create trigger trg_installation_code before insert on public.installations
  for each row execute function public.fn_installation_code();

-- ============================================================
-- updated_at / audit triggers
-- ============================================================
drop trigger if exists trg_service_plans_updated on public.service_plans;
create trigger trg_service_plans_updated before update on public.service_plans
  for each row execute function public.set_updated_at();

drop trigger if exists trg_resellers_updated on public.resellers;
create trigger trg_resellers_updated before update on public.resellers
  for each row execute function public.set_updated_at();

drop trigger if exists trg_vouchers_updated on public.vouchers;
create trigger trg_vouchers_updated before update on public.vouchers
  for each row execute function public.set_updated_at();

drop trigger if exists trg_subscriptions_updated on public.subscriptions;
create trigger trg_subscriptions_updated before update on public.subscriptions
  for each row execute function public.set_updated_at();

drop trigger if exists trg_installations_updated on public.installations;
create trigger trg_installations_updated before update on public.installations
  for each row execute function public.set_updated_at();

-- Money- and voucher-touching tables are always audited.
drop trigger if exists trg_payments_audit on public.payments;
create trigger trg_payments_audit after insert or update or delete on public.payments
  for each row execute function public.fn_audit();

drop trigger if exists trg_vouchers_audit on public.vouchers;
create trigger trg_vouchers_audit after insert or update or delete on public.vouchers
  for each row execute function public.fn_audit();

drop trigger if exists trg_subscriptions_audit on public.subscriptions;
create trigger trg_subscriptions_audit after insert or update or delete on public.subscriptions
  for each row execute function public.fn_audit();

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.payments enable row level security;
drop policy if exists payments_select on public.payments;
create policy payments_select on public.payments for select to authenticated
  using (deleted_at is null and public.row_visible(null, location_id, null, received_by));
drop policy if exists payments_insert on public.payments;
create policy payments_insert on public.payments for insert to authenticated
  with check (public.can_write());
drop policy if exists payments_update on public.payments;
create policy payments_update on public.payments for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists payments_delete on public.payments;
create policy payments_delete on public.payments for delete to authenticated
  using (public.is_admin());

alter table public.service_plans enable row level security;
drop policy if exists service_plans_read on public.service_plans;
create policy service_plans_read on public.service_plans for select to authenticated using (true);
drop policy if exists service_plans_write on public.service_plans;
create policy service_plans_write on public.service_plans for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

alter table public.resellers enable row level security;
drop policy if exists resellers_read on public.resellers;
create policy resellers_read on public.resellers for select to authenticated using (true);
drop policy if exists resellers_write on public.resellers;
create policy resellers_write on public.resellers for all to authenticated
  using (public.can_write()) with check (public.can_write());

alter table public.voucher_batches enable row level security;
drop policy if exists voucher_batches_select on public.voucher_batches;
create policy voucher_batches_select on public.voucher_batches for select to authenticated
  using (public.row_visible(array['wifi']::business_unit[], location_id, null, generated_by));
drop policy if exists voucher_batches_insert on public.voucher_batches;
create policy voucher_batches_insert on public.voucher_batches for insert to authenticated
  with check (public.can_write());
drop policy if exists voucher_batches_delete on public.voucher_batches;
create policy voucher_batches_delete on public.voucher_batches for delete to authenticated
  using (public.is_admin());

alter table public.vouchers enable row level security;
drop policy if exists vouchers_select on public.vouchers;
create policy vouchers_select on public.vouchers for select to authenticated
  using (public.row_visible(array['wifi']::business_unit[], location_id, null, sold_by));
drop policy if exists vouchers_insert on public.vouchers;
create policy vouchers_insert on public.vouchers for insert to authenticated
  with check (public.can_write());
drop policy if exists vouchers_update on public.vouchers;
create policy vouchers_update on public.vouchers for update to authenticated
  using (public.can_write() and public.row_visible(array['wifi']::business_unit[], location_id, null, sold_by))
  with check (public.can_write());
drop policy if exists vouchers_delete on public.vouchers;
create policy vouchers_delete on public.vouchers for delete to authenticated
  using (public.is_admin());

alter table public.reseller_settlements enable row level security;
drop policy if exists settlements_select on public.reseller_settlements;
create policy settlements_select on public.reseller_settlements for select to authenticated
  using (public.auth_role() in ('owner','admin','manager'));
drop policy if exists settlements_write on public.reseller_settlements;
create policy settlements_write on public.reseller_settlements for all to authenticated
  using (public.auth_role() in ('owner','admin','manager'))
  with check (public.auth_role() in ('owner','admin','manager'));

alter table public.subscriptions enable row level security;
drop policy if exists subscriptions_select on public.subscriptions;
create policy subscriptions_select on public.subscriptions for select to authenticated
  using (deleted_at is null and public.row_visible(array['wifi']::business_unit[], location_id, null, created_by));
drop policy if exists subscriptions_insert on public.subscriptions;
create policy subscriptions_insert on public.subscriptions for insert to authenticated
  with check (public.can_write());
drop policy if exists subscriptions_update on public.subscriptions;
create policy subscriptions_update on public.subscriptions for update to authenticated
  using (public.can_write() and public.row_visible(array['wifi']::business_unit[], location_id, null, created_by))
  with check (public.can_write());
drop policy if exists subscriptions_delete on public.subscriptions;
create policy subscriptions_delete on public.subscriptions for delete to authenticated
  using (public.is_admin());

alter table public.installations enable row level security;
drop policy if exists installations_select on public.installations;
create policy installations_select on public.installations for select to authenticated
  using (public.row_visible(array['wifi']::business_unit[], location_id, technician_id, created_by));
drop policy if exists installations_insert on public.installations;
create policy installations_insert on public.installations for insert to authenticated
  with check (public.can_write());
drop policy if exists installations_update on public.installations;
create policy installations_update on public.installations for update to authenticated
  using (public.can_write() and public.row_visible(array['wifi']::business_unit[], location_id, technician_id, created_by))
  with check (public.can_write());
drop policy if exists installations_delete on public.installations;
create policy installations_delete on public.installations for delete to authenticated
  using (public.is_admin());
