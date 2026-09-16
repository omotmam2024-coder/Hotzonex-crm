-- ============================================================
-- Invoice edit/delete support (requested: print, edit, delete on invoices;
-- remove the void button/flow from the UI — the 'void' status and its
-- handling elsewhere in the schema are left untouched).
-- ============================================================

-- Same bug shape as migration 0009 (projects): invoice "delete" is a soft
-- delete (an UPDATE setting deleted_at), but invoices_update's WITH CHECK
-- only required can_write() — the same bar as any ordinary field edit —
-- not is_admin() like invoices_delete (the real DELETE, unused by the UI)
-- already requires. Tighten WITH CHECK so setting deleted_at to a non-null
-- value requires is_admin(); ordinary updates (deleted_at left null) are
-- unaffected.
drop policy if exists invoices_update on public.invoices;
create policy invoices_update on public.invoices for update to authenticated
  using (public.can_write() and public.row_visible(array[business_unit], location_id, null, created_by))
  with check (public.can_write() and (deleted_at is null or public.is_admin()));

-- ---------- RPC: edit an invoice's header + replace its line items ----------
-- Editing an invoice needs to update the header and fully replace its line
-- items together. Doing that as two separate client-side calls (delete all
-- items, then insert the new set) is not atomic — a dropped connection
-- between the two leaves the invoice with zero items. Wrapping both in one
-- SECURITY DEFINER function makes them commit or roll back together.
create or replace function public.fn_update_invoice(
  p_invoice_id uuid,
  p_customer_id uuid,
  p_business_unit business_unit,
  p_location_id uuid,
  p_currency currency_code,
  p_issue_date date,
  p_due_date date,
  p_notes text,
  p_terms text,
  p_items jsonb
) returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_item jsonb;
  v_sort int := 0;
  v_unit business_unit;
  v_location uuid;
  v_creator uuid;
  v_status invoice_status;
begin
  if not public.can_write() then
    raise exception 'Not authorised';
  end if;

  select business_unit, location_id, created_by, status into v_unit, v_location, v_creator, v_status
    from public.invoices where id = p_invoice_id and deleted_at is null;
  if not found then
    raise exception 'Invoice not found';
  end if;
  -- Mirrors the UI's EDITABLE_STATUSES gate server-side — a paid/void
  -- invoice's line items must not change under it without a new payment.
  if v_status not in ('draft', 'sent') then
    raise exception 'Only draft or sent invoices can be edited';
  end if;
  if not public.row_visible(array[v_unit], v_location, null, v_creator) then
    raise exception 'Not authorised';
  end if;
  -- Re-check visibility against the *new* business unit/location too — the
  -- caller could otherwise reassign the invoice into a unit or location
  -- outside their scope while only ever having proven access to the old one.
  if not public.row_visible(array[p_business_unit], p_location_id, null, v_creator) then
    raise exception 'Not authorised for the target business unit or location';
  end if;
  if jsonb_array_length(p_items) = 0 then
    raise exception 'Invoice must have at least one line item';
  end if;

  update public.invoices
     set customer_id = p_customer_id,
         business_unit = p_business_unit,
         location_id = p_location_id,
         currency = p_currency,
         issue_date = p_issue_date,
         due_date = p_due_date,
         notes = p_notes,
         terms = p_terms
   where id = p_invoice_id;

  delete from public.invoice_items where invoice_id = p_invoice_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    insert into public.invoice_items(invoice_id, plan_id, description, quantity, unit_price, discount, sort_order)
    values (
      p_invoice_id,
      nullif(v_item->>'plan_id', '')::uuid,
      v_item->>'description',
      (v_item->>'quantity')::numeric,
      (v_item->>'unit_price')::numeric,
      (v_item->>'discount')::numeric,
      v_sort
    );
    v_sort := v_sort + 1;
  end loop;
end
$function$;
revoke execute on function public.fn_update_invoice(uuid, uuid, business_unit, uuid, currency_code, date, date, text, text, jsonb) from public, anon;
grant execute on function public.fn_update_invoice(uuid, uuid, business_unit, uuid, currency_code, date, date, text, text, jsonb) to authenticated;
