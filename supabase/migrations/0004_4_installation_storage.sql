-- ============================================================
-- Storage: installation photos and signed forms, scoped by
-- installation_id the same way customer-files is scoped by customer_id.
-- ============================================================
insert into storage.buckets (id, name, public)
values ('installation-files', 'installation-files', false)
on conflict (id) do nothing;

drop policy if exists installation_files_storage_select on storage.objects;
create policy installation_files_storage_select on storage.objects for select to authenticated
  using (
    bucket_id = 'installation-files'
    and exists (
      select 1 from public.installations i
      where i.id::text = (storage.foldername(name))[1]
        and public.row_visible(array['wifi']::business_unit[], i.location_id, i.technician_id, i.created_by)
    )
  );

drop policy if exists installation_files_storage_insert on storage.objects;
create policy installation_files_storage_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'installation-files'
    and public.can_write()
    and exists (
      select 1 from public.installations i
      where i.id::text = (storage.foldername(name))[1]
        and public.row_visible(array['wifi']::business_unit[], i.location_id, i.technician_id, i.created_by)
    )
  );

drop policy if exists installation_files_storage_delete on storage.objects;
create policy installation_files_storage_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'installation-files'
    and public.can_write()
    and exists (
      select 1 from public.installations i
      where i.id::text = (storage.foldername(name))[1]
        and public.row_visible(array['wifi']::business_unit[], i.location_id, i.technician_id, i.created_by)
    )
  );

-- ============================================================
-- RPC: technician job-status update, keeps started_at/completed_at
-- and the money side (install fee payment) consistent in one call.
-- ============================================================
create or replace function public.fn_update_installation_status(
  p_installation_id uuid,
  p_status          installation_status,
  p_gps_lat         numeric default null,
  p_gps_lng         numeric default null,
  p_notes           text default null,
  p_signature_path  text default null,
  p_photo_paths     text[] default null,
  p_record_payment  boolean default false,
  p_payment_method  payment_method default 'cash'
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_install public.installations; v_payment_id uuid;
begin
  if not public.can_write() then raise exception 'Not authorised'; end if;

  select * into v_install from public.installations where id = p_installation_id for update;
  if v_install.id is null then raise exception 'Installation not found'; end if;

  update public.installations
     set status = p_status,
         gps_lat = coalesce(p_gps_lat, gps_lat),
         gps_lng = coalesce(p_gps_lng, gps_lng),
         notes = coalesce(p_notes, notes),
         signature_path = coalesce(p_signature_path, signature_path),
         photo_paths = case when p_photo_paths is not null then array_cat(photo_paths, p_photo_paths) else photo_paths end,
         started_at = case when p_status = 'in_progress' and started_at is null then now() else started_at end,
         completed_at = case when p_status = 'completed' then now() else completed_at end,
         updated_at = now()
   where id = p_installation_id;

  if p_status = 'completed' and p_record_payment and v_install.install_fee > 0 then
    insert into public.payments(customer_id, amount, currency, method, location_id, received_by, notes)
    values (v_install.customer_id, v_install.install_fee, v_install.currency, p_payment_method,
            v_install.location_id, auth.uid(), 'Installation fee: ' || coalesce(v_install.job_code, ''))
    returning id into v_payment_id;
  end if;

  insert into public.activities(customer_id, type, direction, subject, body, user_id)
  values (v_install.customer_id, 'system', 'internal', 'Installation ' || p_status,
          coalesce(p_notes, ''), auth.uid());

  return jsonb_build_object('installation_id', p_installation_id, 'status', p_status, 'payment_id', v_payment_id);
end $$;
revoke execute on function public.fn_update_installation_status(uuid, installation_status, numeric, numeric, text, text, text[], boolean, payment_method) from public, anon;
grant execute on function public.fn_update_installation_status(uuid, installation_status, numeric, numeric, text, text, text[], boolean, payment_method) to authenticated;
