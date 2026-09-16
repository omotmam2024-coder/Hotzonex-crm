import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

export interface ReportFilters {
  from: string
  to: string
  businessUnit: Database['public']['Enums']['business_unit'] | 'all'
  locationId: string | 'all'
  ownerId: string | 'all'
}

export interface RevenueRow {
  id: string
  invoice_id: string
  business_unit: Database['public']['Enums']['business_unit']
  location_id: string | null
  location_name: string | null
  plan_id: string | null
  plan_name: string | null
  issue_date: string
  currency: Database['public']['Enums']['currency_code']
  line_total: number
  invoice_status: Database['public']['Enums']['invoice_status']
}

export interface VoucherSaleRow {
  id: string
  plan_id: string
  plan_name: string
  location_id: string | null
  location_name: string | null
  sold_at: string | null
  price_sold: number | null
  currency: Database['public']['Enums']['currency_code']
  status: Database['public']['Enums']['voucher_status']
}

export interface VoucherStockRow {
  plan_id: string
  plan_name: string
  location_id: string | null
  location_name: string | null
  available: number
  allocated: number
  sold: number
  reorder_level: number
}

export interface SubscriptionRow {
  id: string
  plan_id: string
  plan_name: string
  location_id: string | null
  location_name: string | null
  status: Database['public']['Enums']['subscription_status']
  start_date: string
  end_date: string
  monthly_fee: number
  currency: Database['public']['Enums']['currency_code']
  auto_renew: boolean
  created_at: string
}

export interface TicketReportRow {
  id: string
  business_unit: Database['public']['Enums']['business_unit']
  category_id: string | null
  category_name: string | null
  assigned_to: string | null
  assignee_name: string | null
  priority: Database['public']['Enums']['priority_level']
  status: Database['public']['Enums']['ticket_status']
  created_at: string
  first_response_at: string | null
  resolved_at: string | null
  response_minutes: number | null
  resolve_minutes: number | null
}

export interface DealReportRow {
  id: string
  business_unit: Database['public']['Enums']['business_unit']
  pipeline_id: string
  stage_id: string
  stage_name: string | null
  status: Database['public']['Enums']['deal_status']
  source: string | null
  owner_id: string | null
  owner_name: string | null
  value: number
  currency: Database['public']['Enums']['currency_code']
  created_at: string
  closed_at: string | null
}

export interface CustomerReportRow {
  id: string
  source: string | null
  business_units: Database['public']['Enums']['business_unit'][]
  status: Database['public']['Enums']['customer_status']
  created_at: string
}

export interface ResellerReportRow {
  id: string
  name: string
  location_id: string | null
  location_name: string | null
  commission_rate: number
  is_active: boolean
  vouchers_sold: number
  revenue: number
  total_commission: number
  total_paid: number
  commission_due: number
}

export interface InstallationReportRow {
  id: string
  job_type: string
  status: Database['public']['Enums']['installation_status']
  technician_id: string | null
  technician_name: string | null
  location_id: string | null
  location_name: string | null
  scheduled_at: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
  lead_time_hours: number | null
}

export function defaultReportFilters(daysBack = 90): ReportFilters {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - daysBack)
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
    businessUnit: 'all',
    locationId: 'all',
    ownerId: 'all',
  }
}

// Every report pushes its date range, unit, location and owner filters
// down to Postgres as real query predicates on the underlying view — only
// the final chart bucketing/rollup happens client-side (same shape as the
// Phase 3 aging report).

export function useRevenueReport(filters: ReportFilters) {
  return useQuery({
    queryKey: ['report', 'revenue', filters],
    queryFn: async () => {
      let q = supabase
        .from('v_report_revenue')
        .select('*')
        .gte('issue_date', filters.from)
        .lte('issue_date', filters.to)
        .neq('invoice_status', 'void')
        .limit(5000)
      if (filters.businessUnit !== 'all') q = q.eq('business_unit', filters.businessUnit)
      if (filters.locationId !== 'all') q = q.eq('location_id', filters.locationId)
      const { data, error } = await q
      if (error) throw error
      return data as unknown as RevenueRow[]
    },
  })
}

