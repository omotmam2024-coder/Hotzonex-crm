-- ============================================================
-- Hotspot vouchers are routinely sold to walk-ins with no captured
-- identity ("optional but encouraged" customer attachment per the
-- voucher-sale spec). payments.customer_id was originally NOT NULL
-- (mirroring the eventual Phase 3 billing schema, where every payment
-- ties to an invoiced customer); loosen it here so an anonymous cash
-- sale doesn't force a fake customer record into existence.
-- ============================================================
alter table public.payments alter column customer_id drop not null;

-- Postgres requires defaulted parameters to trail the required ones, so
-- p_customer_id moves after p_price (a genuine signature change, not just
-- a body edit — drop the old overload first so it doesn't linger).
drop function if exists public.fn_sell_voucher(text, uuid, numeric, payment_method, uuid);

create or replace function public.fn_sell_voucher(
  p_code        text,
  p_price       numeric,
  p_customer_id uuid default null,
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

  if p_customer_id is not null then
    insert into public.activities(customer_id, type, direction, subject, body, user_id)
    values (p_customer_id, 'system', 'internal', 'Voucher sold',
            'Voucher ' || v_voucher.code || ' sold for ' || p_price::text, auth.uid());
  end if;

  return jsonb_build_object('voucher_id', v_voucher.id, 'payment_id', v_payment_id, 'payment_number', v_payment_no);
end $$;
revoke execute on function public.fn_sell_voucher(text, numeric, uuid, payment_method, uuid) from public, anon;
grant execute on function public.fn_sell_voucher(text, numeric, uuid, payment_method, uuid) to authenticated;
