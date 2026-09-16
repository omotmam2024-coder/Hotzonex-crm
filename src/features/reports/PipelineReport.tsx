import { useMemo } from 'react'
import { DownloadIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/shared/ErrorState'
import { SkeletonRows } from '@/components/shared/SkeletonRows'
import { exportToCsv } from '@/lib/export'
import { formatMoney } from '@/lib/format'
import { ReportBarChart } from './ReportBarChart'
import { ReportFilterBar } from './ReportFilterBar'
import { useDealsReport, type ReportFilters } from './useReports'

export function PipelineReport({ filters, onChange }: { filters: ReportFilters; onChange: (f: ReportFilters) => void }) {
  const { data, isLoading, isError, refetch } = useDealsReport(filters)

  const byStage = useMemo(() => {
    const map = new Map<string, number>()
    for (const row of data ?? []) {
      const key = row.stage_name ?? 'Unknown'
      map.set(key, (map.get(key) ?? 0) + 1)
    }
    return Array.from(map.entries()).map(([label, value]) => ({ label, value }))
  }, [data])

  const bySource = useMemo(() => {
    const map = new Map<string, { total: number; won: number }>()
    for (const row of data ?? []) {
      const key = row.source ?? 'Unknown'
      const entry = map.get(key) ?? { total: 0, won: 0 }
      entry.total += 1
      if (row.status === 'won') entry.won += 1
      map.set(key, entry)
    }
    return Array.from(map.entries()).map(([source, v]) => ({
      source,
      total: v.total,
      won: v.won,
      winRate: v.total > 0 ? (v.won / v.total) * 100 : 0,
    }))
  }, [data])

  const byAgent = useMemo(() => {
    const map = new Map<string, { total: number; won: number; value: number }>()
    for (const row of data ?? []) {
      const key = row.owner_name ?? 'Unassigned'
      const entry = map.get(key) ?? { total: 0, won: 0, value: 0 }
      entry.total += 1
      if (row.status === 'won') {
        entry.won += 1
        entry.value += row.value
      }
      map.set(key, entry)
    }
    return Array.from(map.entries()).map(([agent, v]) => ({
      agent,
      total: v.total,
      won: v.won,
      winRate: v.total > 0 ? (v.won / v.total) * 100 : 0,
      wonValue: v.value,
    }))
  }, [data])

  const totalDeals = data?.length ?? 0
  const wonDeals = (data ?? []).filter((d) => d.status === 'won').length
  const overallWinRate = totalDeals > 0 ? (wonDeals / totalDeals) * 100 : 0

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
              (data ?? []).map((d) => ({ Stage: d.stage_name ?? '', Source: d.source ?? '', Owner: d.owner_name ?? '', Status: d.status, Value: d.value })),
              'pipeline-report.csv',
            )
          }
          disabled={!data?.length}
        >
          <DownloadIcon className="size-4" /> CSV
        </Button>
      </div>

      <div className="flex flex-wrap gap-4">
        <div>
          <p className="text-xs text-text-muted">Total deals</p>
          <p className="text-2xl font-semibold text-text">{totalDeals}</p>
        </div>
        <div>
          <p className="text-xs text-text-muted">Win rate</p>
          <p className="text-2xl font-semibold text-success">{overallWinRate.toFixed(1)}%</p>
        </div>
      </div>

      <ReportBarChart data={byStage} />

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-text">By source</h3>
        {bySource.map((s) => (
          <div key={s.source} className="flex items-center justify-between rounded-card border border-border bg-surface p-2.5 text-sm">
            <span className="text-text">{s.source}</span>
            <span className="text-text-muted">
              {s.won}/{s.total} won · {s.winRate.toFixed(0)}%
            </span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-text">By agent</h3>
        {byAgent.map((a) => (
          <div key={a.agent} className="flex items-center justify-between rounded-card border border-border bg-surface p-2.5 text-sm">
            <span className="text-text">{a.agent}</span>
            <span className="text-text-muted">
              {a.won}/{a.total} won · {a.winRate.toFixed(0)}% · {formatMoney(a.wonValue, 'SSP')}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
