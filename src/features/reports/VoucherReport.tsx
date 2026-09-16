import { format, parseISO } from 'date-fns'
import { AlertTriangleIcon, DownloadIcon } from 'lucide-react'
import { useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/shared/ErrorState'
import { SkeletonRows } from '@/components/shared/SkeletonRows'
import { exportToCsv } from '@/lib/export'
import { formatMoney } from '@/lib/format'
import { ReportBarChart } from './ReportBarChart'
import { ReportFilterBar } from './ReportFilterBar'
import { useVoucherSalesReport, useVoucherStockReport, type ReportFilters } from './useReports'

export function VoucherReport({ filters, onChange }: { filters: ReportFilters; onChange: (f: ReportFilters) => void }) {
  const { data: sales, isLoading, isError, refetch } = useVoucherSalesReport(filters)
  const { data: stock } = useVoucherStockReport()

  const byMonth = useMemo(() => {
    const map = new Map<string, number>()
    for (const row of sales ?? []) {
      if (!row.sold_at) continue
      const month = format(parseISO(row.sold_at), 'MMM yyyy')
      map.set(month, (map.get(month) ?? 0) + 1)
    }
    return Array.from(map.entries()).map(([label, value]) => ({ label, value }))
  }, [sales])

  const revenue = (sales ?? []).reduce((sum, r) => sum + (r.price_sold ?? 0), 0)
  const lowStock = (stock ?? []).filter((s) => s.available < s.reorder_level)

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
              (sales ?? []).map((s) => ({
                Plan: s.plan_name,
                Location: s.location_name ?? '',
                'Sold at': s.sold_at,
                Price: s.price_sold,
                Currency: s.currency,
              })),
              'voucher-sales.csv',
            )
          }
          disabled={!sales?.length}
        >
          <DownloadIcon className="size-4" /> CSV
        </Button>
      </div>

      <div className="flex flex-wrap gap-4">
        <div>
          <p className="text-xs text-text-muted">Vouchers sold</p>
          <p className="text-2xl font-semibold text-text">{sales?.length ?? 0}</p>
        </div>
        <div>
          <p className="text-xs text-text-muted">Revenue</p>
          <p className="text-2xl font-semibold text-text">{formatMoney(revenue, 'SSP')}</p>
        </div>
      </div>

      <ReportBarChart data={byMonth} />

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-text">Stock position by location</h3>
        {stock?.map((s, i) => (
          <div key={i} className="flex items-center justify-between rounded-card border border-border bg-surface p-2.5 text-sm">
            <span className="text-text">
              {s.plan_name} · {s.location_name ?? 'Unassigned'}
            </span>
            <span className="flex items-center gap-2">
              <span className="text-text-muted">{s.available} available</span>
              {s.available < s.reorder_level && (
                <Badge variant="danger">
                  <AlertTriangleIcon className="size-3" /> Low
                </Badge>
              )}
            </span>
          </div>
        ))}
      </div>
      {lowStock.length > 0 && <p className="text-xs text-danger">{lowStock.length} plan/location pair(s) below reorder level.</p>}
    </div>
  )
}
