import { useMemo } from 'react'
import { DownloadIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/shared/ErrorState'
import { SkeletonRows } from '@/components/shared/SkeletonRows'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { exportToCsv } from '@/lib/export'
import { formatDate, formatMoney } from '@/lib/format'
import { ReportBarChart } from './ReportBarChart'
import { ReportFilterBar } from './ReportFilterBar'
import { useSubscriptionsReport, type ReportFilters } from './useReports'

export function SubscriptionReport({ filters, onChange }: { filters: ReportFilters; onChange: (f: ReportFilters) => void }) {
  const { data, isLoading, isError, refetch } = useSubscriptionsReport(filters)

  const byStatus = useMemo(() => {
    const map = new Map<string, number>()
    for (const row of data ?? []) map.set(row.status, (map.get(row.status) ?? 0) + 1)
    return Array.from(map.entries()).map(([label, value]) => ({ label, value }))
  }, [data])

  const total = data?.length ?? 0
  const churned = (data ?? []).filter((r) => r.status === 'expired' || r.status === 'cancelled').length
  const retained = total - churned
  const churnRate = total > 0 ? (churned / total) * 100 : 0
  const renewalRate = total > 0 ? (retained / total) * 100 : 0

  const expiringSoon = (data ?? [])
    .filter((r) => r.status === 'expiring_soon')
    .sort((a, b) => new Date(a.end_date).getTime() - new Date(b.end_date).getTime())
    .slice(0, 15)

  if (isLoading) return <SkeletonRows />
  if (isError) return <ErrorState onRetry={() => void refetch()} />

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ReportFilterBar filters={filters} onChange={onChange} showUnit={false} />
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            exportToCsv(
              (data ?? []).map((s) => ({ Plan: s.plan_name, Location: s.location_name ?? '', Status: s.status, 'End date': s.end_date, Fee: s.monthly_fee })),
              'subscriptions.csv',
            )
          }
          disabled={!data?.length}
        >
          <DownloadIcon className="size-4" /> CSV
        </Button>
      </div>

      <div className="flex flex-wrap gap-4">
        <div>
          <p className="text-xs text-text-muted">Churn rate</p>
          <p className="text-2xl font-semibold text-danger">{churnRate.toFixed(1)}%</p>
        </div>
        <div>
          <p className="text-xs text-text-muted">Retention rate</p>
          <p className="text-2xl font-semibold text-success">{renewalRate.toFixed(1)}%</p>
        </div>
        <div>
          <p className="text-xs text-text-muted">Total subscriptions</p>
          <p className="text-2xl font-semibold text-text">{total}</p>
        </div>
      </div>

      <ReportBarChart data={byStatus} />

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-text">Expiring pipeline (soonest first)</h3>
        {expiringSoon.length === 0 ? (
          <p className="text-sm text-text-muted">Nothing expiring soon in this range.</p>
        ) : (
          expiringSoon.map((s, i) => (
            <div key={i} className="flex items-center justify-between rounded-card border border-border bg-surface p-2.5 text-sm">
              <span className="text-text">
                {s.plan_name} · {s.location_name ?? 'Unassigned'}
              </span>
              <span className="flex items-center gap-2">
                <span className="text-text-muted">{formatDate(s.end_date)}</span>
                <span className="text-text-muted">{formatMoney(s.monthly_fee, s.currency)}</span>
                <StatusBadge status={s.status} />
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
