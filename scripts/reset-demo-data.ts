/**
 * Demo/seed reset (§9 of the build spec).
 *
 * Wipes all transactional/demo data back to a clean slate while keeping the
 * admin-configured reference data intact: profiles, locations, service_plans,
 * settings, pipelines/pipeline_stages, ticket_categories, suppliers,
 * message_templates and counters (counters are reset to 0, not deleted, so
 * they keep their prefix/padding config).
 *
 * Runs as service_role (bypasses RLS) so the wipe is complete regardless of
 * who's logged in. Deletion order respects foreign keys that are RESTRICT
 * rather than CASCADE (invoices/payments/vouchers -> customers) — the rest
 * cascade automatically once customers go.
 *
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run demo:reset -- --yes
 */
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../src/types/database'

const SUPABASE_URL = requireEnv('SUPABASE_URL')
const SERVICE_ROLE_KEY = requireEnv('SUPABASE_SERVICE_ROLE_KEY')

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    console.error(`Missing required env var ${name}. See scripts/reset-demo-data.ts header for usage.`)
    process.exit(1)
  }
  return value
}

const admin = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// Tables wiped in dependency order — anything with a RESTRICT (not CASCADE)
// foreign key to customers (invoices, payments, vouchers) must go before
// `customers` itself; everything else cascades automatically.
const TABLES_IN_ORDER = [
  'message_log',
  'campaigns',
  'tickets',
  'invoices',
  'vouchers',
  'voucher_batches',
  'payments',
  'projects',
  'bookings',
  'subscriptions',
  'installations',
  'deals',
  'activities',
  'tasks',
  'customers',
  'audit_log',
  'notifications',
  'error_log',
] as const

async function wipeTable(table: (typeof TABLES_IN_ORDER)[number]) {
  const { count, error: countErr } = await admin.from(table).select('id', { count: 'exact', head: true })
  if (countErr) throw new Error(`Could not count ${table}: ${countErr.message}`)

  const { error } = await admin.from(table).delete().not('id', 'is', null)
  if (error) throw new Error(`Could not wipe ${table}: ${error.message}`)

  console.log(`  ✅ ${table}: removed ${count ?? 0} row(s)`)
}

async function resetCounters() {
  const { error } = await admin.from('counters').update({ current_value: 0 }).not('key', 'is', null)
  if (error) throw new Error(`Could not reset counters: ${error.message}`)
  console.log('  ✅ counters reset to 0')
}

async function main() {
  if (!process.argv.includes('--yes')) {
    console.error(
      'This permanently deletes ALL customers, deals, tickets, invoices, payments, vouchers,\n' +
        'subscriptions, installations, projects, bookings, campaigns and their history.\n' +
        'Reference data (profiles, locations, service plans, pipelines, ticket categories,\n' +
        'suppliers, message templates) is kept. Re-run with --yes to confirm.',
    )
    process.exit(1)
  }

  console.log(`Resetting demo data on ${SUPABASE_URL} ...\n`)
  for (const table of TABLES_IN_ORDER) {
    await wipeTable(table)
  }
  await resetCounters()
  console.log('\nRESULT: DONE — demo data cleared, reference data and counters preserved.')
}

main().catch((err) => {
  console.error('\nRESULT: FAIL —', err.message)
  process.exit(1)
})
