import { lazy, Suspense, useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

const CampaignsPage = lazy(() => import('./CampaignsPage').then((m) => ({ default: m.CampaignsPage })))
const MessageTemplatesPage = lazy(() => import('./MessageTemplatesPage').then((m) => ({ default: m.MessageTemplatesPage })))

const TABS = [
  { value: 'campaigns', label: 'Campaigns' },
  { value: 'templates', label: 'Templates' },
]

function TabFallback() {
  return (
    <div className="flex flex-col gap-2 p-4">
      <Skeleton className="h-16 w-full rounded-card" />
      <Skeleton className="h-16 w-full rounded-card" />
    </div>
  )
}

export function CampaignsHubPage() {
  const [tab, setTab] = useState('campaigns')

  return (
    <div className="flex flex-col">
      <div className="border-b border-border bg-bg p-4 no-print">
        <h1 className="mb-3 text-xl font-semibold text-text">Campaigns</h1>
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
        {tab === 'campaigns' && <CampaignsPage />}
        {tab === 'templates' && <MessageTemplatesPage />}
      </Suspense>
    </div>
  )
}
