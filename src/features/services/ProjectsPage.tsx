import { LayoutGridIcon, ListIcon, PlusIcon, SearchIcon } from 'lucide-react'
import { BriefcaseIcon } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
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
import { can } from '@/lib/permissions'
import { formatDate, formatMoney } from '@/lib/format'
import { ProjectBoard } from './ProjectBoard'
import { ProjectDrawer } from './ProjectDrawer'
import { ProjectFormDialog } from './ProjectFormDialog'
import { PROJECTS_PAGE_SIZE, useProjectsBoard, useProjectsList, type ProjectsFilters } from './useProjects'

const DEFAULT_FILTERS: ProjectsFilters = { search: '', status: 'all', ownerId: 'all' }

export function ProjectsPage() {
  const { profile } = useAuth()
  const { data: profiles } = useProfiles()
  const [searchParams, setSearchParams] = useSearchParams()
  const [view, setView] = useState<'board' | 'list'>('board')
  const [filters, setFilters] = useState<ProjectsFilters>(DEFAULT_FILTERS)
  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebounced(searchInput, 350)
  const [page, setPage] = useState(1)
  const [newOpen, setNewOpen] = useState(false)

  const openProject = searchParams.get('project')
  const activeFilters: ProjectsFilters = { ...filters, search: debouncedSearch }
  const canWrite = can(profile, 'create')

  const boardQuery = useProjectsBoard(activeFilters)
  const listQuery = useProjectsList(activeFilters, page)

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-3 border-b border-border bg-bg p-4 no-print">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-text">Projects</h2>
          {canWrite && (
            <Button onClick={() => setNewOpen(true)}>
              <PlusIcon /> New project
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 rounded-lg border border-border p-0.5">
            <Button variant={view === 'board' ? 'secondary' : 'ghost'} size="sm" className="h-8 gap-1.5" onClick={() => setView('board')}>
              <LayoutGridIcon className="size-4" /> Board
            </Button>
            <Button variant={view === 'list' ? 'secondary' : 'ghost'} size="sm" className="h-8 gap-1.5" onClick={() => setView('list')}>
              <ListIcon className="size-4" /> List
            </Button>
          </div>
          <Select value={filters.ownerId} onValueChange={(v) => setFilters((f) => ({ ...f, ownerId: v }))}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Anyone</SelectItem>
              {profiles?.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.full_name || p.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {view === 'list' && (
            <Select value={filters.status} onValueChange={(v) => { setPage(1); setFilters((f) => ({ ...f, status: v as ProjectsFilters['status'] })) }}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="discovery">Discovery</SelectItem>
                <SelectItem value="in_progress">In progress</SelectItem>
                <SelectItem value="review">Review</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="on_hold">On hold</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          )}
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-muted" />
            <Input
              placeholder="Search project name…"
              value={searchInput}
              onChange={(e) => { setPage(1); setSearchInput(e.target.value) }}
              className="w-56 pl-9"
            />
          </div>
        </div>
      </div>

      {view === 'board' ? (
        boardQuery.isLoading ? (
          <SkeletonRows />
        ) : boardQuery.isError ? (
          <ErrorState onRetry={() => void boardQuery.refetch()} />
        ) : !boardQuery.data || boardQuery.data.length === 0 ? (
          <EmptyState icon={BriefcaseIcon} title="No projects yet" description="Start a project to track it through delivery." />
        ) : (
          <ProjectBoard projects={boardQuery.data} onOpen={(id) => setSearchParams({ project: id })} />
        )
      ) : listQuery.isLoading ? (
        <SkeletonRows />
      ) : listQuery.isError ? (
        <ErrorState onRetry={() => void listQuery.refetch()} />
      ) : !listQuery.data || listQuery.data.rows.length === 0 ? (
        <EmptyState icon={BriefcaseIcon} title="No projects found" description="Try adjusting the filters." />
      ) : (
        <div className="flex flex-col">
          <div className="flex flex-col gap-2 p-3">
            {listQuery.data.rows.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSearchParams({ project: p.id })}
                className="flex items-center justify-between gap-3 rounded-card border border-border bg-surface p-3 text-left hover:bg-surface-2"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-text">{p.name}</p>
                    <StatusBadge status={p.status} />
                  </div>
                  <p className="text-xs text-text-muted">
                    {p.customers?.display_name} · {p.due_date ? `Due ${formatDate(p.due_date)}` : 'No due date'}
                  </p>
                </div>
                <span className="shrink-0 text-sm text-text">{formatMoney(p.budget, p.currency)}</span>
              </button>
            ))}
          </div>
          <Pagination page={page} pageSize={PROJECTS_PAGE_SIZE} total={listQuery.data.total} onPageChange={setPage} />
        </div>
      )}

      <ProjectDrawer projectId={openProject} onClose={() => setSearchParams({})} />
      <ProjectFormDialog open={newOpen} onOpenChange={setNewOpen} onCreated={(id) => setSearchParams({ project: id })} />
    </div>
  )
}
