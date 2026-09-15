-- ============================================================
-- RPC: generate a voucher batch — server-side code generation
-- guarantees uniqueness in one transaction.
-- ============================================================
create or replace function public.fn_generate_voucher_batch(
  p_plan_id     uuid,
  p_location_id uuid,
  p_quantity    int,
  p_reseller_id uuid default null,
  p_notes       text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_batch_id uuid; v_code text; i int := 0;
begin
  if not public.can_write() then raise exception 'Not authorised'; end if;
  if p_quantity < 1 or p_quantity > 5000 then raise exception 'Quantity must be 1..5000'; end if;

  insert into public.voucher_batches(batch_code, plan_id, location_id, quantity, reseller_id, notes, generated_by)
  values (public.next_code('voucher_batch'), p_plan_id, p_location_id, p_quantity, p_reseller_id, p_notes, auth.uid())
  returning id into v_batch_id;

  while i < p_quantity loop
    v_code := upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 10));
    begin
      insert into public.vouchers(code, batch_id, plan_id, location_id, reseller_id, status)
      values (v_code, v_batch_id, p_plan_id, p_location_id, p_reseller_id,
              case when p_reseller_id is null then 'available' else 'allocated' end);
      i := i + 1;
    exception when unique_violation then
      -- Code collision: retry with a freshly generated code.
      null;
    end;
  end loop;

  return v_batch_id;
end $$;
revoke execute on function public.fn_generate_voucher_batch(uuid, uuid, int, uuid, text) from public, anon;
grant execute on function public.fn_generate_voucher_batch(uuid, uuid, int, uuid, text) to authenticated;

