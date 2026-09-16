import { lazy, Suspense, useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

const UsersPage = lazy(() => import('./UsersPage').then((m) => ({ default: m.UsersPage })))
const SettingsPage = lazy(() => import('./SettingsPage').then((m) => ({ default: m.SettingsPage })))

const TABS = [
  { value: 'users', label: 'Users' },
  { value: 'settings', label: 'Settings' },
]

function TabFallback() {
  return (
    <div className="flex flex-col gap-2 p-4">
      <Skeleton className="h-16 w-full rounded-card" />
      <Skeleton className="h-16 w-full rounded-card" />
    </div>
  )
}

export function AdminHubPage() {
  const [tab, setTab] = useState('users')

  return (
    <div className="flex flex-col">
      <div className="border-b border-border bg-bg p-4">
        <h1 className="mb-3 text-xl font-semibold text-text">Admin</h1>
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
        {tab === 'users' && <UsersPage />}
        {tab === 'settings' && <SettingsPage />}
      </Suspense>
    </div>
  )
}
