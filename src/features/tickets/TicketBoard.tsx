import { formatRelative } from '@/lib/format'
import type { TicketRow, TicketStatus } from './useTickets'
import { SlaChip } from './SlaChip'

const COLUMNS: { status: TicketStatus; label: string }[] = [
  { status: 'new', label: 'New' },
  { status: 'open', label: 'Open' },
  { status: 'pending_customer', label: 'Pending customer' },
  { status: 'escalated', label: 'Escalated' },
  { status: 'resolved', label: 'Resolved' },
]

interface TicketBoardProps {
  tickets: TicketRow[]
  onOpen: (id: string) => void
}

export function TicketBoard({ tickets, onOpen }: TicketBoardProps) {
  return (
    <div className="flex gap-3 overflow-x-auto p-4">
      {COLUMNS.map((col) => {
        const items = tickets.filter((t) => t.status === col.status)
        return (
          <div key={col.status} className="flex w-72 shrink-0 flex-col gap-2">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-semibold text-text">{col.label}</h3>
              <span className="text-xs text-text-muted">{items.length}</span>
            </div>
            <div className="flex flex-col gap-2">
              {items.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onOpen(t.id)}
                  className="flex flex-col gap-1.5 rounded-card border border-border bg-surface p-3 text-left hover:bg-surface-2"
                >
                  <p className="text-xs text-text-muted">{t.ticket_number}</p>
                  <p className="text-sm font-medium text-text">{t.subject}</p>
                  <p className="text-xs text-text-muted">{t.customers?.display_name ?? 'No customer'}</p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <SlaChip
                      status={t.status}
                      firstResponseAt={t.first_response_at}
                      resolvedAt={t.resolved_at}
                      slaResponseDue={t.sla_response_due}
                      slaResolveDue={t.sla_resolve_due}
                    />
                    <span className="text-xs text-text-muted">{formatRelative(t.created_at)}</span>
                  </div>
                </button>
              ))}
              {items.length === 0 && <p className="px-1 text-xs text-text-muted">No tickets</p>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
