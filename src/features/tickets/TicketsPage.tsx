import { LayoutGridIcon, ListIcon, PlusIcon, SearchIcon, TicketIcon } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { Pagination } from '@/components/shared/Pagination'
import { SkeletonRows } from '@/components/shared/SkeletonRows'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { useAuth } from '@/hooks/useAuth'
import { useDebounced } from '@/hooks/useDebounced'
import { useProfiles } from '@/hooks/useProfiles'
import { useUnitLabels } from '@/hooks/useUnitLabels'
import { can } from '@/lib/permissions'
import { formatRelative } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import { SlaChip } from './SlaChip'
import { TicketBoard } from './TicketBoard'
import { TicketDrawer } from './TicketDrawer'
import { TicketFormDialog } from './TicketFormDialog'
import { TICKETS_PAGE_SIZE, useTickets, useTicketsBoard, type TicketsFilters } from './useTickets'

const DEFAULT_FILTERS: TicketsFilters = {
  search: '',
  status: 'all',
  priority: 'all',
  assignedTo: 'all',
  businessUnit: 'all',
}

export function TicketsPage() {
  const { profile } = useAuth()
  const { data: profiles } = useProfiles()
  const UNIT_LABEL = useUnitLabels()
  const [searchParams, setSearchParams] = useSearchParams()
  const [view, setView] = useState<'board' | 'list'>('board')
  const [filters, setFilters] = useState<TicketsFilters>(DEFAULT_FILTERS)
  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebounced(searchInput, 350)
  const [page, setPage] = useState(1)
  const [newOpen, setNewOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [reassigning, setReassigning] = useState(false)

  const openTicket = searchParams.get('ticket')
  const activeFilters: TicketsFilters = { ...filters, search: debouncedSearch }

  const boardQuery = useTicketsBoard(filters.businessUnit)
  const listQuery = useTickets(activeFilters, page)

  const canWrite = can(profile, 'create')

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function bulkReassign(assigneeId: string | null) {
    if (selected.size === 0) return
    setReassigning(true)
    const { error } = await supabase
      .from('tickets')
      .update({ assigned_to: assigneeId })
      .in('id', Array.from(selected))
    setReassigning(false)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success(`Reassigned ${selected.size} ticket(s)`)
    setSelected(new Set())
    await listQuery.refetch()
  }

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-3 border-b border-border bg-bg p-4 no-print">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-semibold text-text">Tickets</h1>
          {canWrite && (
            <Button onClick={() => setNewOpen(true)}>
              <PlusIcon /> New ticket
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 rounded-lg border border-border p-0.5">
            <Button
              variant={view === 'board' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => setView('board')}
            >
              <LayoutGridIcon className="size-4" /> Board
            </Button>
            <Button
              variant={view === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => setView('list')}
            >
              <ListIcon className="size-4" /> List
            </Button>
          </div>

          <Select value={filters.businessUnit} onValueChange={(v) => setFilters((f) => ({ ...f, businessUnit: v as TicketsFilters['businessUnit'] }))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All units</SelectItem>
              <SelectItem value="wifi">{UNIT_LABEL.wifi}</SelectItem>
              <SelectItem value="services">{UNIT_LABEL.services}</SelectItem>
              <SelectItem value="refreshment">{UNIT_LABEL.refreshment}</SelectItem>
            </SelectContent>
          </Select>

          {view === 'list' && (
            <>
              <Select value={filters.status} onValueChange={(v) => { setPage(1); setFilters((f) => ({ ...f, status: v as TicketsFilters['status'] })) }}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="pending_customer">Pending customer</SelectItem>
                  <SelectItem value="escalated">Escalated</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filters.priority} onValueChange={(v) => { setPage(1); setFilters((f) => ({ ...f, priority: v as TicketsFilters['priority'] })) }}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All priority</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filters.assignedTo} onValueChange={(v) => { setPage(1); setFilters((f) => ({ ...f, assignedTo: v })) }}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Anyone</SelectItem>
                  <SelectItem value="__none">Unassigned</SelectItem>
                  {profiles?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.full_name || p.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-muted" />
                <Input
                  placeholder="Search subject or number…"
                  value={searchInput}
                  onChange={(e) => { setPage(1); setSearchInput(e.target.value) }}
                  className="w-56 pl-9"
                />
              </div>
            </>
          )}
        </div>

        {view === 'list' && selected.size > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-accent/40 bg-accent/10 px-3 py-2">
            <span className="text-sm text-text">{selected.size} selected</span>
            <Select onValueChange={(v) => void bulkReassign(v === '__none' ? null : v)} disabled={reassigning}>
              <SelectTrigger className="h-8 w-48">
                <SelectValue placeholder="Reassign to…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">Unassigned</SelectItem>
                {profiles?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.full_name || p.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
          </div>
        )}
      </div>

      {view === 'board' ? (
        boardQuery.isLoading ? (
          <SkeletonRows />
        ) : boardQuery.isError ? (
          <ErrorState onRetry={() => void boardQuery.refetch()} />
        ) : !boardQuery.data || boardQuery.data.length === 0 ? (
          <EmptyState icon={TicketIcon} title="No open tickets" description="Every ticket is resolved or closed." />
        ) : (
          <TicketBoard tickets={boardQuery.data} onOpen={(id) => setSearchParams({ ticket: id })} />
        )
      ) : listQuery.isLoading ? (
        <SkeletonRows />
      ) : listQuery.isError ? (
        <ErrorState onRetry={() => void listQuery.refetch()} />
      ) : !listQuery.data || listQuery.data.rows.length === 0 ? (
        <EmptyState icon={TicketIcon} title="No tickets found" description="Try adjusting the filters." />
      ) : (
        <div className="flex flex-col">
          <div className="flex flex-col gap-2 p-3">
            {listQuery.data.rows.map((t) => (
              <div key={t.id} className="flex items-center gap-2 rounded-card border border-border bg-surface p-3">
                <Checkbox checked={selected.has(t.id)} onCheckedChange={() => toggleSelect(t.id)} />
                <button
                  type="button"
                  className="flex flex-1 flex-col gap-1 text-left"
                  onClick={() => setSearchParams({ ticket: t.id })}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-mono text-xs text-text-muted">{t.ticket_number}</p>
                    <StatusBadge status={t.status} />
                    <SlaChip
                      status={t.status}
                      firstResponseAt={t.first_response_at}
                      resolvedAt={t.resolved_at}
                      slaResponseDue={t.sla_response_due}
                      slaResolveDue={t.sla_resolve_due}
                    />
                  </div>
                  <p className="text-sm font-medium text-text">{t.subject}</p>
                  <p className="text-xs text-text-muted">
                    {t.customers?.display_name ?? 'No customer'}
                    {t.ticket_categories?.name ? ` · ${t.ticket_categories.name}` : ''} · {formatRelative(t.created_at)}
                  </p>
                </button>
              </div>
            ))}
          </div>
          <Pagination page={page} pageSize={TICKETS_PAGE_SIZE} total={listQuery.data.total} onPageChange={setPage} />
        </div>
      )}

      <TicketDrawer ticketId={openTicket} onClose={() => setSearchParams({})} />
      <TicketFormDialog open={newOpen} onOpenChange={setNewOpen} defaultBusinessUnit={filters.businessUnit === 'all' ? undefined : filters.businessUnit} />
    </div>
  )
}
