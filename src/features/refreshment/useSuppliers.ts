import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export const SUPPLIER_CATEGORIES = ['beverages', 'food', 'gas', 'consumables', 'other']

export function useSuppliers(activeOnly = false) {
  return useQuery({
    queryKey: ['suppliers', activeOnly],
    queryFn: async () => {
      let q = supabase
        .from('suppliers')
        .select('id, name, category, phone, email, payment_terms, is_active')
        .order('name')
      if (activeOnly) q = q.eq('is_active', true)
      const { data, error } = await q
      if (error) throw error
      return data
    },
    staleTime: 60_000,
  })
}
