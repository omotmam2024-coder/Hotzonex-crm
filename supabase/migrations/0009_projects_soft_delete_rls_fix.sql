-- ============================================================
-- Bug fix (found by self-review of the Services edit/delete UI): project
-- "delete" is a soft delete (an UPDATE setting deleted_at), but the existing
-- projects_update policy's WITH CHECK only required can_write() — the same
-- bar as any ordinary field edit — not is_admin() like projects_delete (the
-- real DELETE, unused by the UI) already requires. That let any non-viewer
-- role (manager/agent/technician) soft-delete a project via a direct API
-- call, bypassing the UI's admin-only Delete button entirely. Tighten the
-- WITH CHECK so setting deleted_at to a non-null value requires is_admin();
-- ordinary updates (deleted_at left null) are unaffected.
-- ============================================================
drop policy if exists projects_update on public.projects;
create policy projects_update on public.projects for update to authenticated
  using (public.can_write() and public.row_visible(array['services']::business_unit[], null, owner_id, created_by))
  with check (public.can_write() and (deleted_at is null or public.is_admin()));
