/**
 * Money integrity test (§9.2 of the build spec).
 *
 * Creates an invoice with 3 lines, applies a partial payment, then the
 * balance — asserts status transitions sent → partial → paid and that
 * `total`/`amount_paid` match the line maths to the cent.
 *
 * This test caught a real bug during Phase 6 hardening: the CASE
 * expression assigning `invoices.status` in fn_recalc_invoice resolved to
 * `text` rather than the `invoice_status` enum (Postgres has no implicit
 * cast from text to a user-defined enum), so any invoice with more than
 * one line item failed outright. Fixed in migration
 * 0008_fn_recalc_invoice_enum_cast_fix.sql — this script is what should
 * catch it if it, or something like it, ever comes back.
 *
 * Runs the actual invoice/payment writes through a real authenticated
 * session (a throwaway admin-role test user), the same as a signed-in
 * agent would — not through the service_role key, since fn_record_payment
 * gates on can_write(), which reads auth.uid() from a real JWT session,
 * not from the service_role key alone.
 *
 *   SUPABASE_URL=... SUPABASE_ANON_KEY=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     npm run test:money
 */
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../src/types/database'

const SUPABASE_URL = requireEnv('SUPABASE_URL')
const ANON_KEY = requireEnv('SUPABASE_ANON_KEY')
const SERVICE_ROLE_KEY = requireEnv('SUPABASE_SERVICE_ROLE_KEY')

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    console.error(`Missing required env var ${name}. See scripts/money-integrity-test.ts header for usage.`)
    process.exit(1)
  }
  return value
}

const admin = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

function assertEqual(actual: unknown, expected: unknown, message: string) {
  if (actual !== expected) throw new Error(`${message} — got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`)
  console.log(`  ✅ ${message}`)
}

async function main() {
  const email = `money-integrity-test-${Date.now()}@hotzonex.invalid`
  const password = crypto.randomUUID()
  const { data: created, error: createErr } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (createErr || !created.user) throw new Error(`Could not create test user: ${createErr?.message}`)

  // 'admin' so RLS visibility and can_write() are never in question — this
  // test is about the money maths, not the access-control matrix (that's
  // rls-test.ts's job).
  const { error: roleErr } = await admin.from('profiles').update({ role: 'admin' }).eq('id', created.user.id)
  if (roleErr) throw new Error(`Could not promote test user: ${roleErr.message}`)

  const client = createClient<Database>(SUPABASE_URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  const { error: signInErr } = await client.auth.signInWithPassword({ email, password })
  if (signInErr) throw new Error(`Could not sign in: ${signInErr.message}`)

  const phone = `+2119${Date.now().toString().slice(-8)}`
  const { data: customer, error: customerErr } = await client
    .from('customers')
    .insert({ full_name: 'Money Integrity Test', phone_primary: phone, business_units: ['wifi'] })
    .select('id')
    .single()
  if (customerErr || !customer) throw new Error(`Could not create fixture customer: ${customerErr.message}`)

  try {
    const { data: invoice, error: invoiceErr } = await client
      .from('invoices')
      .insert({ customer_id: customer.id, business_unit: 'wifi', status: 'sent' })
      .select('id')
      .single()
    if (invoiceErr || !invoice) throw new Error(`Could not create fixture invoice: ${invoiceErr.message}`)

    const { error: itemsErr } = await client.from('invoice_items').insert([
      { invoice_id: invoice.id, description: 'Line 1', quantity: 1, unit_price: 100.0 },
      { invoice_id: invoice.id, description: 'Line 2', quantity: 1, unit_price: 250.5 },
      { invoice_id: invoice.id, description: 'Line 3', quantity: 1, unit_price: 49.99 },
    ])
    if (itemsErr) throw new Error(`Could not insert line items (this is exactly what the enum-cast bug broke): ${itemsErr.message}`)

    console.log('After 3 line items (100 + 250.50 + 49.99 = 400.49):')
    const after1 = await client.from('invoices').select('status, subtotal, total, amount_paid').eq('id', invoice.id).single()
    assertEqual(after1.data?.subtotal, 400.49, 'subtotal is 400.49')
    assertEqual(after1.data?.total, 400.49, 'total is 400.49')
    assertEqual(after1.data?.status, 'sent', 'status stays sent')
    assertEqual(after1.data?.amount_paid, 0, 'amount_paid is 0')

    console.log('After a partial payment of 150.00:')
    const { error: pay1Err } = await client.rpc('fn_record_payment', {
      p_customer_id: customer.id,
      p_amount: 150.0,
      p_method: 'cash',
      p_allocations: [{ invoice_id: invoice.id, amount: 150.0 }],
    })
    if (pay1Err) throw new Error(`Partial payment failed: ${pay1Err.message}`)
    const after2 = await client.from('invoices').select('status, amount_paid').eq('id', invoice.id).single()
    assertEqual(after2.data?.status, 'partial', 'status is partial')
    assertEqual(after2.data?.amount_paid, 150.0, 'amount_paid is 150.00')

    console.log('After the final payment of 250.49:')
    const { error: pay2Err } = await client.rpc('fn_record_payment', {
      p_customer_id: customer.id,
      p_amount: 250.49,
      p_method: 'cash',
      p_allocations: [{ invoice_id: invoice.id, amount: 250.49 }],
    })
    if (pay2Err) throw new Error(`Final payment failed: ${pay2Err.message}`)
    const after3 = await client.from('invoices').select('status, amount_paid, total').eq('id', invoice.id).single()
    assertEqual(after3.data?.status, 'paid', 'status is paid')
    assertEqual(after3.data?.amount_paid, after3.data?.total, 'amount_paid equals total to the cent')

    console.log('\nRESULT: PASS — sent → partial → paid, totals exact to the cent.')
    process.exit(0)
  } finally {
    const { data: payments } = await admin.from('payments').select('id').eq('customer_id', customer.id)
    if (payments && payments.length > 0) {
      await admin.from('payment_allocations').delete().in('payment_id', payments.map((p) => p.id))
      await admin.from('payments').delete().eq('customer_id', customer.id)
    }
    await admin.from('invoices').delete().eq('customer_id', customer.id)
    await admin.from('customers').delete().eq('id', customer.id)
    await admin.auth.admin.deleteUser(created.user.id)
  }
}

main().catch((err) => {
  console.error('\nRESULT: FAIL —', err.message)
  process.exit(1)
})
