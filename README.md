# Hotzonex CRM

A production CRM for Hotzonex (Juba, South Sudan) covering three business units — **WiFi**, **Services**, and the **Refreshment Centre** — in one app: customers, pipeline, subscriptions, vouchers, tickets, billing, and reporting.

Built mobile-first for staff on cheap Android phones over unreliable Starlink.

This build is delivered **phase by phase**. Complete so far:

- **Phase 0 — Foundation.** Sign-in, roles, and the app shell.
- **Phase 1 — Core CRM.** Customers (list, create/edit, duplicate detection, 360 page with Overview/Timeline/Deals/Notes/Files), tags, activities (global "Log activity" + `A` shortcut), tasks + My Day, the sales pipeline (drag-and-drop kanban with rotting indicator and weighted forecast, plus a table view), notifications, and global search (`⌘K`).
- **Phase 2 — WiFi operations.** Service plans, voucher batches (server-side generation RPC, zero duplicates) with CSV/PDF export for printing, the sell-a-voucher flow with a 58mm thermal/PDF receipt and WhatsApp send, voucher stock alerts and manager+ void, resellers with allocation and settlement/commission tracking, subscriptions with renew/suspend/resume and a daily pg_cron expiry sweep (flags `expiring_soon`/`expired`, creates renewal tasks), and installations with a technician mobile view (one-tap status, GPS capture, photo upload, canvas signature capture).

## Tech stack

Vite + React 18 + TypeScript (strict) · React Router v6 · Supabase (Postgres + Auth + RLS + Storage) · TanStack Query v5 · react-hook-form + zod · Tailwind CSS + hand-rolled shadcn/ui-style components (Radix UI primitives) · Recharts · date-fns · TanStack Table · xlsx / jsPDF · Vercel.

## Local setup

```bash
npm install
cp .env.example .env   # fill in your Supabase project URL + anon key
npm run dev
```

Open http://localhost:5173.

## Environment variables

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project API URL. Frontend-safe. |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/publishable key. Frontend-safe — **never** the `service_role` key. |
| `VITE_MESSAGING_PROVIDER_ENABLED` | `false` (default) uses manual WhatsApp-link dispatch for campaigns; `true` switches to the provider adapter stub once a real provider (Twilio / Africa's Talking-shaped) is wired up. |

Set the same variables in your Vercel project's Environment Variables settings for Preview and Production.

## Database & migrations

SQL lives in `supabase/migrations/`, applied in numeric order. Every migration is idempotent (`create table if not exists`, `drop policy if exists … create policy …`) so it can be re-run safely against a fresh or partially-migrated database.

Currently applied:

- `0001_extensions_and_enums.sql` — Postgres extensions + all enum types used across every phase.
- `0002_core_identity.sql` — `locations`, `profiles`, `counters`, `settings`, `fx_rates`, `audit_log`, `notifications`, `error_log`; the `auth_role()/is_admin()/row_visible()` RLS helper functions; the sign-up trigger; RLS policies + hardening (locked-down `SECURITY DEFINER` function grants, indexed foreign keys, `(select auth.uid())` policy pattern).
- `0003_customers_and_pipeline.sql` — `tags`, `customers`, `customer_contacts`, `customer_files`, `pipelines`, `pipeline_stages`, `deals`, `activities`, `tasks`; per-unit pipeline/stage seed data (§5.3); RLS on every table.
- `0003_1_customer_notes_and_storage.sql` — `customer_notes` (pinned, @mention-a-teammate-to-notify) and the private `customer-files` Storage bucket with folder-scoped RLS.
- `0004_wifi_operations.sql` — `payments` (pulled forward from the Phase 3 billing schema — see below), `service_plans`, `resellers`, `voucher_batches`, `vouchers`, `reseller_settlements`, `subscriptions`, `installations`; RLS on every table.
- `0004_1_wifi_rpcs.sql` — `fn_generate_voucher_batch` (atomic, collision-safe code generation), `fn_sell_voucher`, `fn_void_voucher` (manager+, mandatory reason), `fn_renew_subscription`, `fn_suspend_subscription` / `fn_resume_subscription`; `v_voucher_stock` and `v_subscriptions_expiring` views.
- `0004_2_expiry_sweep.sql` — `fn_expiry_sweep()` scheduled daily via `pg_cron` at 01:00 UTC: flags `expiring_soon` (T-7…T-1) and `expired` (T+0) subscriptions and creates a renewal task for the account owner.
- `0004_3_payments_optional_customer.sql` — makes `payments.customer_id` nullable (hotspot vouchers are routinely sold to anonymous walk-ins) and updates `fn_sell_voucher` to match.
- `0004_4_installation_storage.sql` — the private `installation-files` Storage bucket (photos, signed forms) and `fn_update_installation_status` (technician status transitions, GPS, photos, signature, optional install-fee payment — one call each).
- `0010_seed.sql` — reference data: locations (HQ, Gorom, Jebel Iraq, Sub-Office), document-number counters, company/SLA/tax/venue settings, a starter FX rate.

Two intentional adaptations from the original build spec's SQL section, both called out where they happen:

1. **`customer_notes`** isn't in the spec's SQL at all — its own feature list (§5.2) calls for pinned notes with @mention-to-notify, which needs a real table. Added it rather than leave the Notes tab unbacked.
2. **The expiry sweep runs as a `pg_cron` job**, not an Edge Function on an external trigger. Same daily behaviour (flag subscriptions, create renewal tasks), fewer moving parts, no secret management. WhatsApp/SMS reminder dispatch through message templates arrives with Phase 5's campaigns module, once `message_log`/`message_templates` exist.
3. **Voucher sale and subscription renewal record a `payments` row directly** rather than raising a formal invoice — `invoices` doesn't exist until Phase 3 billing. `payments` was designed to match the eventual Phase 3 shape exactly, so nothing here needs reworking when invoices land; `fn_renew_subscription` will start raising a proper invoice at that point.

Apply with the Supabase CLI (`supabase db push`) or via the Supabase SQL editor / MCP tooling. Regenerate types after every schema change:

```bash
supabase gen types typescript --project-id <ref> > src/types/database.ts
```

**RLS is enabled on every table**, with explicit policies — there is no table a signed-in client can read or write outside its role's scope. Verify at any time with:

```sql
select c.relname
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity = false;
-- must return zero rows
```

## First run

No `owner` account exists until you create one. Open the app — with zero accounts, it routes straight to **Create the owner account** (`/setup`). That account is hard-assigned the `owner` role server-side (the signup trigger ignores any client-supplied role and only ever grants `owner` to the very first account; everyone after starts as `viewer` until an admin promotes them). After that, self-service signup no longer creates useful accounts on its own — invite staff from Admin → Users (arriving in a later phase) or promote a `viewer` account by editing their `profiles.role` as an admin/owner.

Roles: `owner`, `admin`, `manager`, `agent`, `technician`, `viewer` — see the CRM build spec for the full scoping rules.

## Deployment

Deployed to Vercel from GitHub with preview deployments on branches. Build command `npm run build`, output directory `dist`. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the Vercel project's environment variables (all environments) before the first deploy succeeds — the app throws on boot if they're missing rather than silently running against nothing.

## Known accepted risk

`xlsx` (SheetJS) is a locked dependency (Excel export/import) with an upstream, unpatched prototype-pollution/ReDoS advisory (`npm audit`). It's used only for exporting data the app already trusts; the Customers CSV/Excel **import** feature (later phase) will size-limit and validate parsed rows before they touch the database rather than trusting the library's output blindly.
