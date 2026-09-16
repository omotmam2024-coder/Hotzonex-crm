import { differenceInCalendarDays } from 'date-fns'
import { DownloadIcon, FileDownIcon, TrendingUpIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { SkeletonRows } from '@/components/shared/SkeletonRows'
import { exportToCsv, exportToPdf } from '@/lib/export'
import { formatDate, formatMoney } from '@/lib/format'
import type { Database } from '@/types/database'
import { useAgingReport } from './useInvoices'

type BusinessUnit = Database['public']['Enums']['business_unit']

const BUCKETS = ['current', '1-30', '31-60', '61-90', '90+'] as const
type Bucket = (typeof BUCKETS)[number]

function bucketFor(dueDate: string): Bucket {
  const days = differenceInCalendarDays(new Date(), new Date(dueDate))
  if (days <= 0) return 'current'
  if (days <= 30) return '1-30'
  if (days <= 60) return '31-60'
  if (days <= 90) return '61-90'
  return '90+'
}

export function AgingReportPage() {
  const [businessUnit, setBusinessUnit] = useState<BusinessUnit | 'all'>('all')
  const { data, isLoading, isError, refetch } = useAgingReport(businessUnit)

  const bucketed = useMemo(() => {
    if (!data) return []
    return data.map((inv) => ({ ...inv, outstanding: inv.total - inv.amount_paid, bucket: bucketFor(inv.due_date) }))
  }, [data])

  const totals = useMemo(() => {
    const t: Record<Bucket, number> = { current: 0, '1-30': 0, '31-60': 0, '61-90': 0, '90+': 0 }
    for (const row of bucketed) t[row.bucket] += row.outstanding
    return t
  }, [bucketed])

  function rowsForExport() {
    return bucketed.map((r) => ({
      Invoice: r.invoice_number,
      Customer: r.customers?.display_name ?? '',
      Unit: r.business_unit,
      'Due date': formatDate(r.due_date),
      Bucket: r.bucket,
      Outstanding: r.outstanding,
      Currency: r.currency,
    }))
  }

  function handleExportCsv() {
    exportToCsv(rowsForExport(), `aging-report-${new Date().toISOString().slice(0, 10)}.csv`)
  }

  function handleExportPdf() {
    exportToPdf(
      'Aging report',
      ['Invoice', 'Customer', 'Unit', 'Due date', 'Bucket', 'Outstanding'],
      bucketed.map((r) => [
        r.invoice_number ?? '',
        r.customers?.display_name ?? '',
        r.business_unit,
        formatDate(r.due_date),
        r.bucket,
        formatMoney(r.outstanding, r.currency),
      ]),
      `aging-report-${new Date().toISOString().slice(0, 10)}.pdf`,
    )
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-text">Aging report</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={businessUnit} onValueChange={(v) => setBusinessUnit(v as BusinessUnit | 'all')}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All units</SelectItem>
              <SelectItem value="wifi">WiFi</SelectItem>
              <SelectItem value="services">Services</SelectItem>
              <SelectItem value="refreshment">Refreshment</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleExportCsv} disabled={bucketed.length === 0}>
            <DownloadIcon className="size-4" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPdf} disabled={bucketed.length === 0}>
            <FileDownIcon className="size-4" /> PDF
          </Button>
        </div>
      </div>

      {isLoading ? (
        <SkeletonRows />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : bucketed.length === 0 ? (
        <EmptyState icon={TrendingUpIcon} title="Nothing outstanding" description="No unpaid invoices for this unit." />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {BUCKETS.map((b) => (
              <div key={b} className="rounded-card border border-border bg-surface p-3">
                <p className="text-xs text-text-muted">{b}</p>
                <p className="text-sm font-semibold text-text">{formatMoney(totals[b], 'SSP')}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            {bucketed.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 rounded-card border border-border bg-surface p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text">{r.invoice_number}</p>
                  <p className="text-xs text-text-muted">
                    {r.customers?.display_name ?? 'Unknown'} · {r.business_unit} · due {formatDate(r.due_date)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold text-danger">{formatMoney(r.outstanding, r.currency)}</p>
                  <p className="text-xs text-text-muted">{r.bucket}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
