import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useLocations } from '@/hooks/useLocations'
import { useProfiles } from '@/hooks/useProfiles'
import { useUnitLabels } from '@/hooks/useUnitLabels'
import type { ReportFilters } from './useReports'

interface ReportFilterBarProps {
  filters: ReportFilters
  onChange: (filters: ReportFilters) => void
  showUnit?: boolean
  showLocation?: boolean
  showOwner?: boolean
  ownerLabel?: string
}

export function ReportFilterBar({
  filters,
  onChange,
  showUnit = true,
  showLocation = true,
  showOwner = false,
  ownerLabel = 'Owner',
}: ReportFilterBarProps) {
  const { data: locations } = useLocations()
  const { data: profiles } = useProfiles()
  const UNIT_LABEL = useUnitLabels()

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        type="date"
        value={filters.from}
        onChange={(e) => onChange({ ...filters, from: e.target.value })}
        className="w-36"
      />
      <span className="text-xs text-text-muted">to</span>
      <Input
        type="date"
        value={filters.to}
        onChange={(e) => onChange({ ...filters, to: e.target.value })}
        className="w-36"
      />
      {showUnit && (
        <Select value={filters.businessUnit} onValueChange={(v) => onChange({ ...filters, businessUnit: v as ReportFilters['businessUnit'] })}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All units</SelectItem>
            <SelectItem value="wifi">{UNIT_LABEL.wifi}</SelectItem>
            <SelectItem value="services">{UNIT_LABEL.services}</SelectItem>
            <SelectItem value="refreshment">{UNIT_LABEL.refreshment}</SelectItem>
          </SelectContent>
        </Select>
      )}
      {showLocation && (
        <Select value={filters.locationId} onValueChange={(v) => onChange({ ...filters, locationId: v })}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All locations</SelectItem>
            {locations?.map((l) => (
              <SelectItem key={l.id} value={l.id}>
                {l.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {showOwner && (
        <Select value={filters.ownerId} onValueChange={(v) => onChange({ ...filters, ownerId: v })}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder={ownerLabel} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{ownerLabel}: anyone</SelectItem>
            {profiles?.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.full_name || p.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  )
}
