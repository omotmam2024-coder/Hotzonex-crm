import { useQueryClient } from '@tanstack/react-query'
import { PackageIcon, PencilIcon, PlusIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { SkeletonRows } from '@/components/shared/SkeletonRows'
import { formatMoney } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import { ServicePlanFormDialog } from './ServicePlanFormDialog'
import { useServicePlans } from './useServicePlans'

function describeDuration(plan: { duration_hours: number | null; duration_days: number | null }) {
  if (plan.duration_hours) return `${plan.duration_hours}h`
  if (plan.duration_days) return `${plan.duration_days}d`
  return '—'
}

export function ServicePlansPage() {
  const { data: plans, isLoading, isError, refetch } = useServicePlans()
  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [editId, setEditId] = useState<string | undefined>(undefined)

  async function toggleActive(id: string, isActive: boolean) {
    const { error } = await supabase.from('service_plans').update({ is_active: !isActive }).eq('id', id)
    if (error) toast.error(error.message)
    else await queryClient.invalidateQueries({ queryKey: ['service_plans'] })
  }

  return (
    <div className="flex flex-col gap-3 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text">Service plans</h2>
        <Button
          size="sm"
          onClick={() => {
            setEditId(undefined)
            setFormOpen(true)
          }}
        >
          <PlusIcon /> New plan
        </Button>
      </div>

      {isLoading ? (
        <SkeletonRows />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : !plans || plans.length === 0 ? (
        <EmptyState
          icon={PackageIcon}
          title="No service plans yet"
          description="Add hotspot and home/office plans to start selling vouchers and subscriptions."
          action={
            <Button onClick={() => setFormOpen(true)}>
              <PlusIcon /> New plan
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-2">
          {plans.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 rounded-card border border-border bg-surface p-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate font-medium text-text">{p.name}</p>
                  <Badge variant="muted">{p.code}</Badge>
                  {!p.is_active && <Badge variant="danger">Inactive</Badge>}
                </div>
                <p className="text-xs text-text-muted">
                  {formatMoney(p.price_ssp, 'SSP')}
                  {p.price_usd ? ` · ${formatMoney(p.price_usd, 'USD')}` : ''} · {describeDuration(p)} ·{' '}
                  {p.device_limit} device{p.device_limit === 1 ? '' : 's'}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Switch checked={p.is_active} onCheckedChange={() => void toggleActive(p.id, p.is_active)} />
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Edit plan"
                  onClick={() => {
                    setEditId(p.id)
                    setFormOpen(true)
                  }}
                >
                  <PencilIcon className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ServicePlanFormDialog open={formOpen} onOpenChange={setFormOpen} planId={editId} />
    </div>
  )
}
