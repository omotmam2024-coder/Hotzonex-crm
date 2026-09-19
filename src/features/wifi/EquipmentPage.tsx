import { PlusIcon, RouterIcon, SearchIcon } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { useAuth } from '@/hooks/useAuth'
import { useDebounced } from '@/hooks/useDebounced'
import { useUnitLabels } from '@/hooks/useUnitLabels'
import { formatDate } from '@/lib/format'
import { can } from '@/lib/permissions'
import { EquipmentDrawer } from './EquipmentDrawer'
import { EquipmentFormDialog } from './EquipmentFormDialog'
import { EQUIPMENT_STATUS_LABEL, EQUIPMENT_TYPE_LABEL, useEquipmentList, type EquipmentFilters } from './useEquipment'

const STATUS_VARIANT: Record<string, 'success' | 'info' | 'danger' | 'muted'> = {
  in_stock: 'info',
  deployed: 'success',
  faulty: 'danger',
  retired: 'muted',
}

const DEFAULT_FILTERS: EquipmentFilters = { search: '', status: 'all', equipmentType: 'all', businessUnit: 'all' }

export function EquipmentPage() {
  const { profile } = useAuth()
  const UNIT_LABEL = useUnitLabels()
  const [searchParams, setSearchParams] = useSearchParams()
  const [filters, setFilters] = useState<EquipmentFilters>(DEFAULT_FILTERS)
  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebounced(searchInput, 350)
  const [newOpen, setNewOpen] = useState(false)
  const canWrite = can(profile, 'create')

  const openEquipment = searchParams.get('equipment')
  const activeFilters: EquipmentFilters = { ...filters, search: debouncedSearch }
  const { data, isLoading, isError, refetch } = useEquipmentList(activeFilters)

  return (
    <div className="flex flex-col gap-3 p-4 md:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-text">Equipment</h2>
        {canWrite && (
          <Button onClick={() => setNewOpen(true)}>
            <PlusIcon /> New equipment
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 basis-56">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-muted" />
          <Input
            placeholder="Search label, code, serial, MAC or IP…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filters.status} onValueChange={(v) => setFilters((f) => ({ ...f, status: v as EquipmentFilters['status'] }))}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="in_stock">In stock</SelectItem>
            <SelectItem value="deployed">Deployed</SelectItem>
            <SelectItem value="faulty">Faulty</SelectItem>
            <SelectItem value="retired">Retired</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filters.equipmentType}
          onValueChange={(v) => setFilters((f) => ({ ...f, equipmentType: v as EquipmentFilters['equipmentType'] }))}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {Object.entries(EQUIPMENT_TYPE_LABEL).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.businessUnit}
          onValueChange={(v) => setFilters((f) => ({ ...f, businessUnit: v as EquipmentFilters['businessUnit'] }))}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All units</SelectItem>
            <SelectItem value="wifi">{UNIT_LABEL.wifi}</SelectItem>
            <SelectItem value="services">{UNIT_LABEL.services}</SelectItem>
            <SelectItem value="refreshment">{UNIT_LABEL.refreshment}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <SkeletonRows />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : !data || data.length === 0 ? (
        <EmptyState icon={RouterIcon} title="No equipment yet" description="Routers and other devices you record will show up here." />
      ) : (
        <div className="flex flex-col gap-2">
          {data.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => setSearchParams({ equipment: e.id })}
              className="flex flex-col gap-1.5 rounded-card border border-border bg-surface p-3 text-left hover:bg-surface-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-text">{e.label}</p>
                <Badge variant={STATUS_VARIANT[e.status]}>{EQUIPMENT_STATUS_LABEL[e.status]}</Badge>
              </div>
              <p className="text-xs text-text-muted">
                {e.equipment_code} · {EQUIPMENT_TYPE_LABEL[e.equipment_type]}
                {e.brand || e.model ? ` · ${[e.brand, e.model].filter(Boolean).join(' ')}` : ''}
                {e.ip_address ? ` · ${e.ip_address}` : ''}
              </p>
              <p className="text-xs text-text-muted">
                {e.customers?.display_name ? `${e.customers.display_name} · ` : ''}
                {e.locations?.name ? `${e.locations.name} · ` : ''}
                added {formatDate(e.created_at)}
              </p>
            </button>
          ))}
        </div>
      )}

      <EquipmentDrawer equipmentId={openEquipment} onClose={() => setSearchParams({})} />
      <EquipmentFormDialog open={newOpen} onOpenChange={setNewOpen} />
    </div>
  )
}
