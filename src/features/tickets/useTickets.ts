import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

export const TICKETS_PAGE_SIZE = 25

export type TicketStatus = Database['public']['Enums']['ticket_status']
export type TicketPriority = Database['public']['Enums']['priority_level']

export interface TicketsFilters {
  search: string
  status: TicketStatus | 'all'
  priority: TicketPriority | 'all'
  assignedTo: string | 'all'
  businessUnit: Database['public']['Enums']['business_unit'] | 'all'
}

export interface TicketRow {
  id: string
  ticket_number: string | null
  subject: string
  customer_id: string | null
  business_unit: Database['public']['Enums']['business_unit']
  category_id: string | null
  channel: Database['public']['Enums']['ticket_channel']
  priority: TicketPriority
  status: TicketStatus
  assigned_to: string | null
  location_id: string | null
  sla_response_due: string | null
  sla_resolve_due: string | null
  first_response_at: string | null
  resolved_at: string | null
  created_at: string
  customers: { display_name: string | null; phone_primary: string } | null
  ticket_categories: { name: string } | null
}

// Select only what the list/board render — never select('*') on a list view.
const LIST_COLUMNS =
  'id, ticket_number, subject, customer_id, business_unit, category_id, channel, priority, status, assigned_to, location_id, sla_response_due, sla_resolve_due, first_response_at, resolved_at, created_at, customers(display_name, phone_primary), ticket_categories(name)'

export function useTickets(filters: TicketsFilters, page: number) {
  return useQuery({
    queryKey: ['tickets', 'list', filters, page],
    queryFn: async () => {
      let query = supabase
        .from('tickets')
        .select(LIST_COLUMNS, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * TICKETS_PAGE_SIZE, page * TICKETS_PAGE_SIZE - 1)

      if (filters.search.trim()) {
        const term = filters.search.trim()
        query = query.or(`subject.ilike.%${term}%,ticket_number.ilike.%${term}%`)
      }
      if (filters.status !== 'all') query = query.eq('status', filters.status)
      if (filters.priority !== 'all') query = query.eq('priority', filters.priority)
      if (filters.assignedTo === '__none') query = query.is('assigned_to', null)
      else if (filters.assignedTo !== 'all') query = query.eq('assigned_to', filters.assignedTo)
      if (filters.businessUnit !== 'all') query = query.eq('business_unit', filters.businessUnit)

      const { data, error, count } = await query
      if (error) throw error
      return { rows: data as unknown as TicketRow[], total: count ?? 0 }
    },
    staleTime: 15_000,
  })
}

// The board groups every open ticket by status in one screen, so it bypasses
// pagination (capped at a generous limit — a board with 500 open tickets
// needs triage, not more rows).
export function useTicketsBoard(businessUnit: Database['public']['Enums']['business_unit'] | 'all') {
  return useQuery({
    queryKey: ['tickets', 'board', businessUnit],
    queryFn: async () => {
      let query = supabase
        .from('tickets')
        .select(LIST_COLUMNS)
        .neq('status', 'closed')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(500)
      if (businessUnit !== 'all') query = query.eq('business_unit', businessUnit)
      const { data, error } = await query
      if (error) throw error
      return data as unknown as TicketRow[]
    },
    staleTime: 15_000,
  })
}

export function useTicketCategories() {
  return useQuery({
    queryKey: ['ticket_categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticket_categories')
        .select('id, name, business_unit, default_priority')
        .eq('is_active', true)
        .order('name')
      if (error) throw error
      return data
    },
    staleTime: 5 * 60_000,
  })
}
