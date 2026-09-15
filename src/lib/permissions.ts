// Frontend permission helper — UI convenience only. This never substitutes
// for RLS: every table enforces its own policies, so a hostile client that
// ignores this file entirely still cannot read or write past what its role
// and scope allow.

export type UserRole = 'owner' | 'admin' | 'manager' | 'agent' | 'technician' | 'viewer'
export type BusinessUnit = 'wifi' | 'services' | 'refreshment'

export interface AuthProfile {
  id: string
  role: UserRole
  business_units: BusinessUnit[]
  location_ids: string[]
}

export type Action =
  | 'view'
  | 'create'
  | 'edit'
  | 'delete'
  | 'void'
  | 'purge'
  | 'approve_discount'
  | 'manage_users'
  | 'manage_settings'
  | 'export'

export type Resource =
  | 'customer'
  | 'deal'
  | 'ticket'
  | 'invoice'
  | 'payment'
  | 'voucher'
  | 'subscription'
  | 'installation'
  | 'project'
  | 'booking'
  | 'campaign'
  | 'report'
  | 'settings'
  | 'user'

const ROLE_RANK: Record<UserRole, number> = {
  viewer: 0,
  technician: 1,
  agent: 2,
  manager: 3,
  admin: 4,
  owner: 5,
}

function atLeast(role: UserRole, min: UserRole) {
  return ROLE_RANK[role] >= ROLE_RANK[min]
}

/** UI-level gate. Hides/shows controls; the database is the real boundary. */
export function can(profile: AuthProfile | null, action: Action, _resource?: Resource): boolean {
  if (!profile) return false

  switch (action) {
    case 'view':
    case 'export':
      return true
    case 'purge':
      return profile.role === 'owner'
    case 'manage_users':
      return atLeast(profile.role, 'admin')
    case 'manage_settings':
      return atLeast(profile.role, 'admin')
    case 'approve_discount':
    case 'void':
      return atLeast(profile.role, 'manager')
    case 'create':
    case 'edit':
      return profile.role !== 'viewer'
    case 'delete':
      return atLeast(profile.role, 'admin')
    default:
      return false
  }
}

export function canSeeUnit(profile: AuthProfile | null, unit: BusinessUnit): boolean {
  if (!profile) return false
  if (profile.role === 'owner' || profile.role === 'admin') return true
  return profile.business_units.includes(unit)
}

export function isReadOnly(profile: AuthProfile | null): boolean {
  return profile?.role === 'viewer'
}
