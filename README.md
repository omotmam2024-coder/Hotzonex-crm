# Hotzonex CRM

A production CRM for Hotzonex (Juba, South Sudan) covering three business units — **WiFi**, **Services**, and the **Refreshment Centre** — in one app: customers, pipeline, subscriptions, vouchers, tickets, billing, and reporting.

Built mobile-first for staff on cheap Android phones over unreliable Starlink.

This build is delivered **phase by phase**. Complete so far:

- **Phase 0 — Foundation.** Sign-in, roles, and the app shell.
- **Phase 1 — Core CRM.** Customers (list, create/edit, duplicate detection, 360 page with Overview/Timeline/Deals/Notes/Files), tags, activities (global "Log activity" + `A` shortcut), tasks + My Day, the sales pipeline (drag-and-drop kanban with rotting indicator and weighted forecast, plus a table view), notifications, and global search (`⌘K`).

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
- `0010_seed.sql` — reference data: locations (HQ, Gorom, Jebel Iraq, Sub-Office), document-number counters, company/SLA/tax/venue settings, a starter FX rate.

`customer_notes` isn't in the original build spec's SQL section — the spec's own feature list (§5.2) calls for pinned notes with @mention-to-notify, which needs a real table. Added it rather than leave the Notes tab unbacked.

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
