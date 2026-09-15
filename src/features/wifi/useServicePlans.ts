import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useServicePlans(activeOnly = false) {
  return useQuery({
    queryKey: ['service_plans', activeOnly],
    queryFn: async () => {
      let q = supabase
        .from('service_plans')
        .select('id, name, code, price_ssp, price_usd, duration_hours, duration_days, device_limit, reorder_level, is_active')
        .order('price_ssp')
      if (activeOnly) q = q.eq('is_active', true)
      const { data, error } = await q
      if (error) throw error
      return data
    },
    staleTime: 60_000,
  })
}
