import { DownloadIcon } from 'lucide-react'
import { useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/shared/ErrorState'
import { SkeletonRows } from '@/components/shared/SkeletonRows'
import { exportToCsv } from '@/lib/export'
import { formatMoney } from '@/lib/format'
import { ReportBarChart } from './ReportBarChart'
import { useResellersReport } from './useReports'

export function ResellerReport() {
  const { data, isLoading, isError, refetch } = useResellersReport()

  const byReseller = useMemo(
    () => (data ?? []).map((r) => ({ label: r.name, value: r.vouchers_sold })).sort((a, b) => b.value - a.value),
    [data],
  )

  const totalDue = (data ?? []).reduce((sum, r) => sum + r.commission_due, 0)

  if (isLoading) return <SkeletonRows />
  if (isError) return <ErrorState onRetry={() => void refetch()} />

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            exportToCsv(
              (data ?? []).map((r) => ({
                Reseller: r.name,
                Location: r.location_name ?? '',
                'Vouchers sold': r.vouchers_sold,
                Revenue: r.revenue,
                'Commission due': r.commission_due,
              })),
              'reseller-performance.csv',
            )
          }
          disabled={!data?.length}
        >
          <DownloadIcon className="size-4" /> CSV
        </Button>
      </div>

      <p className="text-xs text-text-muted">
        Total commission due: <span className="text-lg font-semibold text-danger">{formatMoney(totalDue, 'SSP')}</span>
      </p>

      <ReportBarChart data={byReseller} />

      <div className="flex flex-col gap-2">
        {data?.map((r) => (
          <div key={r.id} className="flex items-center justify-between rounded-card border border-border bg-surface p-2.5 text-sm">
            <div>
              <span className="text-text">{r.name}</span>
              {!r.is_active && <Badge variant="muted" className="ml-2">Inactive</Badge>}
              <p className="text-xs text-text-muted">{r.location_name ?? 'Unassigned'} · {r.vouchers_sold} sold · {formatMoney(r.revenue, 'SSP')} revenue</p>
            </div>
            <span className="font-medium text-danger">{formatMoney(r.commission_due, 'SSP')} due</span>
          </div>
        ))}
      </div>
    </div>
  )
}
