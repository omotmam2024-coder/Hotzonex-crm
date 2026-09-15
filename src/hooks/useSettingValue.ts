import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useSettingValue<T>(key: string, fallback: T) {
  return useQuery({
    queryKey: ['settings', key],
    queryFn: async () => {
      const { data, error } = await supabase.from('settings').select('value').eq('key', key).maybeSingle()
      if (error) throw error
      return (data?.value as T) ?? fallback
    },
    staleTime: 5 * 60_000,
  })
}
