import { lazy, Suspense, useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

// Each tab is its own chunk: invoice PDF/xlsx export tooling only loads for
// staff who actually open Invoices or the Aging report.
const InvoicesPage = lazy(() => import('./InvoicesPage').then((m) => ({ default: m.InvoicesPage })))
const RecordPaymentPage = lazy(() => import('./RecordPaymentPage').then((m) => ({ default: m.RecordPaymentPage })))
const AgingReportPage = lazy(() => import('./AgingReportPage').then((m) => ({ default: m.AgingReportPage })))

const TABS = [
  { value: 'invoices', label: 'Invoices' },
  { value: 'payment', label: 'Record payment' },
  { value: 'aging', label: 'Aging report' },
]

function TabFallback() {
  return (
    <div className="flex flex-col gap-2 p-4">
      <Skeleton className="h-16 w-full rounded-card" />
      <Skeleton className="h-16 w-full rounded-card" />
    </div>
  )
}

export function BillingHubPage() {
  const [tab, setTab] = useState('invoices')

  return (
    <div className="flex flex-col">
      <div className="border-b border-border bg-bg p-4 no-print">
        <h1 className="mb-3 text-xl font-semibold text-text">Billing</h1>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <Suspense fallback={<TabFallback />}>
        {tab === 'invoices' && <InvoicesPage />}
        {tab === 'payment' && <RecordPaymentPage />}
        {tab === 'aging' && <AgingReportPage />}
      </Suspense>
    </div>
  )
}
