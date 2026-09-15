import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

export interface DealRow {
  id: string
  deal_code: string | null
  title: string
  customer_id: string
  stage_id: string
  business_unit: Database['public']['Enums']['business_unit']
  value: number
  currency: Database['public']['Enums']['currency_code']
  status: Database['public']['Enums']['deal_status']
  expected_close: string | null
  owner_id: string | null
  last_activity_at: string | null
  customers: { display_name: string | null } | null
}

export function useDealsByUnit(businessUnit: Database['public']['Enums']['business_unit']) {
  return useQuery({
    queryKey: ['deals', 'byUnit', businessUnit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deals')
        .select(
          'id, deal_code, title, customer_id, stage_id, business_unit, value, currency, status, expected_close, owner_id, last_activity_at, customers(display_name)',
        )
        .eq('business_unit', businessUnit)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as unknown as DealRow[]
    },
    staleTime: 30_000,
  })
}

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
