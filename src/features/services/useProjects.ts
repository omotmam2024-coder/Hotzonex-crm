import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

export const PROJECTS_PAGE_SIZE = 25

export type ProjectStatus = Database['public']['Enums']['project_status']

export interface ProjectsFilters {
  search: string
  status: ProjectStatus | 'all'
  ownerId: string | 'all'
}

export interface ProjectRow {
  id: string
  project_code: string | null
  customer_id: string
  deal_id: string | null
  name: string
  project_type: string
  status: ProjectStatus
  start_date: string | null
  due_date: string | null
  budget: number
  currency: Database['public']['Enums']['currency_code']
  progress_pct: number
  owner_id: string | null
  created_at: string
  customers: { display_name: string | null } | null
}

// Never select('*') on a list view — only what the board/list render.
const LIST_COLUMNS =
  'id, project_code, customer_id, deal_id, name, project_type, status, start_date, due_date, budget, currency, progress_pct, owner_id, created_at, customers(display_name)'

export function useProjectsBoard(filters: ProjectsFilters) {
  return useQuery({
    queryKey: ['projects', 'board', filters],
    queryFn: async () => {
      let query = supabase
        .from('projects')
        .select(LIST_COLUMNS)
        .order('created_at', { ascending: false })
        .limit(300)
      if (filters.search.trim()) query = query.ilike('name', `%${filters.search.trim()}%`)
      if (filters.ownerId !== 'all') query = query.eq('owner_id', filters.ownerId)
      const { data, error } = await query
      if (error) throw error
      return data as unknown as ProjectRow[]
    },
    staleTime: 15_000,
  })
}

export function useProjectsList(filters: ProjectsFilters, page: number) {
  return useQuery({
    queryKey: ['projects', 'list', filters, page],
    queryFn: async () => {
      let query = supabase
        .from('projects')
        .select(LIST_COLUMNS, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * PROJECTS_PAGE_SIZE, page * PROJECTS_PAGE_SIZE - 1)
      if (filters.search.trim()) query = query.ilike('name', `%${filters.search.trim()}%`)
      if (filters.status !== 'all') query = query.eq('status', filters.status)
      if (filters.ownerId !== 'all') query = query.eq('owner_id', filters.ownerId)
      const { data, error, count } = await query
      if (error) throw error
      return { rows: data as unknown as ProjectRow[], total: count ?? 0 }
    },
    staleTime: 15_000,
  })
}

export function useProjectDetail(projectId: string | null) {
  return useQuery({
    queryKey: ['projects', 'detail', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*, customers(display_name, phone_primary)')
        .eq('id', projectId!)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!projectId,
  })
}

export interface MilestoneRow {
  id: string
  project_id: string
  title: string
  due_date: string | null
  amount: number
  status: Database['public']['Enums']['milestone_status']
  invoice_id: string | null
  sort_order: number
  completed_at: string | null
}

export function useProjectMilestones(projectId: string | null) {
  return useQuery({
    queryKey: ['project_milestones', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_milestones')
        .select('*')
        .eq('project_id', projectId!)
        .order('sort_order')
      if (error) throw error
      return data as MilestoneRow[]
    },
    enabled: !!projectId,
  })
}

// Milestone completion links its invoice via project_milestones.invoice_id,
// so a project's invoices are exactly those linked from its own milestones
// — no need to filter by customer (which could have several projects).
export function useMilestoneInvoices(invoiceIds: string[]) {
  return useQuery({
    queryKey: ['invoices', 'byIds', invoiceIds],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('id, invoice_number, status, total, amount_paid, currency, due_date')
        .in('id', invoiceIds)
        .order('issue_date', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: invoiceIds.length > 0,
  })
}
