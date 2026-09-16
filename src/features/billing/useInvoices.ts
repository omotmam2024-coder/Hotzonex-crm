import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

export const INVOICES_PAGE_SIZE = 25

export type InvoiceStatus = Database['public']['Enums']['invoice_status']

export interface InvoicesFilters {
  search: string
  status: InvoiceStatus | 'all'
  businessUnit: Database['public']['Enums']['business_unit'] | 'all'
  customerId?: string
}

export interface InvoiceRow {
  id: string
  invoice_number: string | null
  customer_id: string
  business_unit: Database['public']['Enums']['business_unit']
  issue_date: string
  due_date: string
  currency: Database['public']['Enums']['currency_code']
  subtotal: number
  discount: number
  tax: number
  total: number
  amount_paid: number
  status: InvoiceStatus
  created_at: string
  customers: { display_name: string | null; phone_primary: string } | null
}

// Never select('*') on a list view — only what the row renders.
const LIST_COLUMNS =
  'id, invoice_number, customer_id, business_unit, issue_date, due_date, currency, subtotal, discount, tax, total, amount_paid, status, created_at, customers(display_name, phone_primary)'

export function useInvoices(filters: InvoicesFilters, page: number) {
  return useQuery({
    queryKey: ['invoices', 'list', filters, page],
    queryFn: async () => {
      let query = supabase
        .from('invoices')
        .select(LIST_COLUMNS, { count: 'exact' })
        .order('issue_date', { ascending: false })
        .range((page - 1) * INVOICES_PAGE_SIZE, page * INVOICES_PAGE_SIZE - 1)

      if (filters.search.trim()) query = query.ilike('invoice_number', `%${filters.search.trim()}%`)
      if (filters.status !== 'all') query = query.eq('status', filters.status)
      if (filters.businessUnit !== 'all') query = query.eq('business_unit', filters.businessUnit)
      if (filters.customerId) query = query.eq('customer_id', filters.customerId)

      const { data, error, count } = await query
      if (error) throw error
      return { rows: data as unknown as InvoiceRow[], total: count ?? 0 }
    },
    staleTime: 15_000,
  })
}

export interface InvoiceItemRow {
  id: string
  invoice_id: string
  plan_id: string | null
  description: string
  quantity: number
  unit_price: number
  discount: number
  line_total: number
  sort_order: number
}

export function useInvoiceDetail(invoiceId: string | null) {
  return useQuery({
    queryKey: ['invoices', 'detail', invoiceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('*, customers(display_name, phone_primary)')
        .eq('id', invoiceId!)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!invoiceId,
  })
}

export function useInvoiceItems(invoiceId: string | null) {
  return useQuery({
    queryKey: ['invoice_items', invoiceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', invoiceId!)
        .order('sort_order')
      if (error) throw error
      return data as InvoiceItemRow[]
    },
    enabled: !!invoiceId,
  })
}

export interface AgingRow {
  id: string
  invoice_number: string | null
  customer_id: string
  business_unit: Database['public']['Enums']['business_unit']
  due_date: string
  total: number
  amount_paid: number
  currency: Database['public']['Enums']['currency_code']
  customers: { display_name: string | null } | null
}

export function useAgingReport(businessUnit: Database['public']['Enums']['business_unit'] | 'all') {
  return useQuery({
    queryKey: ['invoices', 'aging', businessUnit],
    queryFn: async () => {
      let query = supabase
        .from('invoices')
        .select('id, invoice_number, customer_id, business_unit, due_date, total, amount_paid, currency, customers(display_name)')
        .not('status', 'in', '(void,paid,draft)')
        .order('due_date')
      if (businessUnit !== 'all') query = query.eq('business_unit', businessUnit)
      const { data, error } = await query
      if (error) throw error
      return data as unknown as AgingRow[]
    },
    staleTime: 30_000,
  })
}

export function useCustomerOpenInvoices(customerId: string | null) {
  return useQuery({
    queryKey: ['invoices', 'open', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('id, invoice_number, total, amount_paid, currency, due_date, status')
        .eq('customer_id', customerId!)
        .not('status', 'in', '(void,paid,draft)')
        .order('due_date')
      if (error) throw error
      return data
    },
    enabled: !!customerId,
  })
}
