-- ============================================================
-- Phase 4 RPCs: milestone completion raises a draft invoice, a booking
-- deposit becomes a real payment, and a daily contract-renewal sweep
-- (30/14/7 days out) creates reminder tasks — same pg_cron pattern as
-- the Phase 2 subscription expiry sweep.
-- ============================================================

-- ---------- RPC: complete a milestone, raising a draft invoice ----------
create or replace function public.fn_complete_milestone(p_milestone_id uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_ms public.project_milestones; v_project public.projects; v_invoice_id uuid;
begin
  if not public.can_write() then raise exception 'Not authorised'; end if;

  select * into v_ms from public.project_milestones where id = p_milestone_id for update;
  if v_ms.id is null then raise exception 'Milestone not found'; end if;
  if v_ms.status = 'completed' then raise exception 'Milestone already completed'; end if;

  select * into v_project from public.projects where id = v_ms.project_id;

  update public.project_milestones
     set status = 'completed', completed_at = now()
   where id = p_milestone_id;

  if v_ms.amount > 0 then
    insert into public.invoices(invoice_number, customer_id, business_unit, currency, status,
                                 reference_type, reference_id, notes, created_by)
    values (public.next_code('invoice'), v_project.customer_id, 'services', v_project.currency, 'draft',
            'milestone', p_milestone_id, 'Milestone: ' || v_ms.title, auth.uid())
    returning id into v_invoice_id;

    insert into public.invoice_items(invoice_id, description, quantity, unit_price)
    values (v_invoice_id, v_ms.title, 1, v_ms.amount);

    update public.project_milestones set invoice_id = v_invoice_id where id = p_milestone_id;
  end if;

  return v_invoice_id;
end $$;
revoke execute on function public.fn_complete_milestone(uuid) from public, anon;
grant execute on function public.fn_complete_milestone(uuid) to authenticated;

-- ---------- RPC: record a booking deposit as a payment ----------
create or replace function public.fn_record_booking_deposit(
  p_booking_id uuid,
  p_amount     numeric default null,
  p_method     payment_method default 'cash'
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_booking public.bookings; v_amount numeric(14,2); v_payment_id uuid;
begin
  if not public.can_write() then raise exception 'Not authorised'; end if;
  select * into v_booking from public.bookings where id = p_booking_id for update;
  if v_booking.id is null then raise exception 'Booking not found'; end if;

  v_amount := coalesce(p_amount, v_booking.deposit);
  if v_amount <= 0 then raise exception 'Deposit amount must be positive'; end if;

  insert into public.payments(payment_number, customer_id, amount, currency, method, received_by, notes)
  values (public.next_code('payment'), v_booking.customer_id, v_amount, v_booking.currency, p_method,
          auth.uid(), 'Deposit for booking ' || v_booking.booking_code)
  returning id into v_payment_id;

  return v_payment_id;
end $$;
revoke execute on function public.fn_record_booking_deposit(uuid, numeric, payment_method) from public, anon;
grant execute on function public.fn_record_booking_deposit(uuid, numeric, payment_method) to authenticated;

-- ---------- scheduled: contract renewal reminders ----------
create or replace function public.fn_contract_renewal_sweep() returns void
language plpgsql security definer set search_path = public as $$
declare r record;
begin
  for r in
    select ct.id, ct.title, ct.renewal_date, ct.customer_id, ct.created_by, c.owner_id, c.display_name
    from public.contracts ct
    join public.customers c on c.id = ct.customer_id
    where ct.is_active = true
      and ct.auto_renew = true
      and ct.renewal_date is not null
      and (ct.renewal_date - current_date) in (30, 14, 7)
      and (ct.last_reminder_at is null or ct.last_reminder_at::date <> current_date)
  loop
    insert into public.tasks (title, due_at, priority, assigned_to, customer_id, related_type, related_id, created_by)
    values (
      'Contract renewal: ' || r.title || ' (' || coalesce(r.display_name, 'customer') || ')',
      now(),
      case when (r.renewal_date - current_date) <= 7 then 'high' else 'normal' end,
      coalesce(r.owner_id, r.created_by),
      r.customer_id,
      'contract',
      r.id,
      r.created_by
    );
    update public.contracts set last_reminder_at = now() where id = r.id;
  end loop;
end $$;
revoke execute on function public.fn_contract_renewal_sweep() from public, anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname = 'hzx-contract-renewal-sweep';
select cron.schedule('hzx-contract-renewal-sweep', '0 2 * * *', $$select public.fn_contract_renewal_sweep()$$);
