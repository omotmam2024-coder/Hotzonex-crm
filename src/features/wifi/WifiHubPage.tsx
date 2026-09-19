import { lazy, Suspense, useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/hooks/useAuth'
import { useUnitLabels } from '@/hooks/useUnitLabels'

// Each tab is its own chunk: the voucher batch/PDF export tooling (jspdf,
// html2canvas) only loads for staff who actually open Batches, not every
// technician checking their jobs on a 3G connection.
const ServicePlansPage = lazy(() => import('./ServicePlansPage').then((m) => ({ default: m.ServicePlansPage })))
const VouchersPage = lazy(() => import('./VouchersPage').then((m) => ({ default: m.VouchersPage })))
const VoucherBatchesPage = lazy(() => import('./VoucherBatchesPage').then((m) => ({ default: m.VoucherBatchesPage })))
const SubscriptionsPage = lazy(() => import('./SubscriptionsPage').then((m) => ({ default: m.SubscriptionsPage })))
const InstallationsPage = lazy(() => import('./InstallationsPage').then((m) => ({ default: m.InstallationsPage })))
const ResellersPage = lazy(() => import('./ResellersPage').then((m) => ({ default: m.ResellersPage })))
const EquipmentPage = lazy(() => import('./EquipmentPage').then((m) => ({ default: m.EquipmentPage })))

const TABS = [
  { value: 'plans', label: 'Plans' },
  { value: 'vouchers', label: 'Vouchers' },
  { value: 'batches', label: 'Batches' },
  { value: 'subscriptions', label: 'Subscriptions' },
  { value: 'installations', label: 'Installations' },
  { value: 'resellers', label: 'Resellers' },
  { value: 'equipment', label: 'Equipment' },
]

function TabFallback() {
  return (
    <div className="flex flex-col gap-2 p-4">
      <Skeleton className="h-16 w-full rounded-card" />
      <Skeleton className="h-16 w-full rounded-card" />
    </div>
  )
}

export function WifiHubPage() {
  const { profile } = useAuth()
  const [tab, setTab] = useState(profile?.role === 'technician' ? 'installations' : 'subscriptions')
  const UNIT_LABEL = useUnitLabels()

  return (
    <div className="flex flex-col">
      <div className="border-b border-border bg-bg p-4 no-print">
        <h1 className="mb-3 text-xl font-semibold text-text">{UNIT_LABEL.wifi} operations</h1>
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
        {tab === 'plans' && <ServicePlansPage />}
        {tab === 'vouchers' && <VouchersPage />}
        {tab === 'batches' && <VoucherBatchesPage />}
        {tab === 'subscriptions' && <SubscriptionsPage />}
        {tab === 'installations' && <InstallationsPage />}
        {tab === 'resellers' && <ResellersPage />}
        {tab === 'equipment' && <EquipmentPage />}
      </Suspense>
    </div>
  )
}
