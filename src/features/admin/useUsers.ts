import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useUsers() {
  return useQuery({
    queryKey: ['profiles', 'admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, role, business_units, location_ids, is_active, last_seen_at, created_at')
        .order('created_at')
      if (error) throw error
      return data
    },
    staleTime: 30_000,
  })
}
