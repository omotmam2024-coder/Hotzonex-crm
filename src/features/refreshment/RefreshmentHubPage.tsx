import { lazy, Suspense, useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

const SuppliersPage = lazy(() => import('./SuppliersPage').then((m) => ({ default: m.SuppliersPage })))
const SupplierOrdersPage = lazy(() => import('./SupplierOrdersPage').then((m) => ({ default: m.SupplierOrdersPage })))
const BookingsCalendarPage = lazy(() => import('./BookingsCalendarPage').then((m) => ({ default: m.BookingsCalendarPage })))

const TABS = [
  { value: 'bookings', label: 'Bookings' },
  { value: 'suppliers', label: 'Suppliers' },
  { value: 'orders', label: 'Orders' },
]

function TabFallback() {
  return (
    <div className="flex flex-col gap-2 p-4">
      <Skeleton className="h-16 w-full rounded-card" />
      <Skeleton className="h-16 w-full rounded-card" />
    </div>
  )
}

export function RefreshmentHubPage() {
  const [tab, setTab] = useState('bookings')

  return (
    <div className="flex flex-col">
      <div className="border-b border-border bg-bg p-4 no-print">
        <h1 className="mb-3 text-xl font-semibold text-text">Refreshment Centre</h1>
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
        {tab === 'bookings' && <BookingsCalendarPage />}
        {tab === 'suppliers' && <SuppliersPage />}
        {tab === 'orders' && <SupplierOrdersPage />}
      </Suspense>
    </div>
  )
}
