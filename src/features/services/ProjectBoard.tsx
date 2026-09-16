import { formatDate, formatMoney } from '@/lib/format'
import type { ProjectRow, ProjectStatus } from './useProjects'

const COLUMNS: { status: ProjectStatus; label: string }[] = [
  { status: 'discovery', label: 'Discovery' },
  { status: 'in_progress', label: 'In progress' },
  { status: 'review', label: 'Review' },
  { status: 'delivered', label: 'Delivered' },
  { status: 'on_hold', label: 'On hold' },
  { status: 'closed', label: 'Closed' },
]

interface ProjectBoardProps {
  projects: ProjectRow[]
  onOpen: (id: string) => void
}

export function ProjectBoard({ projects, onOpen }: ProjectBoardProps) {
  return (
    <div className="flex gap-3 overflow-x-auto p-4">
      {COLUMNS.map((col) => {
        const items = projects.filter((p) => p.status === col.status)
        return (
          <div key={col.status} className="flex w-72 shrink-0 flex-col gap-2">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-semibold text-text">{col.label}</h3>
              <span className="text-xs text-text-muted">{items.length}</span>
            </div>
            <div className="flex flex-col gap-2">
              {items.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onOpen(p.id)}
                  className="flex flex-col gap-1.5 rounded-card border border-border bg-surface p-3 text-left hover:bg-surface-2"
                >
                  <p className="text-xs text-text-muted">{p.project_code}</p>
                  <p className="text-sm font-medium text-text">{p.name}</p>
                  <p className="text-xs text-text-muted">{p.customers?.display_name ?? 'No customer'}</p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-muted">{formatMoney(p.budget, p.currency)}</span>
                    {p.due_date && <span className="text-text-muted">Due {formatDate(p.due_date)}</span>}
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${p.progress_pct}%` }} />
                  </div>
                </button>
              ))}
              {items.length === 0 && <p className="px-1 text-xs text-text-muted">No projects</p>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