-- ============================================================
-- RPC: sell a voucher atomically — the row lock makes selling the
-- same code twice impossible even under concurrent requests.
-- ============================================================
create or replace function public.fn_sell_voucher(
  p_code        text,
  p_customer_id uuid,
  p_price       numeric,
  p_method      payment_method default 'cash',
  p_location_id uuid default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_voucher public.vouchers; v_payment_id uuid; v_payment_no text;
begin
  if not public.can_write() then raise exception 'Not authorised'; end if;

  select * into v_voucher from public.vouchers
   where code = upper(trim(p_code)) for update;

  if v_voucher.id is null then raise exception 'Voucher not found'; end if;
  if v_voucher.status not in ('available','allocated') then
    raise exception 'Voucher is % and cannot be sold', v_voucher.status;
  end if;

  update public.vouchers
     set status = 'sold', customer_id = p_customer_id, price_sold = p_price,
         sold_by = auth.uid(), sold_at = now(), updated_at = now()
   where id = v_voucher.id;

  v_payment_no := public.next_code('payment');
  insert into public.payments(payment_number, customer_id, amount, method, location_id, received_by, notes)
  values (v_payment_no, p_customer_id, p_price, p_method,
          coalesce(p_location_id, v_voucher.location_id), auth.uid(),
          'Voucher sale: ' || v_voucher.code)
  returning id into v_payment_id;

  insert into public.activities(customer_id, type, direction, subject, body, user_id)
  values (p_customer_id, 'system', 'internal', 'Voucher sold',
          'Voucher ' || v_voucher.code || ' sold for ' || p_price::text, auth.uid());

  return jsonb_build_object('voucher_id', v_voucher.id, 'payment_id', v_payment_id, 'payment_number', v_payment_no);
end $$;
revoke execute on function public.fn_sell_voucher(text, uuid, numeric, payment_method, uuid) from public, anon;
grant execute on function public.fn_sell_voucher(text, uuid, numeric, payment_method, uuid) to authenticated;

-- ============================================================
-- RPC: void a voucher — manager+ only, mandatory reason, audited
-- automatically via the vouchers table's fn_audit trigger.
-- ============================================================
create or replace function public.fn_void_voucher(p_voucher_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if public.auth_role() not in ('owner','admin','manager') then
    raise exception 'Only a manager or above can void a voucher';
  end if;
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'A void reason is required';
  end if;
  update public.vouchers set status = 'void', void_reason = p_reason, updated_at = now() where id = p_voucher_id;
  if not found then raise exception 'Voucher not found'; end if;
end $$;
revoke execute on function public.fn_void_voucher(uuid, text) from public, anon;
grant execute on function public.fn_void_voucher(uuid, text) to authenticated;

-- ============================================================
-- RPC: renew a subscription — extends end_date and records the
-- payment taken, in one transaction so they never drift apart.
-- (Raises a proper invoice once Phase 3 billing lands; for now the
-- payment stands alone, same as a voucher sale.)
-- ============================================================
create or replace function public.fn_renew_subscription(
  p_subscription_id uuid,
  p_months          int default 1,
  p_amount          numeric default null,
  p_method          payment_method default 'cash'
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_sub public.subscriptions; v_payment_id uuid; v_new_end date; v_amount numeric(14,2);
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

  if v_amount > 0 then
    insert into public.payments(customer_id, amount, currency, method, location_id, received_by, notes)
    values (v_sub.customer_id, v_amount, v_sub.currency, p_method, v_sub.location_id, auth.uid(),
            'Subscription renewal to ' || v_new_end::text)
    returning id into v_payment_id;
  end if;

  insert into public.activities(customer_id, type, direction, subject, body, user_id)
  values (v_sub.customer_id, 'system', 'internal', 'Subscription renewed', 'Renewed to ' || v_new_end::text, auth.uid());

  return jsonb_build_object('subscription_id', p_subscription_id, 'new_end_date', v_new_end, 'payment_id', v_payment_id);
end $$;
revoke execute on function public.fn_renew_subscription(uuid, int, numeric, payment_method) from public, anon;
grant execute on function public.fn_renew_subscription(uuid, int, numeric, payment_method) to authenticated;

-- ============================================================
-- RPC: suspend / resume a subscription, logged to the timeline.
-- ============================================================
create or replace function public.fn_suspend_subscription(p_subscription_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare v_customer_id uuid;
begin
  if not public.can_write() then raise exception 'Not authorised'; end if;
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'A suspend reason is required';
  end if;
  update public.subscriptions
     set status = 'suspended', suspend_reason = p_reason, updated_at = now()
   where id = p_subscription_id
  returning customer_id into v_customer_id;
  if v_customer_id is null then raise exception 'Subscription not found'; end if;
  insert into public.activities(customer_id, type, direction, subject, body, user_id)
  values (v_customer_id, 'system', 'internal', 'Subscription suspended', p_reason, auth.uid());
end $$;
revoke execute on function public.fn_suspend_subscription(uuid, text) from public, anon;
grant execute on function public.fn_suspend_subscription(uuid, text) to authenticated;

create or replace function public.fn_resume_subscription(p_subscription_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_customer_id uuid;
begin
  if not public.can_write() then raise exception 'Not authorised'; end if;
  update public.subscriptions
     set status = 'active', suspend_reason = null, updated_at = now()
   where id = p_subscription_id
  returning customer_id into v_customer_id;
  if v_customer_id is null then raise exception 'Subscription not found'; end if;
  insert into public.activities(customer_id, type, direction, subject, body, user_id)
  values (v_customer_id, 'system', 'internal', 'Subscription resumed', null, auth.uid());
end $$;
revoke execute on function public.fn_resume_subscription(uuid) from public, anon;
grant execute on function public.fn_resume_subscription(uuid) to authenticated;

-- ============================================================
-- View: voucher stock position by plan/location, used for the
-- reorder-level dashboard warning.
-- ============================================================
create or replace view public.v_voucher_stock with (security_invoker = on) as
select v.plan_id, p.name as plan_name, v.location_id, l.name as location_name,
       count(*) filter (where v.status = 'available') as available,
       count(*) filter (where v.status = 'allocated') as allocated,
       count(*) filter (where v.status = 'sold')      as sold,
       p.reorder_level
from public.vouchers v
join public.service_plans p on p.id = v.plan_id
left join public.locations l on l.id = v.location_id
group by v.plan_id, p.name, v.location_id, l.name, p.reorder_level;

create or replace view public.v_subscriptions_expiring with (security_invoker = on) as
select s.*, c.display_name, c.phone_primary, p.name as plan_name,
       (s.end_date - current_date) as days_left
from public.subscriptions s
join public.customers c on c.id = s.customer_id
join public.service_plans p on p.id = s.plan_id
where s.deleted_at is null
  and s.status in ('active','expiring_soon')
  and s.end_date <= current_date + 7;

grant select on public.v_voucher_stock to authenticated;
grant select on public.v_subscriptions_expiring to authenticated;
