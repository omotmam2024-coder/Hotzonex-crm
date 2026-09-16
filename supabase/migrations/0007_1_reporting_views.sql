-- ============================================================
-- Phase 5: reporting views for all nine §5.11 reports. Every view is
-- security_invoker = on, so a report only ever shows rows the viewer's
-- own RLS already lets them see — filters (date range, unit, location,
-- owner) are pushed down as real predicates on these views from the
-- frontend query, with final chart bucketing done client-side, the same
-- shape as the Phase 3 aging report.
-- ============================================================

-- 1. Revenue by unit / location / plan / month.
create or replace view public.v_report_revenue with (security_invoker = on) as
select
  ii.id,
  i.id as invoice_id,
  i.business_unit,
  i.location_id,
  l.name as location_name,
  ii.plan_id,
  sp.name as plan_name,
  i.issue_date,
  i.currency,
  ii.line_total,
  i.status as invoice_status
from public.invoice_items ii
join public.invoices i on i.id = ii.invoice_id
left join public.service_plans sp on sp.id = ii.plan_id
left join public.locations l on l.id = i.location_id
where i.deleted_at is null;

-- 2. Voucher sales (paired with the existing v_voucher_stock for position).
create or replace view public.v_report_voucher_sales with (security_invoker = on) as
select
  v.id,
  v.plan_id,
  sp.name as plan_name,
  v.location_id,
  l.name as location_name,
  v.sold_at,
  v.price_sold,
  v.currency,
  v.status
from public.vouchers v
join public.service_plans sp on sp.id = v.plan_id
left join public.locations l on l.id = v.location_id
where v.status in ('sold', 'used');

-- 3. Subscription churn, renewal rate, expiring pipeline.
create or replace view public.v_report_subscriptions with (security_invoker = on) as
select
  s.id,
  s.plan_id,
  sp.name as plan_name,
  s.location_id,
  l.name as location_name,
  s.status,
  s.start_date,
  s.end_date,
  s.monthly_fee,
  s.currency,
  s.auto_renew,
  s.created_at
from public.subscriptions s
join public.service_plans sp on sp.id = s.plan_id
left join public.locations l on l.id = s.location_id
where s.deleted_at is null;

-- 4. Ticket volume, first-response and resolution times, by category and agent.
create or replace view public.v_report_tickets with (security_invoker = on) as
select
  t.id,
  t.business_unit,
  t.category_id,
  tc.name as category_name,
  t.assigned_to,
  p.full_name as assignee_name,
  t.priority,
  t.status,
  t.created_at,
  t.first_response_at,
  t.resolved_at,
  extract(epoch from (t.first_response_at - t.created_at)) / 60 as response_minutes,
  extract(epoch from (t.resolved_at - t.created_at)) / 60 as resolve_minutes
from public.tickets t
left join public.ticket_categories tc on tc.id = t.category_id
left join public.profiles p on p.id = t.assigned_to
where t.deleted_at is null;

-- 5. Sales pipeline conversion by stage and source, win rate per agent.
create or replace view public.v_report_deals with (security_invoker = on) as
select
  d.id,
  d.business_unit,
  d.pipeline_id,
  d.stage_id,
  ps.name as stage_name,
  d.status,
  d.source,
  d.owner_id,
  p.full_name as owner_name,
  d.value,
  d.currency,
  d.created_at,
  d.closed_at
from public.deals d
left join public.pipeline_stages ps on ps.id = d.stage_id
left join public.profiles p on p.id = d.owner_id
where d.deleted_at is null;

-- 6. Customer acquisition by source and month.
create or replace view public.v_report_customers with (security_invoker = on) as
select
  c.id,
  c.source,
  c.business_units,
  c.status,
  c.created_at
from public.customers c
where c.deleted_at is null;

-- 7. Aging receivables — reuses public.v_invoice_aging from Phase 3.

-- 8. Reseller performance and commissions due.
create or replace view public.v_report_resellers with (security_invoker = on) as
select
  r.id,
  r.name,
  r.location_id,
  l.name as location_name,
  r.commission_rate,
  r.is_active,
  coalesce(v.sold_count, 0) as vouchers_sold,
  coalesce(v.revenue, 0) as revenue,
  coalesce(s.total_commission, 0) as total_commission,
  coalesce(s.total_paid, 0) as total_paid,
  coalesce(s.total_commission, 0) - coalesce(s.total_paid, 0) as commission_due
from public.resellers r
left join public.locations l on l.id = r.location_id
left join (
  select reseller_id, count(*) as sold_count, sum(price_sold) as revenue
  from public.vouchers
  where status in ('sold', 'used') and reseller_id is not null
  group by reseller_id
) v on v.reseller_id = r.id
left join (
  select reseller_id, sum(commission) as total_commission, sum(amount_paid) as total_paid
  from public.reseller_settlements
  group by reseller_id
) s on s.reseller_id = r.id;

-- 9. Installation completion rate and average lead time.
create or replace view public.v_report_installations with (security_invoker = on) as
select
  i.id,
  i.job_type,
  i.status,
  i.technician_id,
  p.full_name as technician_name,
  i.location_id,
  l.name as location_name,
  i.scheduled_at,
  i.started_at,
  i.completed_at,
  i.created_at,
  extract(epoch from (i.completed_at - i.created_at)) / 3600 as lead_time_hours
from public.installations i
left join public.profiles p on p.id = i.technician_id
left join public.locations l on l.id = i.location_id;

grant select on public.v_report_revenue to authenticated;
grant select on public.v_report_voucher_sales to authenticated;
grant select on public.v_report_subscriptions to authenticated;
grant select on public.v_report_tickets to authenticated;
grant select on public.v_report_deals to authenticated;
grant select on public.v_report_customers to authenticated;
grant select on public.v_report_resellers to authenticated;
grant select on public.v_report_installations to authenticated;
