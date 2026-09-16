-- ============================================================
-- Phase 3: support desk (tickets) + billing (invoices, payment
-- allocations against the existing `payments` table).
-- ============================================================

create table if not exists public.ticket_categories (
  id               uuid primary key default gen_random_uuid(),
  name             text not null unique,
  business_unit    business_unit not null default 'wifi',
  default_priority priority_level not null default 'normal',
  is_active        boolean not null default true
);

create table if not exists public.tickets (
  id                 uuid primary key default gen_random_uuid(),
  ticket_number      text unique,
  customer_id        uuid references public.customers(id) on delete set null,
  subscription_id    uuid references public.subscriptions(id) on delete set null,
  business_unit      business_unit not null default 'wifi',
  category_id        uuid references public.ticket_categories(id),
  channel            ticket_channel not null default 'call',
  priority           priority_level not null default 'normal',
  status             ticket_status not null default 'new',
  subject            text not null,
  description        text,
  assigned_to        uuid references public.profiles(id),
  location_id        uuid references public.locations(id),
  sla_response_due   timestamptz,
  sla_resolve_due    timestamptz,
  first_response_at  timestamptz,
  resolved_at        timestamptz,
  closed_at          timestamptz,
  resolution_category text,
  resolution         text,
  satisfaction       int check (satisfaction between 1 and 5),
  created_by         uuid references public.profiles(id),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  deleted_at         timestamptz
);
create index if not exists idx_tickets_status on public.tickets(status, priority) where deleted_at is null;
create index if not exists idx_tickets_assignee on public.tickets(assigned_to, status);
create index if not exists idx_tickets_customer on public.tickets(customer_id, created_at desc);
create index if not exists idx_tickets_created_by on public.tickets(created_by);
create index if not exists idx_tickets_category on public.tickets(category_id);
create index if not exists idx_tickets_location on public.tickets(location_id);
create index if not exists idx_tickets_subscription on public.tickets(subscription_id);

