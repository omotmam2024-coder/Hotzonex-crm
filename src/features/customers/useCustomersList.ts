import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

export interface CustomersFilters {
  search: string
  businessUnit: Database['public']['Enums']['business_unit'] | 'all'
  status: Database['public']['Enums']['customer_status'] | 'all'
  locationId: string | 'all'
  ownerId: string | 'all'
  tag: string | 'all'
}

export const CUSTOMERS_PAGE_SIZE = 25

// Select only what the list row renders — never select('*') on a list view.
const LIST_COLUMNS =
  'id, customer_code, display_name, full_name, business_name, phone_primary, whatsapp, type, status, business_units, location_id, owner_id, tags, created_at'

export function useCustomersList(filters: CustomersFilters, page: number) {
  return useQuery({
    queryKey: ['customers', 'list', filters, page],
    queryFn: async () => {
      let query = supabase
        .from('customers')
        .select(LIST_COLUMNS, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * CUSTOMERS_PAGE_SIZE, page * CUSTOMERS_PAGE_SIZE - 1)

      if (filters.search.trim()) {
        const term = filters.search.trim()
        query = query.or(
          `display_name.ilike.%${term}%,phone_primary.ilike.%${term}%,customer_code.ilike.%${term}%,email.ilike.%${term}%`,
        )
      }
      if (filters.businessUnit !== 'all') {
        query = query.contains('business_units', [filters.businessUnit])
      }
      if (filters.status !== 'all') {
        query = query.eq('status', filters.status)
      }
      if (filters.locationId !== 'all') {
        query = query.eq('location_id', filters.locationId)
      }
      if (filters.ownerId !== 'all') {
        query = query.eq('owner_id', filters.ownerId)
      }
      if (filters.tag !== 'all') {
        query = query.contains('tags', [filters.tag])
      }

      const { data, error, count } = await query
      if (error) throw error
      return { rows: data, total: count ?? 0 }
    },
    staleTime: 60_000,
  })
}
