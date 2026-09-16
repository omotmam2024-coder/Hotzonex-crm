-- ============================================================
-- Phase 3 RPCs + views: record a payment across multiple invoices,
-- ticket resolve/reopen with SLA-aware timers, balance/aging views,
-- and the fn_renew_subscription upgrade to raise a real invoice now
-- that `invoices` exists.
-- ============================================================

-- ---------- RPC: record a payment against one or more invoices ----------
create or replace function public.fn_record_payment(
  p_customer_id uuid,
  p_amount      numeric,
  p_method      payment_method,
  p_allocations jsonb default '[]'::jsonb,  -- [{"invoice_id":"...","amount":123.00}]
  p_reference   text default null,
  p_location_id uuid default null,
  p_notes       text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_payment_id uuid; v_alloc jsonb; v_sum numeric(14,2) := 0;
begin
  if not public.can_write() then raise exception 'Not authorised'; end if;
  if p_amount <= 0 then raise exception 'Amount must be positive'; end if;

  insert into public.payments(payment_number, customer_id, amount, method, reference, location_id, received_by, notes)
  values (public.next_code('payment'), p_customer_id, p_amount, p_method, p_reference, p_location_id, auth.uid(), p_notes)
  returning id into v_payment_id;

  for v_alloc in select * from jsonb_array_elements(p_allocations) loop
    v_sum := v_sum + (v_alloc->>'amount')::numeric;
    insert into public.payment_allocations(payment_id, invoice_id, amount)
    values (v_payment_id, (v_alloc->>'invoice_id')::uuid, (v_alloc->>'amount')::numeric);
    perform public.fn_recalc_invoice((v_alloc->>'invoice_id')::uuid);
  end loop;

  if v_sum > p_amount then
    raise exception 'Allocated % exceeds payment amount %', v_sum, p_amount;
  end if;

  return v_payment_id;
end $$;
revoke execute on function public.fn_record_payment(uuid, numeric, payment_method, jsonb, text, uuid, text) from public, anon;
grant execute on function public.fn_record_payment(uuid, numeric, payment_method, jsonb, text, uuid, text) to authenticated;

-- ---------- RPC: resolve a ticket ----------
create or replace function public.fn_resolve_ticket(
  p_ticket_id uuid,
  p_category  text,
  p_note      text
) returns void
language plpgsql security definer set search_path = public as $$
declare v_ticket public.tickets;
begin
  if not public.can_write() then raise exception 'Not authorised'; end if;
  if p_note is null or length(trim(p_note)) = 0 then
    raise exception 'A resolution note is required';
  end if;

  select * into v_ticket from public.tickets where id = p_ticket_id for update;
  if v_ticket.id is null then raise exception 'Ticket not found'; end if;

  update public.tickets
     set status = 'resolved',
         resolution_category = p_category,
         resolution = p_note,
         resolved_at = now(),
         first_response_at = coalesce(first_response_at, now()),
         updated_at = now()
   where id = p_ticket_id;
end $$;
revoke execute on function public.fn_resolve_ticket(uuid, text, text) from public, anon;
grant execute on function public.fn_resolve_ticket(uuid, text, text) to authenticated;

-- ---------- RPC: reopen a resolved/closed ticket ----------
-- Restarts the resolution timer (fresh sla_resolve_due from now) and
-- records the prior resolution interval in a system comment, so both the
-- original and the restarted interval stay on the ticket's timeline.
create or replace function public.fn_reopen_ticket(p_ticket_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare v_ticket public.tickets; v_sla jsonb; v_resolve_h numeric; v_prior_interval interval;
begin
  if not public.can_write() then raise exception 'Not authorised'; end if;
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'A reopen reason is required';
  end if;

  select * into v_ticket from public.tickets where id = p_ticket_id for update;
  if v_ticket.id is null then raise exception 'Ticket not found'; end if;
  if v_ticket.status not in ('resolved','closed') then
    raise exception 'Only a resolved or closed ticket can be reopened';
  end if;

  v_prior_interval := coalesce(v_ticket.resolved_at, now()) - v_ticket.created_at;

  select value into v_sla from public.settings where key = 'sla';
  v_resolve_h := (v_sla -> v_ticket.priority::text ->> 'resolve_h')::numeric;

  update public.tickets
     set status = 'open',
         resolved_at = null,
         closed_at = null,
         resolution_category = null,
         resolution = null,
         sla_resolve_due = now() + (coalesce(v_resolve_h, 48) || ' hours')::interval,
         updated_at = now()
   where id = p_ticket_id;

  insert into public.ticket_comments(ticket_id, user_id, body, is_internal)
  values (p_ticket_id, auth.uid(),
          'Ticket reopened — ' || p_reason || '. First resolution took ' ||
          round(extract(epoch from v_prior_interval) / 3600, 1) ||
          ' hour(s); resolution timer restarted.',
          true);
end $$;
revoke execute on function public.fn_reopen_ticket(uuid, text) from public, anon;
grant execute on function public.fn_reopen_ticket(uuid, text) to authenticated;

-- ---------- trigger: first response timestamp ----------
-- Any comment (internal or customer-facing) counts as the first response;
-- computed from stored timestamps so it can't drift with client clocks.
create or replace function public.fn_ticket_first_response() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.tickets
     set first_response_at = now()
   where id = new.ticket_id and first_response_at is null;
  return new;
end $$;
revoke execute on function public.fn_ticket_first_response() from public, anon, authenticated;

drop trigger if exists trg_ticket_first_response on public.ticket_comments;
create trigger trg_ticket_first_response after insert on public.ticket_comments
  for each row execute function public.fn_ticket_first_response();

-- ---------- RPC: renew a subscription (upgraded to raise a real invoice) ----------
-- Same signature as the Phase 2 version so existing call sites keep working.
-- Now always raises an invoice for the renewal, and (when an amount is due)
-- records a payment allocated against it, instead of a bare payments row.
create or replace function public.fn_renew_subscription(
  p_subscription_id uuid,
  p_months          int default 1,
  p_amount          numeric default null,
  p_method          payment_method default 'cash'
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_sub public.subscriptions;
  v_invoice_id uuid;
  v_invoice_total numeric(14,2);
  v_payment_id uuid;
  v_new_end date;
  v_amount numeric(14,2);
begin
  if not public.can_write() then raise exception 'Not authorised'; end if;
  select * into v_sub from public.subscriptions where id = p_subscription_id for update;
  if v_sub.id is null then raise exception 'Subscription not found'; end if;
  if p_months < 1 then raise exception 'Months must be at least 1'; end if;

  v_new_end := (greatest(v_sub.end_date, current_date) + (p_months || ' months')::interval)::date;
  v_amount := coalesce(p_amount, v_sub.monthly_fee * p_months);

  update public.subscriptions
     set end_date = v_new_end, status = 'active', updated_at = now()
   where id = p_subscription_id;

  insert into public.invoices(invoice_number, customer_id, business_unit, location_id, currency,
                               issue_date, due_date, reference_type, reference_id, status, created_by, notes)
  values (public.next_code('invoice'), v_sub.customer_id, 'wifi', v_sub.location_id, v_sub.currency,
          current_date, current_date, 'subscription', v_sub.id, 'sent', auth.uid(),
          'Renewal to ' || v_new_end::text)
  returning id into v_invoice_id;

  insert into public.invoice_items(invoice_id, plan_id, description, quantity, unit_price)
  values (v_invoice_id, v_sub.plan_id, 'Subscription renewal (' || p_months || ' month(s))',
          p_months, v_sub.monthly_fee);

  if v_amount > 0 then
    select total into v_invoice_total from public.invoices where id = v_invoice_id;

    insert into public.payments(payment_number, customer_id, amount, currency, method, location_id, received_by, notes)
    values (public.next_code('payment'), v_sub.customer_id, v_amount, v_sub.currency, p_method,
            v_sub.location_id, auth.uid(), 'Subscription renewal to ' || v_new_end::text)
    returning id into v_payment_id;

    insert into public.payment_allocations(payment_id, invoice_id, amount)
    values (v_payment_id, v_invoice_id, least(v_amount, v_invoice_total));

    perform public.fn_recalc_invoice(v_invoice_id);
  end if;

  insert into public.activities(customer_id, type, direction, subject, body, user_id)
  values (v_sub.customer_id, 'system', 'internal', 'Subscription renewed', 'Renewed to ' || v_new_end::text, auth.uid());

  return jsonb_build_object('subscription_id', p_subscription_id, 'new_end_date', v_new_end,
                             'invoice_id', v_invoice_id, 'payment_id', v_payment_id);
end $$;
revoke execute on function public.fn_renew_subscription(uuid, int, numeric, payment_method) from public, anon;
grant execute on function public.fn_renew_subscription(uuid, int, numeric, payment_method) to authenticated;

-- ---------- views ----------
-- security_invoker = on: the caller's own RLS still applies, so a
-- non-admin only ever sees balances/aging for invoices they can see.
create or replace view public.v_customer_balances with (security_invoker = on) as
select c.id as customer_id,
       coalesce(sum(i.total) filter (where i.status <> 'void' and i.deleted_at is null), 0) as invoiced,
       coalesce(sum(i.amount_paid) filter (where i.status <> 'void' and i.deleted_at is null), 0) as paid,
       coalesce(sum(i.total - i.amount_paid) filter (where i.status not in ('void','paid') and i.deleted_at is null), 0) as balance_due
from public.customers c
left join public.invoices i on i.customer_id = c.id
group by c.id;

create or replace view public.v_invoice_aging with (security_invoker = on) as
select i.id, i.invoice_number, i.customer_id, i.business_unit, i.total - i.amount_paid as outstanding,
       i.due_date,
       case
         when i.due_date >= current_date then 'current'
         when current_date - i.due_date <= 30 then '1-30'
         when current_date - i.due_date <= 60 then '31-60'
         when current_date - i.due_date <= 90 then '61-90'
         else '90+'
       end as bucket
from public.invoices i
where i.deleted_at is null and i.status not in ('void','paid','draft');

grant select on public.v_customer_balances to authenticated;
grant select on public.v_invoice_aging to authenticated;
