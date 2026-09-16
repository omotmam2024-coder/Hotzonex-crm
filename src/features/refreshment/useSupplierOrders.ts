import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

export interface SupplierOrderItem {
  name: string
  quantity: number
  unit_price: number
}

export interface SupplierOrderRow {
  id: string
  order_code: string | null
  supplier_id: string
  order_date: string
  expected_date: string | null
  received_date: string | null
  status: Database['public']['Enums']['supplier_order_status']
  items: SupplierOrderItem[]
  total: number
  currency: Database['public']['Enums']['currency_code']
  amount_paid: number
  created_at: string
  suppliers: { name: string } | null
}

export function useSupplierOrders() {
  return useQuery({
    queryKey: ['supplier_orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('supplier_orders')
        .select('id, order_code, supplier_id, order_date, expected_date, received_date, status, items, total, currency, amount_paid, created_at, suppliers(name)')
        .order('order_date', { ascending: false })
        .limit(100)
      if (error) throw error
      return data as unknown as SupplierOrderRow[]
    },
    staleTime: 15_000,
  })
}
