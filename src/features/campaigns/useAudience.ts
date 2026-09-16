import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

export interface AudienceFilter {
  businessUnit?: Database['public']['Enums']['business_unit'] | null
  customerStatus?: Database['public']['Enums']['customer_status'] | null
  tag?: string | null
  locationId?: string | null
  subscriptionStatus?: Database['public']['Enums']['subscription_status'] | null
}

export interface AudienceMember {
  id: string
  display_name: string | null
  phone_primary: string
  whatsapp: string | null
}

/** Opted-out customers are excluded from every campaign audience, always. */
function buildAudienceQuery(filter: AudienceFilter, opts: { countOnly?: boolean } = {}) {
  const selectCols = opts.countOnly ? 'id' : 'id, display_name, phone_primary, whatsapp'
  const selectExpr = filter.subscriptionStatus ? `${selectCols}, subscriptions!inner(status)` : selectCols
  let query = supabase
    .from('customers')
    .select(selectExpr, opts.countOnly ? { count: 'exact', head: true } : undefined)

  query = query.eq('opted_out', false)
  if (filter.businessUnit) query = query.contains('business_units', [filter.businessUnit])
  if (filter.customerStatus) query = query.eq('status', filter.customerStatus)
  if (filter.tag) query = query.contains('tags', [filter.tag])
  if (filter.locationId) query = query.eq('location_id', filter.locationId)
  if (filter.subscriptionStatus) query = query.eq('subscriptions.status', filter.subscriptionStatus)

  return query
}

// Re-evaluated every time it's called (creation preview, and again at send
// time) — the audience is never frozen into a stored recipient list.
export function useAudiencePreview(filter: AudienceFilter) {
  return useQuery({
    queryKey: ['audience', 'preview', filter],
    queryFn: async () => {
      const { error, count } = await buildAudienceQuery(filter, { countOnly: true })
      if (error) throw error
      return count ?? 0
    },
    staleTime: 10_000,
  })
}

export function useAudienceMembers(filter: AudienceFilter, enabled: boolean) {
  return useQuery({
    queryKey: ['audience', 'members', filter],
    queryFn: async () => {
      const { data, error } = await buildAudienceQuery(filter).limit(500)
      if (error) throw error
      return data as unknown as AudienceMember[]
    },
    enabled,
  })
}
