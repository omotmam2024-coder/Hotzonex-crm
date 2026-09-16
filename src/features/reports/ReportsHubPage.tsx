import { lazy, Suspense, useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { defaultReportFilters } from './useReports'

const RevenueReport = lazy(() => import('./RevenueReport').then((m) => ({ default: m.RevenueReport })))
const VoucherReport = lazy(() => import('./VoucherReport').then((m) => ({ default: m.VoucherReport })))
const SubscriptionReport = lazy(() => import('./SubscriptionReport').then((m) => ({ default: m.SubscriptionReport })))
const TicketReport = lazy(() => import('./TicketReport').then((m) => ({ default: m.TicketReport })))
const PipelineReport = lazy(() => import('./PipelineReport').then((m) => ({ default: m.PipelineReport })))
const AcquisitionReport = lazy(() => import('./AcquisitionReport').then((m) => ({ default: m.AcquisitionReport })))
const AgingReportPage = lazy(() => import('@/features/billing/AgingReportPage').then((m) => ({ default: m.AgingReportPage })))
const ResellerReport = lazy(() => import('./ResellerReport').then((m) => ({ default: m.ResellerReport })))
const InstallationReport = lazy(() => import('./InstallationReport').then((m) => ({ default: m.InstallationReport })))

const REPORTS = [
  { id: 'revenue', label: 'Revenue by unit/location/plan/month' },
  { id: 'vouchers', label: 'Voucher sales & stock position' },
  { id: 'subscriptions', label: 'Subscription churn & renewal' },
  { id: 'tickets', label: 'Ticket volume & SLA times' },
  { id: 'pipeline', label: 'Pipeline conversion & win rate' },
  { id: 'acquisition', label: 'Customer acquisition' },
  { id: 'aging', label: 'Aging receivables' },
  { id: 'resellers', label: 'Reseller performance & commissions' },
  { id: 'installations', label: 'Installation completion & lead time' },
] as const

function ReportFallback() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-8 w-full rounded-lg" />
      <Skeleton className="h-48 w-full rounded-card" />
      <Skeleton className="h-16 w-full rounded-card" />
    </div>
  )
}

export function ReportsHubPage() {
  const [reportId, setReportId] = useState<(typeof REPORTS)[number]['id']>('revenue')
  const [filters, setFilters] = useState(defaultReportFilters())

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-text">Reports</h1>
        <Select value={reportId} onValueChange={(v) => setReportId(v as typeof reportId)}>
          <SelectTrigger className="w-72">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {REPORTS.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Suspense fallback={<ReportFallback />}>
        {reportId === 'revenue' && <RevenueReport filters={filters} onChange={setFilters} />}
        {reportId === 'vouchers' && <VoucherReport filters={filters} onChange={setFilters} />}
        {reportId === 'subscriptions' && <SubscriptionReport filters={filters} onChange={setFilters} />}
        {reportId === 'tickets' && <TicketReport filters={filters} onChange={setFilters} />}
        {reportId === 'pipeline' && <PipelineReport filters={filters} onChange={setFilters} />}
        {reportId === 'acquisition' && <AcquisitionReport filters={filters} onChange={setFilters} />}
        {reportId === 'aging' && <AgingReportPage />}
        {reportId === 'resellers' && <ResellerReport />}
        {reportId === 'installations' && <InstallationReport filters={filters} onChange={setFilters} />}
      </Suspense>
    </div>
  )
}
