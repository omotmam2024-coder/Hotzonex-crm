import { useQueryClient } from '@tanstack/react-query'
import { PencilIcon, PlusIcon, TruckIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { SkeletonRows } from '@/components/shared/SkeletonRows'
import { useAuth } from '@/hooks/useAuth'
import { can } from '@/lib/permissions'
import { supabase } from '@/lib/supabase'
import { SupplierFormDialog } from './SupplierFormDialog'
import { useSuppliers } from './useSuppliers'

export function SuppliersPage() {
  const { profile } = useAuth()
  const { data: suppliers, isLoading, isError, refetch } = useSuppliers()
  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [editId, setEditId] = useState<string | undefined>(undefined)
  const canManage = can(profile, 'manage_settings')

  async function toggleActive(id: string, isActive: boolean) {
    const { error } = await supabase.from('suppliers').update({ is_active: !isActive }).eq('id', id)
    if (error) toast.error(error.message)
    else await queryClient.invalidateQueries({ queryKey: ['suppliers'] })
  }

  return (
    <div className="flex flex-col gap-3 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text">Suppliers</h2>
        {canManage && (
          <Button
            size="sm"
            onClick={() => {
              setEditId(undefined)
              setFormOpen(true)
            }}
          >
            <PlusIcon /> New supplier
          </Button>
        )}
      </div>

      {isLoading ? (
        <SkeletonRows />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : !suppliers || suppliers.length === 0 ? (
        <EmptyState icon={TruckIcon} title="No suppliers yet" description="Add beverage, food and consumables suppliers to start tracking orders." />
      ) : (
        <div className="flex flex-col gap-2">
          {suppliers.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-3 rounded-card border border-border bg-surface p-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate font-medium text-text">{s.name}</p>
                  <Badge variant="muted">{s.category}</Badge>
                  {!s.is_active && <Badge variant="danger">Inactive</Badge>}
                </div>
                <p className="text-xs text-text-muted">
                  {s.phone ?? '—'} {s.payment_terms ? `· ${s.payment_terms}` : ''}
                </p>
              </div>
              {canManage && (
                <div className="flex shrink-0 items-center gap-2">
                  <Switch checked={s.is_active} onCheckedChange={() => void toggleActive(s.id, s.is_active)} />
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Edit supplier"
                    onClick={() => {
                      setEditId(s.id)
                      setFormOpen(true)
                    }}
                  >
                    <PencilIcon className="size-4" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <SupplierFormDialog open={formOpen} onOpenChange={setFormOpen} supplierId={editId} />
    </div>
  )
}
