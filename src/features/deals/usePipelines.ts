import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function usePipelines() {
  return useQuery({
    queryKey: ['pipelines'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pipelines')
        .select('id, name, business_unit, is_default, pipeline_stages(id, name, sort_order, probability, is_won, is_lost)')
        .order('business_unit')
      if (error) throw error
      return data.map((p) => ({
        ...p,
        pipeline_stages: [...p.pipeline_stages].sort((a, b) => a.sort_order - b.sort_order),
      }))
    },
    staleTime: 5 * 60_000,
  })
}
