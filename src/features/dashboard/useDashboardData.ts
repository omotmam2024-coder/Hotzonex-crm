import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

const CAP = 20

function isoDaysAgo(days: number) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

function isoDaysFromNow(days: number) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export interface MyTaskItem {
  id: string
  title: string
  due_at: string | null
  priority: string
}

/** Tasks assigned to me, open or in progress — the same universe My Day works from. */
export function useMyTasksSummary(userId: string | undefined) {
  return useQuery({
    queryKey: ['dashboard', 'my-tasks', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('id, title, due_at, priority')
        .eq('assigned_to', userId!)
        .in('status', ['open', 'in_progress'])
        .order('due_at', { ascending: true, nullsFirst: false })
        .limit(50)
      if (error) throw error
      const now = new Date()
      const todayEnd = new Date(now)
      todayEnd.setHours(23, 59, 59, 999)
      const overdue = data.filter((t) => t.due_at && new Date(t.due_at) < now)
      const dueToday = data.filter((t) => t.due_at && new Date(t.due_at) >= now && new Date(t.due_at) <= todayEnd)
      const items = [...overdue, ...dueToday].slice(0, 5) as MyTaskItem[]
      return { overdueCount: overdue.length, dueTodayCount: dueToday.length, items }
    },
    enabled: !!userId,
    staleTime: 30_000,
  })
}

export interface TicketAttentionItem {
  id: string
  ticket_number: string | null
  subject: string
  priority: string
  sla_resolve_due: string | null
}

/** Open tickets that have breached their resolution SLA or are urgent priority. */
export function useTicketsAttention() {
  return useQuery({
    queryKey: ['dashboard', 'tickets-attention'],
    queryFn: async () => {
      const nowIso = new Date().toISOString()
      const { data, error } = await supabase
        .from('tickets')
        .select('id, ticket_number, subject, priority, sla_resolve_due')
        .is('deleted_at', null)
        .not('status', 'in', '(resolved,closed)')
        .or(`sla_resolve_due.lt.${nowIso},priority.eq.urgent`)
        .order('sla_resolve_due', { ascending: true, nullsFirst: false })
        .limit(CAP)
      if (error) throw error
      return { count: data.length, capped: data.length === CAP, items: data.slice(0, 5) as TicketAttentionItem[] }
    },
    staleTime: 30_000,
  })
}

export type CurrencyTotals = Partial<Record<'SSP' | 'USD', number>>

/**
 * Invoices genuinely overdue (due before today, not void/paid/draft) — the
 * same rule as v_invoice_aging's "not current" buckets, but queried
 * straight from invoices rather than the view so currency comes along too:
 * summing SSP and USD outstanding into one number and labeling it "SSP"
 * would just be wrong once any USD invoice exists, so totals stay grouped
 * by currency for the caller to format separately.
 */
export function useOverdueInvoices() {
  return useQuery({
    queryKey: ['dashboard', 'overdue-invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('id, total, amount_paid, currency')
        .is('deleted_at', null)
        .not('status', 'in', '(void,paid,draft)')
        .lt('due_date', todayISO())
        .limit(200)
      if (error) throw error
      const totals: CurrencyTotals = {}
      for (const r of data) {
        totals[r.currency] = (totals[r.currency] ?? 0) + (r.total - r.amount_paid)
      }
      return { count: data.length, capped: data.length === 200, totals }
    },
    staleTime: 30_000,
  })
}

export interface StockAlertItem {
  plan_name: string
  location_name: string | null
  available: number
  reorder_level: number
}

/** Voucher plans below their reorder level — same rule as the Vouchers page's own low-stock banner. */
export function useLowVoucherStock(enabled: boolean) {
  return useQuery({
    queryKey: ['dashboard', 'low-voucher-stock'],
    queryFn: async () => {
      const { data, error } = await supabase.from('v_voucher_stock').select('plan_name, location_name, available, reorder_level')
      if (error) throw error
      const low = (data as StockAlertItem[]).filter((r) => r.available < r.reorder_level)
      return { count: low.length, items: low.slice(0, 5) }
    },
    enabled,
    staleTime: 60_000,
  })
}

export interface ExpiringSubscriptionItem {
  id: string
  display_name: string | null
  plan_name: string | null
  end_date: string | null
  days_left: number | null
}

/** Subscriptions expiring within 7 days — v_subscriptions_expiring already applies that window. */
export function useSubscriptionsExpiring(enabled: boolean) {
  return useQuery({
    queryKey: ['dashboard', 'subscriptions-expiring'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_subscriptions_expiring')
        .select('id, display_name, plan_name, end_date, days_left')
        .order('days_left', { ascending: true })
        .limit(CAP)
      if (error) throw error
      return { count: data.length, capped: data.length === CAP, items: data.slice(0, 5) as ExpiringSubscriptionItem[] }
    },
    enabled,
    staleTime: 60_000,
  })
}

export interface RenewingContractItem {
  id: string
  title: string
  renewal_date: string | null
  monthly_amount: number
  currency: string
}

/** Active contracts renewing within 30 days. */
export function useContractsRenewing(enabled: boolean) {
  return useQuery({
    queryKey: ['dashboard', 'contracts-renewing'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contracts')
        .select('id, title, renewal_date, monthly_amount, currency')
        .eq('is_active', true)
        .gte('renewal_date', todayISO())
        .lte('renewal_date', isoDaysFromNow(30))
        .order('renewal_date', { ascending: true })
        .limit(CAP)
      if (error) throw error
      return { count: data.length, capped: data.length === CAP, items: data.slice(0, 5) as RenewingContractItem[] }
    },
    enabled,
    staleTime: 60_000,
  })
}

export interface UpcomingBookingItem {
  id: string
  event_type: string
  event_date: string
  guests_count: number
  status: string
}

/** Tentative/confirmed bookings in the next 7 days. */
export function useBookingsThisWeek(enabled: boolean) {
  return useQuery({
    queryKey: ['dashboard', 'bookings-this-week'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('id, event_type, event_date, guests_count, status')
        .is('deleted_at', null)
        .in('status', ['tentative', 'confirmed'])
        .gte('event_date', todayISO())
        .lte('event_date', isoDaysFromNow(7))
        .order('event_date', { ascending: true })
        .limit(CAP)
      if (error) throw error
      return { count: data.length, capped: data.length === CAP, items: data.slice(0, 5) as UpcomingBookingItem[] }
    },
    enabled,
    staleTime: 60_000,
  })
}

/**
 * Cash collected in the last 7 days — naturally scoped to what the
 * viewer's own RLS lets them see. Grouped by currency for the same reason
 * as overdue invoices: SSP and USD payments can't be added together.
 */
export function useRevenueThisWeek() {
  return useQuery({
    queryKey: ['dashboard', 'revenue-week'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('amount, currency')
        .is('deleted_at', null)
        .gte('received_at', isoDaysAgo(7))
        .limit(500)
      if (error) throw error
      const totals: CurrencyTotals = {}
      for (const r of data) {
        totals[r.currency] = (totals[r.currency] ?? 0) + r.amount
      }
      return totals
    },
    staleTime: 30_000,
  })
}

/** New customers added in the last 7 days — a plain count, no row payload. */
export function useNewCustomersThisWeek() {
  return useQuery({
    queryKey: ['dashboard', 'new-customers-week'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('customers')
        .select('id', { count: 'exact', head: true })
        .is('deleted_at', null)
        .gte('created_at', isoDaysAgo(7))
      if (error) throw error
      return count ?? 0
    },
    staleTime: 30_000,
  })
}
