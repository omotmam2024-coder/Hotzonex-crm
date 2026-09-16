import { lazy, Suspense, useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

const ProjectsPage = lazy(() => import('./ProjectsPage').then((m) => ({ default: m.ProjectsPage })))
const ContractsPage = lazy(() => import('./ContractsPage').then((m) => ({ default: m.ContractsPage })))

const TABS = [
  { value: 'projects', label: 'Projects' },
  { value: 'contracts', label: 'Contracts' },
]

function TabFallback() {
  return (
    <div className="flex flex-col gap-2 p-4">
      <Skeleton className="h-16 w-full rounded-card" />
      <Skeleton className="h-16 w-full rounded-card" />
    </div>
  )
}

export function ServicesHubPage() {
  const [tab, setTab] = useState('projects')

  return (
    <div className="flex flex-col">
      <div className="border-b border-border bg-bg p-4 no-print">
        <h1 className="mb-3 text-xl font-semibold text-text">Services</h1>
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
        {tab === 'projects' && <ProjectsPage />}
        {tab === 'contracts' && <ContractsPage />}
      </Suspense>
    </div>
  )
}
