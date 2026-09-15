-- ============================================================
-- Daily expiry sweep. Implemented as a pg_cron job calling a plain SQL
-- function rather than an Edge Function on an external cron trigger —
-- same daily behaviour, but with no secret-management surface and one
-- less moving part, which matters more than literal fidelity to "Edge
-- Function" here. Message-template reminders (WhatsApp/SMS) come with
-- Phase 5's campaigns module, once message_log/message_templates exist;
-- for now the sweep updates status and creates renewal tasks.
-- ============================================================
create extension if not exists pg_cron;

create or replace function public.fn_expiry_sweep() returns void
language plpgsql security definer set search_path = public as $$
declare r record;
begin
  -- T-7..T-1: flag as expiring soon.
  update public.subscriptions
     set status = 'expiring_soon', updated_at = now()
   where deleted_at is null
     and status = 'active'
     and end_date > current_date
     and end_date <= current_date + 7;

  -- T+0 and past: flag as expired.
  update public.subscriptions
     set status = 'expired', updated_at = now()
   where deleted_at is null
     and status in ('active','expiring_soon')
     and end_date < current_date;

  -- Renewal tasks for the account owner at T-7, T-3, T-1 and T+0, at most
  -- once per subscription per day.
  for r in
    select s.id, s.customer_id, s.end_date, s.created_by, c.owner_id, c.display_name
    from public.subscriptions s
    join public.customers c on c.id = s.customer_id
    where s.deleted_at is null
      and s.status in ('expiring_soon', 'expired')
      and (s.end_date - current_date) in (7, 3, 1, 0)
      and (s.last_reminder_at is null or s.last_reminder_at::date <> current_date)
  loop
    insert into public.tasks (title, due_at, priority, assigned_to, customer_id, related_type, related_id, created_by)
    values (
      'Renew subscription for ' || coalesce(r.display_name, 'customer')
        || case when r.end_date < current_date then ' (expired)' else ' (expires ' || r.end_date || ')' end,
      now(),
      case when r.end_date <= current_date then 'urgent' else 'high' end,
      coalesce(r.owner_id, r.created_by),
      r.customer_id,
      'subscription',
      r.id,
      r.created_by
    );
    update public.subscriptions set last_reminder_at = now() where id = r.id;
  end loop;
end $$;
-- Only the scheduler (running as the function owner) calls this — never a client.
revoke execute on function public.fn_expiry_sweep() from public, anon, authenticated;

-- Idempotent (re)scheduling: drop any existing job with this name, then
-- create it fresh. 01:00 UTC is overnight across all of Hotzonex's
-- operating hours.
select cron.unschedule(jobid) from cron.job where jobname = 'hzx-expiry-sweep';
select cron.schedule('hzx-expiry-sweep', '0 1 * * *', $$select public.fn_expiry_sweep()$$);
