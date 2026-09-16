import { useQueryClient } from '@tanstack/react-query'
import { PackageIcon, PlusIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { SkeletonRows } from '@/components/shared/SkeletonRows'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { useAuth } from '@/hooks/useAuth'
import { can } from '@/lib/permissions'
import { formatDate, formatMoney } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'
import { SupplierOrderFormDialog } from './SupplierOrderFormDialog'
import { useSupplierOrders } from './useSupplierOrders'

type OrderStatus = Database['public']['Enums']['supplier_order_status']

const NEXT_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  ordered: ['received', 'partial', 'cancelled'],
  partial: ['received', 'cancelled'],
  received: [],
  cancelled: [],
}

export function SupplierOrdersPage() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const { data: orders, isLoading, isError, refetch } = useSupplierOrders()
  const [formOpen, setFormOpen] = useState(false)
  const canWrite = can(profile, 'create')

  async function setStatus(id: string, status: OrderStatus) {
    const patch: { status: OrderStatus; received_date?: string } = { status }
    if (status === 'received') patch.received_date = new Date().toISOString().slice(0, 10)
    const { error } = await supabase.from('supplier_orders').update(patch).eq('id', id)
    if (error) {
      toast.error(error.message)
      return
    }
    await queryClient.invalidateQueries({ queryKey: ['supplier_orders'] })
  }

  return (
    <div className="flex flex-col gap-3 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text">Supplier orders</h2>
        {canWrite && (
          <Button size="sm" onClick={() => setFormOpen(true)}>
            <PlusIcon /> New order
          </Button>
        )}
      </div>

      {isLoading ? (
        <SkeletonRows />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : !orders || orders.length === 0 ? (
        <EmptyState icon={PackageIcon} title="No supplier orders yet" description="Track orders and receiving status here." />
      ) : (
        <div className="flex flex-col gap-2">
          {orders.map((o) => (
            <div key={o.id} className="flex flex-col gap-2 rounded-card border border-border bg-surface p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-text">{o.suppliers?.name}</p>
                  <StatusBadge status={o.status} />
                </div>
                <span className="text-sm text-text">{formatMoney(o.total, o.currency)}</span>
              </div>
              <p className="text-xs text-text-muted">
                {o.order_code} · Ordered {formatDate(o.order_date)}
                {o.expected_date ? ` · Expected ${formatDate(o.expected_date)}` : ''}
                {o.items.length ? ` · ${o.items.length} item(s)` : ''}
              </p>
              {canWrite && NEXT_STATUSES[o.status].length > 0 && (
                <div className="flex gap-2">
                  {NEXT_STATUSES[o.status].map((s) => (
                    <Button key={s} size="sm" variant="outline" onClick={() => void setStatus(o.id, s)}>
                      Mark {s}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <SupplierOrderFormDialog open={formOpen} onOpenChange={setFormOpen} />
    </div>
  )
}
