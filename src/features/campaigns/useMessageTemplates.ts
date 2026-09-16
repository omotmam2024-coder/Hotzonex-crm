import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useMessageTemplates(activeOnly = false) {
  return useQuery({
    queryKey: ['message_templates', activeOnly],
    queryFn: async () => {
      let q = supabase.from('message_templates').select('id, name, channel, language, body, is_active').order('name')
      if (activeOnly) q = q.eq('is_active', true)
      const { data, error } = await q
      if (error) throw error
      return data
    },
    staleTime: 60_000,
  })
}
