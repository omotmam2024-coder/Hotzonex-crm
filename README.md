# Hotzonex CRM

A production CRM for Hotzonex (Juba, South Sudan) covering three business units — **WiFi**, **Services**, and the **Refreshment Centre** — in one app: customers, pipeline, subscriptions, vouchers, tickets, billing, and reporting.

Built mobile-first for staff on cheap Android phones over unreliable Starlink.

This build is delivered **phase by phase**. Complete so far:

- **Phase 0 — Foundation.** Sign-in, roles, and the app shell.
- **Phase 1 — Core CRM.** Customers (list, create/edit, duplicate detection, 360 page with Overview/Timeline/Deals/Notes/Files), tags, activities (global "Log activity" + `A` shortcut), tasks + My Day, the sales pipeline (drag-and-drop kanban with rotting indicator and weighted forecast, plus a table view), notifications, and global search (`⌘K`).
- **Phase 2 — WiFi operations.** Service plans, voucher batches (server-side generation RPC, zero duplicates) with CSV/PDF export for printing, the sell-a-voucher flow with a 58mm thermal/PDF receipt and WhatsApp send, voucher stock alerts and manager+ void, resellers with allocation and settlement/commission tracking, subscriptions with renew/suspend/resume and a daily pg_cron expiry sweep (flags `expiring_soon`/`expired`, creates renewal tasks), and installations with a technician mobile view (one-tap status, GPS capture, photo upload, canvas signature capture).
- **Phase 3 — Support desk & billing.** Tickets (board + filterable list, SLA response/resolution countdown computed from stored timestamps, threaded comments with an internal-note toggle, resolve with category+note, reopen restarts the resolution timer and logs the prior interval, optional 1–5 satisfaction rating, bulk reassign) with a seeded category catalogue. Invoices (create with line items from a service plan or free text, inline line-item editing while `draft`/`sent`, server-computed subtotal/total/status via `fn_recalc_invoice`, manager+ void), payments recorded against one or more invoices atomically (`fn_record_payment`) with a 58mm thermal/PDF receipt and WhatsApp send, an aging report (current/1-30/31-60/61-90/90+) with CSV/PDF export, and a customer-scoped Billing tab (running balance) alongside a Tickets tab on Customer 360. `fn_renew_subscription` now raises a real invoice (and, when paid immediately, an allocated payment) instead of a bare payment row.
- **Phase 4 — Services unit & Refreshment Centre.** Projects (kanban board by status + list, create/edit, owner + progress tracking) with milestones — completing one with an amount raises a draft invoice pre-filled with its title (`fn_complete_milestone`) — and retainer contracts with a renewal countdown badge, backed by a daily contract-renewal sweep (30/14/7 days out). Suppliers (admin-managed catalogue) and supplier orders (`ordered → received/partial/cancelled`) for the venue's stock. Event bookings on a month calendar + day list, with a capacity-conflict flag against `settings.venue_capacity`, and deposit collection that records a real payment against the customer (`fn_record_booking_deposit`). Customer 360 gains Projects (Services customers) and Bookings (Refreshment customers) tabs.
- **Phase 5 — Campaigns & reports.** Message templates with placeholder live preview; campaigns built on a structured, jsonb-stored audience filter (unit, customer status, location, subscription status, tag) that's re-evaluated live both for the recipient-count preview and again when building the send queue — never frozen at creation — and always excludes opted-out customers. Sending is the manual/WhatsApp-link work queue: tap a row to open a pre-filled `wa.me` message and log it to `message_log`, which also merges into the customer 360 Timeline. All nine §5.11 reports (revenue, voucher sales & stock, subscription churn/renewal/expiring, ticket volume & SLA times, pipeline conversion & win rate, customer acquisition, aging receivables, reseller performance & commissions due, installation completion & lead time) share one filter bar + chart + table shell, each reading from its own `v_report_*` view with the date range/unit/location/owner filters pushed down as real query predicates, and each exports to CSV (PDF too for revenue).
- **Phase 6 — Hardening.** Installable PWA (manifest + service worker via `vite-plugin-pwa`, `NetworkFirst` caching for the tasks/tickets lists so today's queue is still readable offline, an offline fallback page, and a persistent offline banner) with route-level error boundaries that clear on navigation. A real security/correctness pass: an RLS penetration test script exercising every role against every table, a money-integrity test that drove a genuine production bug out of hiding (see migration `0008` below), a voucher-concurrency test proving double-sell is impossible under load, and a full migration-replay check (all 17 migration files re-applied end-to-end against the live database with zero errors). A demo/seed reset script for wiping transactional data back to a clean slate without touching reference data.

## Tech stack

Vite + React 18 + TypeScript (strict) · React Router v6 · Supabase (Postgres + Auth + RLS + Storage) · TanStack Query v5 · react-hook-form + zod · Tailwind CSS + hand-rolled shadcn/ui-style components (Radix UI primitives) · Recharts · date-fns · TanStack Table · xlsx / jsPDF · vite-plugin-pwa · Vercel.

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
- `0005_support_and_billing.sql` — `ticket_categories`, `tickets`, `ticket_comments`, `invoices`, `invoice_items`, `payment_allocations` (against the existing `payments` table); `fn_ticket_code` (ticket numbering + SLA due-date computation from `settings.sla` by priority, one BEFORE INSERT trigger), `fn_invoice_code`, `fn_recalc_invoice` + the invoice-item triggers that keep `subtotal`/`total`/`amount_paid`/`status` in sync; RLS on every table.
- `0005_1_billing_rpcs.sql` — `fn_record_payment` (one payment applied across multiple invoices, atomically), `fn_resolve_ticket` (category + note required), `fn_reopen_ticket` (restarts the resolution SLA timer, logs the prior interval as a system comment), the first-response-timestamp trigger on `ticket_comments`, `v_customer_balances` and `v_invoice_aging` views, and the `fn_renew_subscription` upgrade (same signature — now raises a real invoice instead of a bare payment).
- `0006_services_and_refreshment.sql` — `projects`, `project_milestones`, `contracts`, `suppliers`, `supplier_orders`, `bookings`; code-generation triggers; RLS on every table.
- `0006_1_services_refreshment_rpcs.sql` — `fn_complete_milestone` (marks a milestone complete and raises a draft invoice pre-filled with its title + amount), `fn_record_booking_deposit` (records a payment against the booking's customer), and `fn_contract_renewal_sweep` scheduled daily via `pg_cron` at 02:00 UTC (creates a renewal task at 30/14/7 days out for active, auto-renewing contracts).
- `0007_campaigns_and_system.sql` — `message_templates`, `campaigns`, `message_log`, `saved_views`; RLS on every table (`message_templates` as reference data; `campaigns` via `business_unit`+`created_by`; `message_log` visibility shaped like `activities` — owner = creator = the sender; `saved_views` owner-writable, optionally team-shared read-only).
- `0007_1_reporting_views.sql` — one `security_invoker = on` view per §5.11 report: `v_report_revenue`, `v_report_voucher_sales`, `v_report_subscriptions`, `v_report_tickets`, `v_report_deals`, `v_report_customers`, `v_report_resellers`, `v_report_installations` (aging receivables reuses `v_invoice_aging` from Phase 3, voucher stock position reuses `v_voucher_stock` from Phase 2).
- `0010_seed.sql` — reference data: locations (HQ, Gorom, Jebel Iraq, Sub-Office), document-number counters, company/SLA/tax/venue settings, a starter FX rate, the ticket category catalogue (No Internet, Slow Speed, Billing Query, Voucher Issue, Equipment Fault, Relocation, New Request, Website Support, Other), and the 5 message templates from §7.10 (Expiry 3 Days, Expired Today, Payment Receipt, Invoice Due, Ticket Resolved).
- `0008_fn_recalc_invoice_enum_cast_fix.sql` — bug fix found by the Phase 6 money-integrity test: `fn_recalc_invoice`'s status-assigning `CASE` expression was built entirely from untyped string literals, so Postgres resolved it as `text`, and there's no implicit cast from `text` to a user-defined enum — every invoice with more than one line item, or any payment allocation, failed outright. Fixed with an explicit `::invoice_status` cast on the `CASE` result. (Numbered `0008` for when it landed; applied after `0007_1` and before `0010` in practice.)

Intentional adaptations from the original build spec's SQL section, called out where they happen:

1. **`customer_notes`** isn't in the spec's SQL at all — its own feature list (§5.2) calls for pinned notes with @mention-to-notify, which needs a real table. Added it rather than leave the Notes tab unbacked.
2. **The expiry sweep runs as a `pg_cron` job**, not an Edge Function on an external trigger. Same daily behaviour (flag subscriptions, create renewal tasks), fewer moving parts, no secret management. WhatsApp/SMS reminder dispatch through message templates arrives with Phase 5's campaigns module, once `message_log`/`message_templates` exist.
3. **Voucher sale recorded a `payments` row directly** rather than raising a formal invoice, since `invoices` didn't exist until Phase 3. `payments` was designed to match the Phase 3 shape exactly, so nothing there needed reworking once invoices landed. `fn_renew_subscription` now raises a real invoice (Phase 3); voucher sales still record a bare payment, matching the spec's own voucher-sale flow (§5.5), which never calls for an invoice.
4. **Ticket reopening doesn't add a second pair of timestamp columns** for "both intervals" (§5.6's acceptance criteria) — the original `resolved_at`/`created_at` interval is written into a system `ticket_comments` entry at reopen time, and the second interval is simply the next `resolved_at` against the reset `sla_resolve_due`. Keeps the schema flat; the full history is still on the ticket's timeline.
5. **`contracts.last_reminder_at`** isn't in the spec's literal column list — added so the daily renewal sweep (§5.8's "30/14/7 days out" reminders) can't fire the same reminder twice, mirroring `subscriptions.last_reminder_at` from Phase 2.
6. **`suppliers` follows the "reference data" RLS pattern** (read-all, admin-write), not `row_visible` — the spec's own table has no `business_unit`, owner, or creator column to scope by, unlike every other Refreshment table. `projects` similarly uses a fixed `array['services']` literal (no `business_unit` column on the table), the same pattern already used for `installations` in Phase 2.
7. **A campaign message only fills `{{customer_name}}` from real data** when sent from the work queue — `{{plan}}`, `{{expiry_date}}` and the other placeholders fall back to representative sample text, since a bulk send doesn't fetch per-recipient subscription/invoice context for every audience type. The sender can edit the pre-filled `wa.me` text before hitting send. Template previews (in the template editor) always use the full sample dataset.
8. **Every report reads from its own SQL view with date-range/unit/location/owner filters pushed down** (§5.11's acceptance criterion), but final chart bucketing and rollups (by month, by stage, win rate, etc.) happen client-side over the filtered rows — the same shape already used by the Phase 3 aging report, rather than a bespoke aggregate view per breakdown.

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

### Roles

| Role | Can write? | Sees which rows? |
|---|---|---|
| `owner` | Yes | Everything. Exactly one exists — the first account ever created. |
| `admin` | Yes | Everything, including settings, users, reference-data catalogues (plans, suppliers, templates), and admin-only actions (void a voucher, delete a customer). |
| `manager` | Yes | Everything within their assigned `location_ids` (or everything, if none assigned). Can void vouchers and see reseller settlements. |
| `agent` | Yes | Rows they created, rows they own/are assigned, or rows at their assigned locations. |
| `technician` | Yes | Same visibility rule as `agent` — used for installation/field-service assignees. |
| `viewer` | No (read-only) | Same visibility rule as `manager`/`agent` depending on whether they have assigned locations — `can_write()` blocks every insert/update/delete regardless. |

Every table's RLS policy routes through the shared `row_visible()`/`can_write()`/`is_admin()` SQL functions (see `0002_core_identity.sql`), so this table is the actual rule, not just documentation of intent — there is no separate application-layer permission check to fall out of sync with it.

## Operations runbook

### Adding a location

Admin/owner only. `Settings → Locations` (or directly: insert a row into `locations` with a `name` and `code`). No app restart or redeploy needed — locations are read live by every screen that filters by location.

### Adding a service plan

Admin/owner only, via `Settings → Service Plans` (or insert into `service_plans`: `business_unit`, `name`, `code` (unique), `price_ssp`, and either `duration_hours` for a voucher plan or leave it null for a subscription plan). Set `reorder_level` to whatever voucher stock count should trigger the low-stock warning on the Vouchers screen.

### Promoting a user / inviting staff

There's no self-service "invite" flow yet — every account starts as `viewer` on signup (except the very first, which becomes `owner` automatically). To promote someone: have them create an account, then as an admin/owner update their `profiles.role` (and `location_ids` / `business_units` if they should be scoped to specific locations or units) either from a future Admin → Users screen or directly:

```sql
update public.profiles set role = 'agent', location_ids = array['<location-uuid>'] where email = 'someone@example.com';
```

### Backups

Supabase takes automatic daily backups on paid plans (point-in-time recovery on Pro+); on the free tier, back up manually and regularly — from the Supabase dashboard (`Database → Backups`) or via `pg_dump` against the connection string in `Project Settings → Database`. Before any risky schema change, take a manual backup first. `audit_log` retains a before/after JSON snapshot of every insert/update/delete on every audited table, which covers point-in-time "what changed and who did it" without needing a full restore.

### Running the test scripts

All four require `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (from `Project Settings → API` — **never** commit or expose the service-role key); the first three also need `SUPABASE_ANON_KEY`. Run them against a staging project, not production, since `test:money` and `test:voucher-concurrency` write and then clean up real rows, and `demo:reset` is destructive by design.

```bash
SUPABASE_URL=... SUPABASE_ANON_KEY=... SUPABASE_SERVICE_ROLE_KEY=... npm run test:rls
SUPABASE_URL=... SUPABASE_ANON_KEY=... SUPABASE_SERVICE_ROLE_KEY=... npm run test:money
SUPABASE_URL=... SUPABASE_ANON_KEY=... SUPABASE_SERVICE_ROLE_KEY=... npm run test:voucher-concurrency
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run demo:reset -- --yes   # wipes transactional data, keeps reference data
```

- `test:rls` — creates a throwaway user per role, signs in with a real session, and asserts each role can/can't read and write each table per the spec's scoping rules. Exits non-zero on any failure.
- `test:money` — the invoice/payment math regression test that caught the `fn_recalc_invoice` enum-cast bug during Phase 6 hardening (see migration `0008`). Keep this passing; it's the test most likely to catch the next money bug too.
- `test:voucher-concurrency` — fires 20 concurrent sells at the same voucher code and asserts exactly one succeeds.
- `demo:reset` — truncates customers, deals, tickets, invoices, payments, vouchers, subscriptions, installations, projects, bookings, campaigns and their history; keeps profiles, locations, service plans, settings, pipelines, ticket categories, suppliers, and message templates; resets document-number counters to 0. Requires `--yes` to run.

### Migration replay check

Because Supabase branching (a disposable copy-on-write dev database, the cleanest way to test "do all migrations build cleanly from empty") requires the Pro plan or above, this project verifies migration safety a different way: every migration file already uses `create table if not exists` / `create or replace function` / `drop policy if exists … create policy …` / `on conflict … do nothing`, so re-running the entire migration set end-to-end against the live database is itself the safety check — if it errors, a migration isn't as idempotent as it claims to be. Re-run all files in `supabase/migrations/`, in filename order, via the Supabase SQL editor or CLI, then confirm RLS is still enabled everywhere:

```sql
select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity = false;  -- must return zero rows
```

### Staff guide

A non-technical, task-by-task guide (sell a voucher, take a payment, open a ticket, renew a subscription) lives at [`docs/USER_GUIDE.md`](docs/USER_GUIDE.md) — share that with front-desk and field staff instead of this README.

### Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| Blank screen with a console error about `VITE_SUPABASE_URL` | Missing/empty env var — see **Environment variables** above. The app throws on boot rather than running against nothing. |
| A signed-in user sees "no rows" where they expect data | Check their `profiles.role`, `business_units`, and `location_ids` — RLS is unforgiving by design. `viewer` role blocks all writes; a `manager`/`agent`/`viewer` with a non-empty `location_ids` only sees rows at those locations. |
| An update/insert silently does nothing or errors "new row violates row-level security policy" | The row's `business_unit`/`location_id`/`owner_id`/`created_by` doesn't satisfy `row_visible()` for that user, or their role fails `can_write()` (viewers). |
| A multi-line invoice or a payment allocation throws a Postgres type error | This exact symptom was migration `0008`'s bug (fixed) — if it recurs after a future edit to `fn_recalc_invoice`, check for an untyped `CASE` being assigned to an enum column and cast explicitly. |
| Voucher/installation/renewal PWA screens show stale data while offline | Expected — only `tasks` and `tickets` GET requests are cached (`NetworkFirst`) for offline reading; everything else needs connectivity. The offline banner at the top of the app makes this state visible. |
| `npm run build` fails type-checking `scripts/*.ts` | Those files are covered by `tsconfig.scripts.json`, referenced from the root `tsconfig.json` — run `npx tsc -b` locally to see the same errors CI/Vercel will see. |

## Deployment

Deployed to Vercel from GitHub with preview deployments on branches. Build command `npm run build`, output directory `dist`. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the Vercel project's environment variables (all environments) before the first deploy succeeds — the app throws on boot if they're missing rather than silently running against nothing.

## Known accepted risk

`xlsx` (SheetJS) is a locked dependency (Excel export/import) with an upstream, unpatched prototype-pollution/ReDoS advisory (`npm audit`). It's used only for exporting data the app already trusts; the Customers CSV/Excel **import** feature (later phase) will size-limit and validate parsed rows before they touch the database rather than trusting the library's output blindly.

Supabase Auth's **leaked-password protection** (checks new passwords against HaveIBeenPwned) is off by default and hasn't been turned on — it's a one-click toggle in the Supabase dashboard under `Authentication → Policies`, not a code or migration change, so it's flagged here as a recommended follow-up rather than fixed in this repo.

Every `SECURITY DEFINER` function the Supabase security advisor flags as callable by `authenticated` (`auth_role`, `can_write`, `row_visible`, every `fn_*` RPC, etc.) is intentional — that's the whole RLS-helper-function and RPC pattern this schema is built on (see `0002_core_identity.sql`), each one does its own authorization check internally (`can_write()`, role checks, or the RLS policies on the tables it touches) rather than relying on the caller's grant alone. `is_first_run()` is deliberately callable by `anon` too, so the signed-out login screen can render "create the first owner account." The performance advisor's "unused index" and "multiple permissive policies" findings are similarly expected: the indexes are foreign-key-covering indexes that simply haven't seen query volume yet on a non-production dataset, and every table's `_read`/`_write` (or `_select`/`_write`) policy pair is an intentional split for readability, with only the negligible cost of Postgres evaluating two `true`-or-role-gated `SELECT` policies instead of one.
