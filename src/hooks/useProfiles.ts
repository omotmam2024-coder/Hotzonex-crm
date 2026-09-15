import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

/** Active staff for owner/assignee pickers. Small table, safe to load in full. */
export function useProfiles() {
  return useQuery({
    queryKey: ['profiles', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .eq('is_active', true)
        .order('full_name')
      if (error) throw error
      return data
    },
    staleTime: 5 * 60_000,
  })
}
