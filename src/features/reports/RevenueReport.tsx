import { format, parseISO } from 'date-fns'
import { DownloadIcon, FileDownIcon } from 'lucide-react'
import { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/shared/ErrorState'
import { SkeletonRows } from '@/components/shared/SkeletonRows'
import { exportToCsv, exportToPdf } from '@/lib/export'
import { formatDate, formatMoney } from '@/lib/format'
import { ReportBarChart } from './ReportBarChart'
import { ReportFilterBar } from './ReportFilterBar'
import { useRevenueReport, type ReportFilters } from './useReports'

export function RevenueReport({ filters, onChange }: { filters: ReportFilters; onChange: (f: ReportFilters) => void }) {
  const { data, isLoading, isError, refetch } = useRevenueReport(filters)

  const byMonth = useMemo(() => {
    const map = new Map<string, number>()
    for (const row of data ?? []) {
      const month = format(parseISO(row.issue_date), 'MMM yyyy')
      map.set(month, (map.get(month) ?? 0) + row.line_total)
    }
    return Array.from(map.entries()).map(([label, value]) => ({ label, value }))
  }, [data])

  const byPlan = useMemo(() => {
    const map = new Map<string, number>()
    for (const row of data ?? []) {
      const key = row.plan_name ?? 'Other'
      map.set(key, (map.get(key) ?? 0) + row.line_total)
    }
    return Array.from(map.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
  }, [data])

  const total = (data ?? []).reduce((sum, r) => sum + r.line_total, 0)

  function rows() {
    return (data ?? []).map((r) => ({
      Date: formatDate(r.issue_date),
      Unit: r.business_unit,
      Location: r.location_name ?? '',
      Plan: r.plan_name ?? '',
      Amount: r.line_total,
      Currency: r.currency,
      Status: r.invoice_status,
    }))
  }

  if (isLoading) return <SkeletonRows />
  if (isError) return <ErrorState onRetry={() => void refetch()} />

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ReportFilterBar filters={filters} onChange={onChange} />
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => exportToCsv(rows(), 'revenue-report.csv')} disabled={!data?.length}>
            <DownloadIcon className="size-4" /> CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              exportToPdf(
                'Revenue report',
                ['Date', 'Unit', 'Plan', 'Amount'],
                (data ?? []).map((r) => [formatDate(r.issue_date), r.business_unit, r.plan_name ?? '—', formatMoney(r.line_total, r.currency)]),
                'revenue-report.pdf',
              )
            }
            disabled={!data?.length}
          >
            <FileDownIcon className="size-4" /> PDF
          </Button>
        </div>
      </div>

      <p className="text-2xl font-semibold text-text">{formatMoney(total, 'SSP')}</p>
      <ReportBarChart data={byMonth} valueFormatter={(v) => formatMoney(v, 'SSP')} />

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-text">By plan</h3>
        {byPlan.map((p) => (
          <div key={p.label} className="flex items-center justify-between rounded-card border border-border bg-surface p-2.5 text-sm">
            <span className="text-text">{p.label}</span>
            <span className="text-text-muted">{formatMoney(p.value, 'SSP')}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
