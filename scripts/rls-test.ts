/**
 * RLS penetration test (§9.1 of the build spec).
 *
 * Creates one throwaway auth user per role, signs in as each with the
 * *anon* key (exactly what a hostile or buggy client would use), and
 * attempts reads/writes each role should NOT be able to make. Prints a
 * pass/fail table; exits non-zero if anything fails, so it can gate CI.
 *
 * Requires the service_role key (only to provision/clean up test fixtures
 * and users — every actual assertion runs through the anon key + a real
 * session, never service_role). Never commit that key; pass it as an env
 * var for a single local/CI run:
 *
 *   SUPABASE_URL=... SUPABASE_ANON_KEY=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     npm run test:rls
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../src/types/database'

const SUPABASE_URL = requireEnv('SUPABASE_URL')
const ANON_KEY = requireEnv('SUPABASE_ANON_KEY')
const SERVICE_ROLE_KEY = requireEnv('SUPABASE_SERVICE_ROLE_KEY')

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    console.error(`Missing required env var ${name}. See scripts/rls-test.ts header for usage.`)
    process.exit(1)
  }
  return value
}

const admin = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

type Role = Database['public']['Enums']['user_role']
const ROLES: Role[] = ['owner', 'admin', 'manager', 'agent', 'technician', 'viewer']

interface TestUser {
  role: Role
  userId: string
  email: string
  client: SupabaseClient<Database>
}

interface Result {
  role: Role
  test: string
  pass: boolean
  detail: string
}

const results: Result[] = []
function record(role: Role, test: string, pass: boolean, detail: string) {
  results.push({ role, test, pass, detail })
}

async function createTestUser(role: Role, locationId: string): Promise<TestUser> {
  const email = `rls-test-${role}-${Date.now()}@hotzonex.invalid`
  const password = crypto.randomUUID()

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (createErr || !created.user) throw new Error(`Could not create ${role} test user: ${createErr?.message}`)

  // The handle_new_user trigger always grants 'viewer' (except the very
  // first account ever, which is already taken) — promote and scope the
  // profile directly as service_role, bypassing RLS by design here.
  const { error: updateErr } = await admin
    .from('profiles')
    .update({ role, business_units: ['wifi'], location_ids: [locationId] })
    .eq('id', created.user.id)
  if (updateErr) throw new Error(`Could not set up ${role} profile: ${updateErr.message}`)

  const client = createClient<Database>(SUPABASE_URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  const { error: signInErr } = await client.auth.signInWithPassword({ email, password })
  if (signInErr) throw new Error(`Could not sign in as ${role}: ${signInErr.message}`)

  return { role, userId: created.user.id, email, client }
}

async function cleanupTestUser(user: TestUser) {
  await admin.auth.admin.deleteUser(user.userId)
}

async function main() {
  console.log('Provisioning fixtures…')

  const { data: locations } = await admin.from('locations').select('id, name').order('name').limit(2)
  if (!locations || locations.length < 2) throw new Error('Need at least 2 seeded locations to run this test.')
  const [locationA, locationB] = locations as [{ id: string; name: string }, { id: string; name: string }]

  // A customer at Location B, owned/created by nobody in the test — used
  // to assert that manager/agent/technician/viewer scoped to Location A
  // cannot see it, while owner/admin (unscoped) can.
  const { data: fixtureCustomer, error: fixtureErr } = await admin
    .from('customers')
    .insert({ full_name: 'RLS Test Fixture', phone_primary: `+2119${Date.now().toString().slice(-8)}`, location_id: locationB.id, business_units: ['wifi'] })
    .select('id')
    .single()
  if (fixtureErr || !fixtureCustomer) throw new Error(`Could not create fixture customer: ${fixtureErr?.message}`)

  // A customer scoped to a unit no test role is assigned to.
  const { data: fixtureRefreshmentCustomer, error: fixtureRefErr } = await admin
    .from('customers')
    .insert({ full_name: 'RLS Test Fixture (Refreshment)', phone_primary: `+2119${(Date.now() + 1).toString().slice(-8)}`, business_units: ['refreshment'] })
    .select('id')
    .single()
  if (fixtureRefErr || !fixtureRefreshmentCustomer) throw new Error(`Could not create refreshment fixture: ${fixtureRefErr?.message}`)

  const users: TestUser[] = []
  try {
    for (const role of ROLES) {
      users.push(await createTestUser(role, locationA.id))
    }

    for (const user of users) {
      const isAdminLike = user.role === 'owner' || user.role === 'admin'

      // 1. Cross-location read within the same business unit.
      const { data: crossLocationRows } = await user.client.from('customers').select('id').eq('id', fixtureCustomer.id)
      const sawCrossLocation = (crossLocationRows?.length ?? 0) > 0
      record(
        user.role,
        'Read a same-unit customer at a location outside their scope',
        isAdminLike ? sawCrossLocation : !sawCrossLocation,
        sawCrossLocation ? 'row was visible' : 'row was hidden',
      )

      // 2. Cross-unit read.
      const { data: crossUnitRows } = await user.client.from('customers').select('id').eq('id', fixtureRefreshmentCustomer.id)
      const sawCrossUnit = (crossUnitRows?.length ?? 0) > 0
      record(
        user.role,
        'Read a customer in a business unit outside their assignment',
        isAdminLike ? sawCrossUnit : !sawCrossUnit,
        sawCrossUnit ? 'row was visible' : 'row was hidden',
      )

      // 3. Write to an admin-only reference table.
      const { error: settingsErr } = await user.client.from('settings').update({ value: 999 }).eq('key', 'tax_rate')
      record(
        user.role,
        'Update an admin-only settings row',
        isAdminLike ? !settingsErr : !!settingsErr,
        settingsErr ? `denied: ${settingsErr.message}` : 'write succeeded',
      )

      // 4. Delete a customer (delete is admin-only on every business table).
      const { error: deleteErr } = await user.client.from('customers').delete().eq('id', fixtureCustomer.id)
      record(
        user.role,
        'Delete a customer record',
        isAdminLike ? !deleteErr : !!deleteErr,
        deleteErr ? `denied: ${deleteErr.message}` : 'delete succeeded',
      )

      // 5. Viewer-only: any insert at all must be refused (can_write() is false).
      if (user.role === 'viewer') {
        const { error: insertErr } = await user.client
          .from('customers')
          .insert({ full_name: 'Should Not Insert', phone_primary: '+211900000000' })
        record(user.role, 'Insert as a read-only viewer', !!insertErr, insertErr ? `denied: ${insertErr.message}` : 'insert succeeded')
      }
    }
  } finally {
    console.log('Cleaning up fixtures and test users…')
    await admin.from('customers').delete().in('id', [fixtureCustomer.id, fixtureRefreshmentCustomer.id])
    for (const user of users) await cleanupTestUser(user)
  }

  console.log('\nRLS test results\n' + '='.repeat(80))
  let anyFailed = false
  for (const r of results) {
    if (!r.pass) anyFailed = true
    console.log(`${r.pass ? '✅ PASS' : '❌ FAIL'}  [${r.role.padEnd(10)}] ${r.test} — ${r.detail}`)
  }
  console.log('='.repeat(80))
  console.log(anyFailed ? 'RESULT: FAIL — a role reached data or a write it should not.' : 'RESULT: PASS — every forbidden read/write was denied.')
  process.exit(anyFailed ? 1 : 0)
}

main().catch((err) => {
  console.error('RLS test crashed:', err)
  process.exit(1)
})