export function useVoucherSalesReport(filters: ReportFilters) {
  return useQuery({
    queryKey: ['report', 'voucher_sales', filters],
    queryFn: async () => {
      let q = supabase
        .from('v_report_voucher_sales')
        .select('*')
        .gte('sold_at', filters.from)
        .lte('sold_at', filters.to)
        .limit(5000)
      if (filters.locationId !== 'all') q = q.eq('location_id', filters.locationId)
      const { data, error } = await q
      if (error) throw error
      return data as unknown as VoucherSaleRow[]
    },
  })
}

export function useVoucherStockReport() {
  return useQuery({
    queryKey: ['report', 'voucher_stock'],
    queryFn: async () => {
      const { data, error } = await supabase.from('v_voucher_stock').select('*')
      if (error) throw error
      return data as unknown as VoucherStockRow[]
    },
    staleTime: 30_000,
  })
}

export function useSubscriptionsReport(filters: ReportFilters) {
  return useQuery({
    queryKey: ['report', 'subscriptions', filters],
    queryFn: async () => {
      let q = supabase
        .from('v_report_subscriptions')
        .select('*')
        .gte('created_at', filters.from)
        .lte('created_at', filters.to)
        .limit(5000)
      if (filters.locationId !== 'all') q = q.eq('location_id', filters.locationId)
      const { data, error } = await q
      if (error) throw error
      return data as unknown as SubscriptionRow[]
    },
  })
}

export function useTicketsReport(filters: ReportFilters) {
  return useQuery({
    queryKey: ['report', 'tickets', filters],
    queryFn: async () => {
      let q = supabase
        .from('v_report_tickets')
        .select('*')
        .gte('created_at', filters.from)
        .lte('created_at', filters.to)
        .limit(5000)
      if (filters.businessUnit !== 'all') q = q.eq('business_unit', filters.businessUnit)
      if (filters.ownerId !== 'all') q = q.eq('assigned_to', filters.ownerId)
      const { data, error } = await q
      if (error) throw error
      return data as unknown as TicketReportRow[]
    },
  })
}

export function useDealsReport(filters: ReportFilters) {
  return useQuery({
    queryKey: ['report', 'deals', filters],
    queryFn: async () => {
      let q = supabase
        .from('v_report_deals')
        .select('*')
        .gte('created_at', filters.from)
        .lte('created_at', filters.to)
        .limit(5000)
      if (filters.businessUnit !== 'all') q = q.eq('business_unit', filters.businessUnit)
      if (filters.ownerId !== 'all') q = q.eq('owner_id', filters.ownerId)
      const { data, error } = await q
      if (error) throw error
      return data as unknown as DealReportRow[]
    },
  })
}

export function useCustomersReport(filters: ReportFilters) {
  return useQuery({
    queryKey: ['report', 'customers', filters],
    queryFn: async () => {
      let q = supabase
        .from('v_report_customers')
        .select('*')
        .gte('created_at', filters.from)
        .lte('created_at', filters.to)
        .limit(5000)
      if (filters.businessUnit !== 'all') q = q.contains('business_units', [filters.businessUnit])
      const { data, error } = await q
      if (error) throw error
      return data as unknown as CustomerReportRow[]
    },
  })
}

export function useResellersReport() {
  return useQuery({
    queryKey: ['report', 'resellers'],
    queryFn: async () => {
      const { data, error } = await supabase.from('v_report_resellers').select('*')
      if (error) throw error
      return data as unknown as ResellerReportRow[]
    },
    staleTime: 30_000,
  })
}

export function useInstallationsReport(filters: ReportFilters) {
  return useQuery({
    queryKey: ['report', 'installations', filters],
    queryFn: async () => {
      let q = supabase
        .from('v_report_installations')
        .select('*')
        .gte('created_at', filters.from)
        .lte('created_at', filters.to)
        .limit(5000)
      if (filters.locationId !== 'all') q = q.eq('location_id', filters.locationId)
      if (filters.ownerId !== 'all') q = q.eq('technician_id', filters.ownerId)
      const { data, error } = await q
      if (error) throw error
      return data as unknown as InstallationReportRow[]
    },
  })
}
