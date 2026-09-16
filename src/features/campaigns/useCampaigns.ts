import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'
import type { AudienceFilter } from './useAudience'

export interface CampaignRow {
  id: string
  name: string
  business_unit: Database['public']['Enums']['business_unit']
  channel: Database['public']['Enums']['message_channel']
  template_id: string | null
  audience_filter: AudienceFilter
  status: Database['public']['Enums']['campaign_status']
  budget: number
  currency: Database['public']['Enums']['currency_code']
  created_at: string
  message_templates: { name: string } | null
}

export function useCampaigns() {
  return useQuery({
    queryKey: ['campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaigns')
        .select('id, name, business_unit, channel, template_id, audience_filter, status, budget, currency, created_at, message_templates(name)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as unknown as CampaignRow[]
    },
    staleTime: 15_000,
  })
}
