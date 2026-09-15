import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useResellers(activeOnly = false) {
  return useQuery({
    queryKey: ['resellers', activeOnly],
    queryFn: async () => {
      let q = supabase.from('resellers').select('id, name, phone, commission_rate, is_active').order('name')
      if (activeOnly) q = q.eq('is_active', true)
      const { data, error } = await q
      if (error) throw error
      return data
    },
    staleTime: 60_000,
  })
}
