-- ============================================================
-- Customer notes (pinned, @mention-a-teammate-to-notify)
-- ============================================================
create table if not exists public.customer_notes (
  id                uuid primary key default gen_random_uuid(),
  customer_id       uuid not null references public.customers(id) on delete cascade,
  body              text not null,
  pinned            boolean not null default false,
  mentioned_user_ids uuid[] not null default '{}',
  created_by        uuid references public.profiles(id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists idx_customer_notes_customer on public.customer_notes(customer_id, pinned desc, created_at desc);

drop trigger if exists trg_customer_notes_updated on public.customer_notes;
create trigger trg_customer_notes_updated before update on public.customer_notes
  for each row execute function public.set_updated_at();

alter table public.customer_notes enable row level security;
drop policy if exists customer_notes_select on public.customer_notes;
create policy customer_notes_select on public.customer_notes for select to authenticated
  using (exists (
    select 1 from public.customers c
    where c.id = customer_notes.customer_id and c.deleted_at is null
      and public.row_visible(c.business_units, c.location_id, c.owner_id, c.created_by)
  ));
drop policy if exists customer_notes_write on public.customer_notes;
create policy customer_notes_write on public.customer_notes for all to authenticated
  using (public.can_write() and exists (
    select 1 from public.customers c
    where c.id = customer_notes.customer_id and c.deleted_at is null
      and public.row_visible(c.business_units, c.location_id, c.owner_id, c.created_by)
  ))
  with check (public.can_write());

-- Notify each mentioned teammate when a note mentions them.
create or replace function public.fn_customer_note_notify() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_uid uuid; v_customer_name text;
begin
  select display_name into v_customer_name from public.customers where id = new.customer_id;
  foreach v_uid in array new.mentioned_user_ids loop
    if v_uid is distinct from auth.uid() then
      insert into public.notifications (user_id, type, title, body, link)
      values (v_uid, 'note_mention', 'Mentioned in a note',
              coalesce(v_customer_name, 'A customer') || ': ' || left(new.body, 140),
              '/customers/' || new.customer_id);
    end if;
  end loop;
  return new;
end $$;
revoke execute on function public.fn_customer_note_notify() from public, anon, authenticated;

drop trigger if exists trg_customer_note_notify on public.customer_notes;
create trigger trg_customer_note_notify after insert on public.customer_notes
  for each row execute function public.fn_customer_note_notify();

-- ============================================================
-- Storage: customer files (contracts, IDs, site photos, signed forms)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('customer-files', 'customer-files', false)
on conflict (id) do nothing;

-- Objects are stored at "<customer_id>/<filename>"; the folder name doubles
-- as the customer_id used to check visibility, same rule as every other
-- customer-scoped table.
drop policy if exists customer_files_storage_select on storage.objects;
create policy customer_files_storage_select on storage.objects for select to authenticated
  using (
    bucket_id = 'customer-files'
    and exists (
      select 1 from public.customers c
      where c.id::text = (storage.foldername(name))[1] and c.deleted_at is null
        and public.row_visible(c.business_units, c.location_id, c.owner_id, c.created_by)
    )
  );

drop policy if exists customer_files_storage_insert on storage.objects;
create policy customer_files_storage_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'customer-files'
    and public.can_write()
    and exists (
      select 1 from public.customers c
      where c.id::text = (storage.foldername(name))[1] and c.deleted_at is null
        and public.row_visible(c.business_units, c.location_id, c.owner_id, c.created_by)
    )
  );

drop policy if exists customer_files_storage_delete on storage.objects;
create policy customer_files_storage_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'customer-files'
    and public.can_write()
    and exists (
      select 1 from public.customers c
      where c.id::text = (storage.foldername(name))[1] and c.deleted_at is null
        and public.row_visible(c.business_units, c.location_id, c.owner_id, c.created_by)
    )
  );
