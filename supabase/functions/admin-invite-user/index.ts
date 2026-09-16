// Invites a new staff account by email. Runs with the service_role key
// (never exposed to the browser) because creating an auth.users row isn't
// possible from the anon-key client — this is the one place in the app that
// needs it.
//
// Authorization is checked inside the function, not just by verify_jwt: the
// caller's JWT proves *who* they are, this function still has to prove
// they're allowed to invite staff (admin/owner only) before touching
// anything, the same as every other privileged action in this app being
// gated by can_write()/is_admin() rather than trusting the client.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const ROLES = ['admin', 'manager', 'agent', 'technician', 'viewer'] as const
const UNITS = ['wifi', 'services', 'refreshment'] as const

// The app (on vercel.app) and this function (on supabase.co) are different
// origins, so supabase-js's functions.invoke() always sends a CORS preflight
// OPTIONS request first — without these headers the browser blocks the real
// POST from ever going out, and the invite silently fails client-side.
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Missing Authorization header' }, 401)

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  const { data: callerData, error: callerErr } = await admin.auth.getUser(authHeader.replace('Bearer ', ''))
  if (callerErr || !callerData.user) return json({ error: 'Invalid session' }, 401)

  const { data: callerProfile } = await admin.from('profiles').select('role').eq('id', callerData.user.id).single()
  if (!callerProfile || !['owner', 'admin'].includes(callerProfile.role)) {
    return json({ error: 'Only an admin or owner can invite staff' }, 403)
  }

  let body: {
    email?: string
    full_name?: string
    role?: string
    business_units?: string[]
    location_ids?: string[]
  }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const email = body.email?.trim().toLowerCase()
  if (!email || !email.includes('@')) return json({ error: 'A valid email is required' }, 400)

  const fullName = body.full_name?.trim() || undefined
  const role = ROLES.includes(body.role as (typeof ROLES)[number]) ? body.role! : 'viewer'
  const requestedUnits = Array.isArray(body.business_units)
    ? body.business_units.filter((u): u is (typeof UNITS)[number] => (UNITS as readonly string[]).includes(u))
    : []
  // An empty selection would leave the account unable to see any
  // unit-scoped row at all (row_visible treats "no overlap" as invisible) —
  // fall back to every unit, matching the profiles table's own default.
  const businessUnits = requestedUnits.length > 0 ? requestedUnits : [...UNITS]
  const locationIds = Array.isArray(body.location_ids) ? body.location_ids.filter((id) => typeof id === 'string') : []

  const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
    data: fullName ? { full_name: fullName } : undefined,
  })
  if (inviteErr || !invited.user) {
    return json({ error: inviteErr?.message ?? 'Could not send invite' }, 400)
  }

  // The signup trigger (handle_new_user) already inserted a default
  // 'viewer' profile row synchronously as part of the auth.users insert —
  // apply the role/scoping the admin actually chose.
  const { error: updateErr } = await admin
    .from('profiles')
    .update({ role, business_units: businessUnits, location_ids: locationIds })
    .eq('id', invited.user.id)
  if (updateErr) {
    return json({ error: `Invite sent but could not set role/scope: ${updateErr.message}` }, 500)
  }

  return json({ user_id: invited.user.id })
})
