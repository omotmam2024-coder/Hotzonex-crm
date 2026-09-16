import { useMemo } from 'react'
import { DownloadIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/shared/ErrorState'
import { SkeletonRows } from '@/components/shared/SkeletonRows'
import { exportToCsv } from '@/lib/export'
import { ReportBarChart } from './ReportBarChart'
import { ReportFilterBar } from './ReportFilterBar'
import { useInstallationsReport, type ReportFilters } from './useReports'

export function InstallationReport({ filters, onChange }: { filters: ReportFilters; onChange: (f: ReportFilters) => void }) {
  const { data, isLoading, isError, refetch } = useInstallationsReport(filters)

  const byStatus = useMemo(() => {
    const map = new Map<string, number>()
    for (const row of data ?? []) map.set(row.status, (map.get(row.status) ?? 0) + 1)
    return Array.from(map.entries()).map(([label, value]) => ({ label, value }))
  }, [data])

  const total = data?.length ?? 0
  const completed = (data ?? []).filter((r) => r.status === 'completed')
  const completionRate = total > 0 ? (completed.length / total) * 100 : 0
  const leadTimes = completed.map((r) => r.lead_time_hours).filter((v): v is number => v != null)
  const avgLeadTime = leadTimes.length > 0 ? leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length : null

  if (isLoading) return <SkeletonRows />
  if (isError) return <ErrorState onRetry={() => void refetch()} />

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ReportFilterBar filters={filters} onChange={onChange} showUnit={false} showOwner ownerLabel="Technician" />
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            exportToCsv(
              (data ?? []).map((i) => ({
                'Job type': i.job_type,
                Technician: i.technician_name ?? '',
                Location: i.location_name ?? '',
                Status: i.status,
                'Lead time (h)': i.lead_time_hours,
              })),
              'installations-report.csv',
            )
          }
          disabled={!data?.length}
        >
          <DownloadIcon className="size-4" /> CSV
        </Button>
      </div>

      <div className="flex flex-wrap gap-4">
        <div>
          <p className="text-xs text-text-muted">Completion rate</p>
          <p className="text-2xl font-semibold text-success">{completionRate.toFixed(1)}%</p>
        </div>
        <div>
          <p className="text-xs text-text-muted">Avg lead time</p>
          <p className="text-2xl font-semibold text-text">{avgLeadTime != null ? `${avgLeadTime.toFixed(1)}h` : '—'}</p>
        </div>
        <div>
          <p className="text-xs text-text-muted">Total jobs</p>
          <p className="text-2xl font-semibold text-text">{total}</p>
        </div>
      </div>

      <ReportBarChart data={byStatus} />
    </div>
  )
}
