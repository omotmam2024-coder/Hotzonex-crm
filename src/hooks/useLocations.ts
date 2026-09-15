import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useLocations(activeOnly = true) {
  return useQuery({
    queryKey: ['locations', activeOnly],
    queryFn: async () => {
      let q = supabase.from('locations').select('id, name').order('name')
      if (activeOnly) q = q.eq('is_active', true)
      const { data, error } = await q
      if (error) throw error
      return data
    },
    staleTime: 5 * 60_000,
  })
}
