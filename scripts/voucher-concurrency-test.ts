/**
 * Voucher concurrency test (§9.3 of the build spec).
 *
 * Generates one real voucher via fn_generate_voucher_batch, then fires 20
 * concurrent fn_sell_voucher calls against that same code and asserts
 * exactly one succeeds — the row lock inside fn_sell_voucher (`for update`)
 * is what makes a double-sell impossible.
 *
 *   SUPABASE_URL=... SUPABASE_ANON_KEY=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     npm run test:voucher-concurrency
 */
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../src/types/database'

const SUPABASE_URL = requireEnv('SUPABASE_URL')
const ANON_KEY = requireEnv('SUPABASE_ANON_KEY')
const SERVICE_ROLE_KEY = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
const CONCURRENCY = 20

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    console.error(`Missing required env var ${name}. See scripts/voucher-concurrency-test.ts header for usage.`)
    process.exit(1)
  }
  return value
}

const admin = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function main() {
  const email = `voucher-concurrency-test-${Date.now()}@hotzonex.invalid`
  const password = crypto.randomUUID()
  const { data: created, error: createErr } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (createErr || !created.user) throw new Error(`Could not create test user: ${createErr?.message}`)

  const { error: roleErr } = await admin.from('profiles').update({ role: 'agent' }).eq('id', created.user.id)
  if (roleErr) throw new Error(`Could not promote test user: ${roleErr.message}`)

  const client = createClient<Database>(SUPABASE_URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  const { error: signInErr } = await client.auth.signInWithPassword({ email, password })
  if (signInErr) throw new Error(`Could not sign in: ${signInErr.message}`)

  try {
    const { data: plan } = await admin.from('service_plans').select('id, price_ssp').eq('is_active', true).limit(1).single()
    if (!plan) throw new Error('No active service plan seeded — cannot generate a voucher to test.')
    const { data: location } = await admin.from('locations').select('id').limit(1).single()
    if (!location) throw new Error('No seeded location — cannot generate a voucher to test.')

    const { data: batchId, error: batchErr } = await client.rpc('fn_generate_voucher_batch', {
      p_plan_id: plan.id,
      p_location_id: location.id,
      p_quantity: 1,
    })
    if (batchErr || !batchId) throw new Error(`Could not generate voucher batch: ${batchErr?.message}`)

    const { data: voucher } = await admin.from('vouchers').select('code').eq('batch_id', batchId).single()
    if (!voucher) throw new Error('Generated batch has no voucher row.')

    console.log(`Firing ${CONCURRENCY} concurrent sells against voucher ${voucher.code}…`)
    const attempts = await Promise.allSettled(
      Array.from({ length: CONCURRENCY }, () =>
        client.rpc('fn_sell_voucher', { p_code: voucher.code, p_price: plan.price_ssp }),
      ),
    )

    const succeeded = attempts.filter((a) => a.status === 'fulfilled' && !a.value.error)
    const failed = attempts.length - succeeded.length

    console.log(`Succeeded: ${succeeded.length} / ${attempts.length}`)
    console.log(`Failed/rejected: ${failed} / ${attempts.length}`)

    if (succeeded.length === 1) {
      console.log('RESULT: PASS — exactly one sell succeeded.')
      process.exit(0)
    } else {
      console.error(`RESULT: FAIL — expected exactly 1 success, got ${succeeded.length}.`)
      process.exit(1)
    }
  } finally {
    await admin.auth.admin.deleteUser(created.user.id)
  }
}

main().catch((err) => {
  console.error('Voucher concurrency test crashed:', err)
  process.exit(1)
})
