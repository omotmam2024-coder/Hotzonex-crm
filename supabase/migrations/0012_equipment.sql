-- ============================================================
-- Equipment inventory: routers and other network/company-owned devices,
-- with configuration/documentation notes, purchase info, and photos.
-- Optionally linked to a customer/location once deployed; otherwise sits
-- as unassigned company stock.
-- ============================================================

create type equipment_type as enum (
  'router', 'switch', 'access_point', 'ont', 'antenna', 'modem', 'cable', 'other'
);

create type equipment_status as enum ('in_stock', 'deployed', 'faulty', 'retired');

create table public.equipment (
  id uuid primary key default gen_random_uuid(),
  equipment_code text unique,
  label text not null,
  equipment_type equipment_type not null default 'router',
  business_unit business_unit not null default 'wifi',
  status equipment_status not null default 'in_stock',
  brand text,
  model text,
  serial_number text,
  mac_address text,
  -- text, not inet: Supabase's TS type generator maps inet to `unknown`,
  -- and nothing here needs subnet-aware queries.
  ip_address text,
  customer_id uuid references public.customers(id) on delete set null,
  location_id uuid references public.locations(id) on delete set null,
  purchase_date date,
  purchase_price numeric(12,2),
  currency currency_code,
  vendor text,
  warranty_expiry date,
  notes text,
  photo_paths text[] not null default '{}',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index equipment_customer_id_idx on public.equipment(customer_id);
create index equipment_location_id_idx on public.equipment(location_id);
create index equipment_business_unit_idx on public.equipment(business_unit);
create index equipment_status_idx on public.equipment(status);

alter table public.equipment enable row level security;

create trigger trg_equipment_updated before update on public.equipment
  for each row execute function public.set_updated_at();

create trigger trg_equipment_audit after insert or update or delete on public.equipment
  for each row execute function public.fn_audit();

create or replace function public.fn_equipment_code()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if new.equipment_code is null then
    new.equipment_code := public.next_code('equipment');
  end if;
  return new;
end
$function$;

create trigger trg_equipment_code before insert on public.equipment
  for each row execute function public.fn_equipment_code();

insert into public.counters (key, prefix, padding, current_value)
values ('equipment', 'EQ-', 4, 0)
on conflict (key) do nothing;

create policy equipment_select on public.equipment for select to authenticated
  using (deleted_at is null and public.row_visible(array[business_unit], location_id, null, created_by));

create policy equipment_insert on public.equipment for insert to authenticated
  with check (public.can_write());

create policy equipment_update on public.equipment for update to authenticated
  using (public.can_write() and public.row_visible(array[business_unit], location_id, null, created_by))
  with check (public.can_write() and (deleted_at is null or public.is_admin()));

create policy equipment_delete on public.equipment for delete to authenticated
  using (public.is_admin());

-- ---------- Storage: equipment photos, scoped by equipment_id folder ----------
insert into storage.buckets (id, name, public)
values ('equipment-files', 'equipment-files', false)
on conflict (id) do nothing;

create policy equipment_files_storage_select on storage.objects for select to authenticated
  using (
    bucket_id = 'equipment-files'
    and exists (
      select 1 from public.equipment e
      where e.id::text = (storage.foldername(name))[1]
        and e.deleted_at is null
        and public.row_visible(array[e.business_unit], e.location_id, null, e.created_by)
    )
  );

create policy equipment_files_storage_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'equipment-files'
    and public.can_write()
    and exists (
      select 1 from public.equipment e
      where e.id::text = (storage.foldername(name))[1]
        and e.deleted_at is null
        and public.row_visible(array[e.business_unit], e.location_id, null, e.created_by)
    )
  );

create policy equipment_files_storage_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'equipment-files'
    and public.can_write()
    and exists (
      select 1 from public.equipment e
      where e.id::text = (storage.foldername(name))[1]
        and e.deleted_at is null
        and public.row_visible(array[e.business_unit], e.location_id, null, e.created_by)
    )
  );