create table if not exists public.ticket_comments (
  id          uuid primary key default gen_random_uuid(),
  ticket_id   uuid not null references public.tickets(id) on delete cascade,
  user_id     uuid references public.profiles(id),
  body        text not null,
  is_internal boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists idx_ticket_comments on public.ticket_comments(ticket_id, created_at);
create index if not exists idx_ticket_comments_user on public.ticket_comments(user_id);

create table if not exists public.invoices (
  id             uuid primary key default gen_random_uuid(),
  invoice_number text unique,
  customer_id    uuid not null references public.customers(id) on delete restrict,
  business_unit  business_unit not null default 'wifi',
  location_id    uuid references public.locations(id),
  issue_date     date not null default current_date,
  due_date       date not null default (current_date + 14),
  currency       currency_code not null default 'SSP',
  fx_rate_used   numeric(14,4),
  subtotal       numeric(14,2) not null default 0,
  discount       numeric(14,2) not null default 0,
  tax            numeric(14,2) not null default 0,
  total          numeric(14,2) not null default 0,
  amount_paid    numeric(14,2) not null default 0,
  status         invoice_status not null default 'draft',
  reference_type text,
  reference_id   uuid,
  notes          text,
  terms          text,
  created_by     uuid references public.profiles(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz
);
create index if not exists idx_invoices_customer on public.invoices(customer_id, issue_date desc);
create index if not exists idx_invoices_status   on public.invoices(status, due_date);
create index if not exists idx_invoices_created_by on public.invoices(created_by);
create index if not exists idx_invoices_location on public.invoices(location_id);

create table if not exists public.invoice_items (
  id          uuid primary key default gen_random_uuid(),
  invoice_id  uuid not null references public.invoices(id) on delete cascade,
  plan_id     uuid references public.service_plans(id),
  description text not null,
  quantity    numeric(12,2) not null default 1,
  unit_price  numeric(14,2) not null default 0,
  discount    numeric(14,2) not null default 0,
  line_total  numeric(14,2) not null default 0,
  sort_order  int not null default 0
);
create index if not exists idx_invoice_items on public.invoice_items(invoice_id);
create index if not exists idx_invoice_items_plan on public.invoice_items(plan_id);

-- payments already exists (migration 0004, customer_id nullable per 0004_3).
-- Only the allocation table is new here.
create table if not exists public.payment_allocations (
  id         uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  amount     numeric(14,2) not null check (amount > 0),
  created_at timestamptz not null default now(),
  unique (payment_id, invoice_id)
);
create index if not exists idx_payment_allocations_invoice on public.payment_allocations(invoice_id);

-- ============================================================
-- Code generation + SLA computation
-- ============================================================
-- Combines ticket_number generation with SLA due-date computation (from
-- settings.sla, keyed by priority) in one BEFORE INSERT trigger — both are
-- "fill in defaults the client didn't send" concerns for the same row, so a
-- second trigger function would just be overhead.
create or replace function public.fn_ticket_code() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_sla jsonb; v_response_h numeric; v_resolve_h numeric;
begin
  if new.ticket_number is null then
    new.ticket_number := public.next_code('ticket');
  end if;

  select value into v_sla from public.settings where key = 'sla';
  if v_sla is not null then
    v_response_h := (v_sla -> new.priority::text ->> 'response_h')::numeric;
    v_resolve_h  := (v_sla -> new.priority::text ->> 'resolve_h')::numeric;
    if new.sla_response_due is null and v_response_h is not null then
      new.sla_response_due := new.created_at + (v_response_h || ' hours')::interval;
    end if;
    if new.sla_resolve_due is null and v_resolve_h is not null then
      new.sla_resolve_due := new.created_at + (v_resolve_h || ' hours')::interval;
    end if;
  end if;

  return new;
end $$;
revoke execute on function public.fn_ticket_code() from public, anon, authenticated;
drop trigger if exists trg_ticket_code on public.tickets;
create trigger trg_ticket_code before insert on public.tickets
  for each row execute function public.fn_ticket_code();

create or replace function public.fn_invoice_code() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.invoice_number is null then
    new.invoice_number := public.next_code('invoice');
  end if;
  return new;
end $$;
revoke execute on function public.fn_invoice_code() from public, anon, authenticated;
drop trigger if exists trg_invoice_code on public.invoices;
create trigger trg_invoice_code before insert on public.invoices
  for each row execute function public.fn_invoice_code();

-- ============================================================
-- Invoice totals: line items keep their own line_total in sync, and
-- every insert/update/delete recalculates the parent invoice (subtotal,
-- total, amount_paid, status) from its items + allocations.
-- ============================================================
create or replace function public.fn_recalc_invoice(p_invoice_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_sub numeric(14,2); v_paid numeric(14,2); v_total numeric(14,2);
        v_disc numeric(14,2); v_tax numeric(14,2); v_due date; v_status invoice_status;
begin
  select coalesce(sum(line_total),0) into v_sub
    from public.invoice_items where invoice_id = p_invoice_id;
  select discount, tax, due_date, status into v_disc, v_tax, v_due, v_status
    from public.invoices where id = p_invoice_id;
  if v_status is null then
    return; -- invoice was deleted mid-transaction
  end if;
  v_total := greatest(v_sub - coalesce(v_disc,0) + coalesce(v_tax,0), 0);
  select coalesce(sum(amount),0) into v_paid
    from public.payment_allocations where invoice_id = p_invoice_id;

  update public.invoices
     set subtotal = v_sub,
         total = v_total,
         amount_paid = v_paid,
         status = case
           when status = 'void' then 'void'
           when status = 'draft' and v_paid = 0 then 'draft'
           when v_paid >= v_total and v_total > 0 then 'paid'
           when v_paid > 0 then 'partial'
           when v_due < current_date then 'overdue'
           else 'sent'
         end,
         updated_at = now()
   where id = p_invoice_id;
end $$;
revoke execute on function public.fn_recalc_invoice(uuid) from public, anon, authenticated;

create or replace function public.fn_invoice_item_touch() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op <> 'DELETE' then
    new.line_total := round((new.quantity * new.unit_price) - coalesce(new.discount,0), 2);
  end if;
  return coalesce(new, old);
end $$;
revoke execute on function public.fn_invoice_item_touch() from public, anon, authenticated;

create or replace function public.fn_invoice_item_after() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.fn_recalc_invoice(coalesce(new.invoice_id, old.invoice_id));
  return coalesce(new, old);
end $$;
revoke execute on function public.fn_invoice_item_after() from public, anon, authenticated;

drop trigger if exists trg_invoice_item_before on public.invoice_items;
create trigger trg_invoice_item_before before insert or update on public.invoice_items
  for each row execute function public.fn_invoice_item_touch();

drop trigger if exists trg_invoice_item_after on public.invoice_items;
create trigger trg_invoice_item_after after insert or update or delete on public.invoice_items
  for each row execute function public.fn_invoice_item_after();

-- ============================================================
-- updated_at / audit triggers
-- ============================================================
drop trigger if exists trg_tickets_updated on public.tickets;
create trigger trg_tickets_updated before update on public.tickets
  for each row execute function public.set_updated_at();

drop trigger if exists trg_invoices_updated on public.invoices;
create trigger trg_invoices_updated before update on public.invoices
  for each row execute function public.set_updated_at();

-- Money-touching: invoices get fn_audit alongside customers/deals/vouchers/
-- subscriptions/payments/profiles (payment_allocations changes are already
-- traceable via the recalculated invoice + the audited payments row).
drop trigger if exists trg_invoices_audit on public.invoices;
create trigger trg_invoices_audit after insert or update or delete on public.invoices
  for each row execute function public.fn_audit();

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.ticket_categories enable row level security;
drop policy if exists ticket_categories_read on public.ticket_categories;
create policy ticket_categories_read on public.ticket_categories for select to authenticated using (true);
drop policy if exists ticket_categories_write on public.ticket_categories;
create policy ticket_categories_write on public.ticket_categories for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

alter table public.tickets enable row level security;
drop policy if exists tickets_select on public.tickets;
create policy tickets_select on public.tickets for select to authenticated
  using (deleted_at is null and public.row_visible(array[business_unit], location_id, assigned_to, created_by));
drop policy if exists tickets_insert on public.tickets;
create policy tickets_insert on public.tickets for insert to authenticated
  with check (public.can_write());
drop policy if exists tickets_update on public.tickets;
create policy tickets_update on public.tickets for update to authenticated
  using (public.can_write() and public.row_visible(array[business_unit], location_id, assigned_to, created_by))
  with check (public.can_write());
drop policy if exists tickets_delete on public.tickets;
create policy tickets_delete on public.tickets for delete to authenticated
  using (public.is_admin());

alter table public.ticket_comments enable row level security;
drop policy if exists ticket_comments_select on public.ticket_comments;
create policy ticket_comments_select on public.ticket_comments for select to authenticated
  using (exists (
    select 1 from public.tickets t
    where t.id = ticket_comments.ticket_id and t.deleted_at is null
      and public.row_visible(array[t.business_unit], t.location_id, t.assigned_to, t.created_by)
  ));
drop policy if exists ticket_comments_write on public.ticket_comments;
create policy ticket_comments_write on public.ticket_comments for all to authenticated
  using (public.can_write() and exists (
    select 1 from public.tickets t
    where t.id = ticket_comments.ticket_id and t.deleted_at is null
      and public.row_visible(array[t.business_unit], t.location_id, t.assigned_to, t.created_by)
  ))
  with check (public.can_write());

alter table public.invoices enable row level security;
drop policy if exists invoices_select on public.invoices;
create policy invoices_select on public.invoices for select to authenticated
  using (deleted_at is null and public.row_visible(array[business_unit], location_id, null, created_by));
drop policy if exists invoices_insert on public.invoices;
create policy invoices_insert on public.invoices for insert to authenticated
  with check (public.can_write());
drop policy if exists invoices_update on public.invoices;
create policy invoices_update on public.invoices for update to authenticated
  using (public.can_write() and public.row_visible(array[business_unit], location_id, null, created_by))
  with check (public.can_write());
drop policy if exists invoices_delete on public.invoices;
create policy invoices_delete on public.invoices for delete to authenticated
  using (public.is_admin());

alter table public.invoice_items enable row level security;
drop policy if exists invoice_items_select on public.invoice_items;
create policy invoice_items_select on public.invoice_items for select to authenticated
  using (exists (
    select 1 from public.invoices i
    where i.id = invoice_items.invoice_id and i.deleted_at is null
      and public.row_visible(array[i.business_unit], i.location_id, null, i.created_by)
  ));
drop policy if exists invoice_items_write on public.invoice_items;
create policy invoice_items_write on public.invoice_items for all to authenticated
  using (public.can_write() and exists (
    select 1 from public.invoices i
    where i.id = invoice_items.invoice_id and i.deleted_at is null
      and public.row_visible(array[i.business_unit], i.location_id, null, i.created_by)
  ))
  with check (public.can_write());

alter table public.payment_allocations enable row level security;
drop policy if exists payment_allocations_select on public.payment_allocations;
create policy payment_allocations_select on public.payment_allocations for select to authenticated
  using (exists (
    select 1 from public.invoices i
    where i.id = payment_allocations.invoice_id and i.deleted_at is null
      and public.row_visible(array[i.business_unit], i.location_id, null, i.created_by)
  ));
drop policy if exists payment_allocations_write on public.payment_allocations;
create policy payment_allocations_write on public.payment_allocations for all to authenticated
  using (public.can_write() and exists (
    select 1 from public.invoices i
    where i.id = payment_allocations.invoice_id and i.deleted_at is null
      and public.row_visible(array[i.business_unit], i.location_id, null, i.created_by)
  ))
  with check (public.can_write());
