import { useMemo } from 'react'
import { DownloadIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/shared/ErrorState'
import { SkeletonRows } from '@/components/shared/SkeletonRows'
import { exportToCsv } from '@/lib/export'
import { ReportBarChart } from './ReportBarChart'
import { ReportFilterBar } from './ReportFilterBar'
import { useTicketsReport, type ReportFilters } from './useReports'

function avg(nums: number[]) {
  if (nums.length === 0) return null
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

function formatMinutes(mins: number) {
  if (mins < 60) return `${Math.round(mins)}m`
  const hours = mins / 60
  if (hours < 24) return `${hours.toFixed(1)}h`
  return `${(hours / 24).toFixed(1)}d`
}

export function TicketReport({ filters, onChange }: { filters: ReportFilters; onChange: (f: ReportFilters) => void }) {
  const { data, isLoading, isError, refetch } = useTicketsReport(filters)

  const byCategory = useMemo(() => {
    const map = new Map<string, number>()
    for (const row of data ?? []) {
      const key = row.category_name ?? 'Uncategorised'
      map.set(key, (map.get(key) ?? 0) + 1)
    }
    return Array.from(map.entries()).map(([label, value]) => ({ label, value }))
  }, [data])

  const byAgent = useMemo(() => {
    const map = new Map<string, { count: number; response: number[]; resolve: number[] }>()
    for (const row of data ?? []) {
      const key = row.assignee_name ?? 'Unassigned'
      const entry = map.get(key) ?? { count: 0, response: [], resolve: [] }
      entry.count += 1
      if (row.response_minutes != null) entry.response.push(row.response_minutes)
      if (row.resolve_minutes != null) entry.resolve.push(row.resolve_minutes)
      map.set(key, entry)
    }
    return Array.from(map.entries()).map(([agent, v]) => ({
      agent,
      count: v.count,
      avgResponse: avg(v.response),
      avgResolve: avg(v.resolve),
    }))
  }, [data])

  const avgResponse = avg((data ?? []).map((r) => r.response_minutes).filter((v): v is number => v != null))
  const avgResolve = avg((data ?? []).map((r) => r.resolve_minutes).filter((v): v is number => v != null))

  if (isLoading) return <SkeletonRows />
  if (isError) return <ErrorState onRetry={() => void refetch()} />

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ReportFilterBar filters={filters} onChange={onChange} showLocation={false} showOwner />
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            exportToCsv(
              (data ?? []).map((t) => ({
                Category: t.category_name ?? '',
                Agent: t.assignee_name ?? '',
                Priority: t.priority,
                Status: t.status,
                'Response (min)': t.response_minutes,
                'Resolve (min)': t.resolve_minutes,
              })),
              'tickets-report.csv',
            )
          }
          disabled={!data?.length}
        >
          <DownloadIcon className="size-4" /> CSV
        </Button>
      </div>

      <div className="flex flex-wrap gap-4">
        <div>
          <p className="text-xs text-text-muted">Ticket volume</p>
          <p className="text-2xl font-semibold text-text">{data?.length ?? 0}</p>
        </div>
        <div>
          <p className="text-xs text-text-muted">Avg first response</p>
          <p className="text-2xl font-semibold text-text">{avgResponse != null ? formatMinutes(avgResponse) : '—'}</p>
        </div>
        <div>
          <p className="text-xs text-text-muted">Avg resolution</p>
          <p className="text-2xl font-semibold text-text">{avgResolve != null ? formatMinutes(avgResolve) : '—'}</p>
        </div>
      </div>

      <ReportBarChart data={byCategory} />

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-text">By agent</h3>
        {byAgent.map((a) => (
          <div key={a.agent} className="flex items-center justify-between rounded-card border border-border bg-surface p-2.5 text-sm">
            <span className="text-text">{a.agent}</span>
            <span className="text-text-muted">
              {a.count} tickets · resp {a.avgResponse != null ? formatMinutes(a.avgResponse) : '—'} · resolve{' '}
              {a.avgResolve != null ? formatMinutes(a.avgResolve) : '—'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
