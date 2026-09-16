import type { ColumnDef } from '@tanstack/react-table'
import { LayoutGridIcon, PlusIcon, TableIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DataTable } from '@/components/shared/DataTable'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { SkeletonRows } from '@/components/shared/SkeletonRows'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { useAuth } from '@/hooks/useAuth'
import { useUnitLabels } from '@/hooks/useUnitLabels'
import { formatDate, formatMoney } from '@/lib/format'
import type { Database } from '@/types/database'
import { DealDrawer } from './DealDrawer'
import { DealFormDialog } from './DealFormDialog'
import { KanbanBoard } from './KanbanBoard'
import { useDealsByUnit, useSettingValue } from './useDeals'
import { usePipelines } from './usePipelines'

type BusinessUnit = Database['public']['Enums']['business_unit']

export function PipelinePage() {
  const { profile } = useAuth()
  const UNIT_LABEL = useUnitLabels()
  const [searchParams, setSearchParams] = useSearchParams()
  const [unit, setUnit] = useState<BusinessUnit>((profile?.business_units[0] as BusinessUnit) ?? 'wifi')
  const [view, setView] = useState<'kanban' | 'table'>('kanban')
  const [newDealOpen, setNewDealOpen] = useState(false)

  const { data: pipelines } = usePipelines()
  const { data: deals, isLoading, isError, refetch } = useDealsByUnit(unit)
  const { data: dealRotDays } = useSettingValue('deal_rot_days', 14)

  const pipeline = pipelines?.find((p) => p.business_unit === unit && p.is_default)
  const openDeal = searchParams.get('deal')

  const columns: ColumnDef<import('./useDeals').DealRow, unknown>[] = useMemo(
    () => [
      { header: 'Deal', accessorKey: 'title' },
      {
        header: 'Customer',
        accessorKey: 'customers',
        cell: ({ row }) => row.original.customers?.display_name ?? '—',
      },
      {
        header: 'Value',
        accessorKey: 'value',
        cell: ({ row }) => formatMoney(row.original.value, row.original.currency),
      },
      { header: 'Status', accessorKey: 'status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
      {
        header: 'Expected close',
        accessorKey: 'expected_close',
        cell: ({ row }) => (row.original.expected_close ? formatDate(row.original.expected_close) : '—'),
      },
    ],
    [],
  )

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-3 border-b border-border bg-bg p-4 no-print">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-semibold text-text">Pipeline</h1>
          <Button onClick={() => setNewDealOpen(true)}>
            <PlusIcon /> New deal
          </Button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Tabs value={unit} onValueChange={(v) => setUnit(v as BusinessUnit)}>
            <TabsList>
              {(['wifi', 'services', 'refreshment'] as BusinessUnit[]).map((u) => (
                <TabsTrigger key={u} value={u}>
                  {UNIT_LABEL[u]}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="flex gap-1 rounded-lg border border-border p-0.5">
            <Button
              variant={view === 'kanban' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => setView('kanban')}
            >
              <LayoutGridIcon className="size-4" /> Board
            </Button>
            <Button
              variant={view === 'table' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => setView('table')}
            >
              <TableIcon className="size-4" /> Table
            </Button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <SkeletonRows />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : !deals || !pipeline || pipeline.pipeline_stages.length === 0 ? (
        <EmptyState
          icon={LayoutGridIcon}
          title="No pipeline configured"
          description={`Ask an admin to set up stages for ${UNIT_LABEL[unit]}.`}
        />
      ) : deals.length === 0 ? (
        <EmptyState
          icon={LayoutGridIcon}
          title="No deals yet"
          description={`Add your first ${UNIT_LABEL[unit]} deal to start tracking it through the pipeline.`}
          action={
            <Button onClick={() => setNewDealOpen(true)}>
              <PlusIcon /> New deal
            </Button>
          }
        />
      ) : view === 'kanban' ? (
        <KanbanBoard
          stages={pipeline.pipeline_stages}
          deals={deals}
          businessUnit={unit}
          dealRotDays={dealRotDays ?? 14}
          onOpenDeal={(id) => setSearchParams({ deal: id })}
        />
      ) : (
        <DataTable
          columns={columns}
          data={deals}
          getRowId={(d) => d.id}
          onRowClick={(d) => setSearchParams({ deal: d.id })}
          renderCard={(d) => (
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium text-text">{d.title}</p>
                <p className="text-xs text-text-muted">{d.customers?.display_name}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-sm text-text">{formatMoney(d.value, d.currency)}</span>
                <StatusBadge status={d.status} />
              </div>
            </div>
          )}
        />
      )}

      <DealDrawer dealId={openDeal} onClose={() => setSearchParams({})} />
      <DealFormDialog open={newDealOpen} onOpenChange={setNewDealOpen} defaultBusinessUnit={unit} />
    </div>
  )
}
