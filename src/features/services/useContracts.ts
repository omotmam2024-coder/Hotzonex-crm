import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

export interface ContractRow {
  id: string
  contract_code: string | null
  customer_id: string
  title: string
  monthly_amount: number
  currency: Database['public']['Enums']['currency_code']
  start_date: string
  end_date: string | null
  renewal_date: string | null
  auto_renew: boolean
  is_active: boolean
  created_at: string
  customers: { display_name: string | null } | null
}

export function useContracts(activeOnly = false) {
  return useQuery({
    queryKey: ['contracts', 'list', activeOnly],
    queryFn: async () => {
      let query = supabase
        .from('contracts')
        .select(
          'id, contract_code, customer_id, title, monthly_amount, currency, start_date, end_date, renewal_date, auto_renew, is_active, created_at, customers(display_name)',
        )
        .order('renewal_date', { ascending: true, nullsFirst: false })
      if (activeOnly) query = query.eq('is_active', true)
      const { data, error } = await query
      if (error) throw error
      return data as unknown as ContractRow[]
    },
    staleTime: 15_000,
  })
}
