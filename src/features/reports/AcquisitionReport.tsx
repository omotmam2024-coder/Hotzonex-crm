import { format, parseISO } from 'date-fns'
import { DownloadIcon } from 'lucide-react'
import { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/shared/ErrorState'
import { SkeletonRows } from '@/components/shared/SkeletonRows'
import { exportToCsv } from '@/lib/export'
import { ReportBarChart } from './ReportBarChart'
import { ReportFilterBar } from './ReportFilterBar'
import { useCustomersReport, type ReportFilters } from './useReports'

export function AcquisitionReport({ filters, onChange }: { filters: ReportFilters; onChange: (f: ReportFilters) => void }) {
  const { data, isLoading, isError, refetch } = useCustomersReport(filters)

  const byMonth = useMemo(() => {
    const map = new Map<string, number>()
    for (const row of data ?? []) {
      const month = format(parseISO(row.created_at), 'MMM yyyy')
      map.set(month, (map.get(month) ?? 0) + 1)
    }
    return Array.from(map.entries()).map(([label, value]) => ({ label, value }))
  }, [data])

  const bySource = useMemo(() => {
    const map = new Map<string, number>()
    for (const row of data ?? []) {
      const key = row.source ?? 'Unknown'
      map.set(key, (map.get(key) ?? 0) + 1)
    }
    return Array.from(map.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
  }, [data])

  if (isLoading) return <SkeletonRows />
  if (isError) return <ErrorState onRetry={() => void refetch()} />

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ReportFilterBar filters={filters} onChange={onChange} showLocation={false} />
        <Button
          variant="outline"
          size="sm"
          onClick={() => exportToCsv((data ?? []).map((c) => ({ Source: c.source ?? '', Status: c.status, 'Created at': c.created_at })), 'acquisition-report.csv')}
          disabled={!data?.length}
        >
          <DownloadIcon className="size-4" /> CSV
        </Button>
      </div>

      <p className="text-2xl font-semibold text-text">{data?.length ?? 0} new customers</p>
      <ReportBarChart data={byMonth} />

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-text">By source</h3>
        {bySource.map((s) => (
          <div key={s.label} className="flex items-center justify-between rounded-card border border-border bg-surface p-2.5 text-sm">
            <span className="text-text">{s.label}</span>
            <span className="text-text-muted">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
