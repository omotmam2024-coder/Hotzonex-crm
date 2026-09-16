-- ============================================================
-- Bug fix (found by the §9.2 money-integrity test): the CASE expression
-- assigning `status` in fn_recalc_invoice is built entirely from untyped
-- string literals, so Postgres resolves its type as `text` rather than
-- `invoice_status` — and there is no implicit/assignment cast from text to
-- a user-defined enum. Every invoice with more than one line item (or any
-- payment allocation, since that also calls fn_recalc_invoice) failed with
-- "column status is of type invoice_status but expression is of type
-- text". Cast the CASE result explicitly.
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
         status = (case
           when status = 'void' then 'void'
           when status = 'draft' and v_paid = 0 then 'draft'
           when v_paid >= v_total and v_total > 0 then 'paid'
           when v_paid > 0 then 'partial'
           when v_due < current_date then 'overdue'
           else 'sent'
         end)::invoice_status,
         updated_at = now()
   where id = p_invoice_id;
end $$;
revoke execute on function public.fn_recalc_invoice(uuid) from public, anon, authenticated;
