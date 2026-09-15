import { useQuery } from '@tanstack/react-query'
import { PencilIcon, PlusIcon, UsersRoundIcon } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { SkeletonRows } from '@/components/shared/SkeletonRows'
import { formatPhoneLocal } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import { ResellerDetailSheet } from './ResellerDetailSheet'
import { ResellerFormDialog } from './ResellerFormDialog'

function useResellersList() {
  return useQuery({
    queryKey: ['resellers', 'list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resellers')
        .select('id, name, phone, commission_rate, is_active, locations(name)')
        .order('name')
      if (error) throw error
      return data
    },
  })
}

export function ResellersPage() {
  const { data: resellers, isLoading, isError, refetch } = useResellersList()
  const [formOpen, setFormOpen] = useState(false)
  const [editId, setEditId] = useState<string | undefined>(undefined)
  const [detailId, setDetailId] = useState<string | null>(null)

  return (
    <div className="flex flex-col gap-3 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text">Resellers</h2>
        <Button
          size="sm"
          onClick={() => {
            setEditId(undefined)
            setFormOpen(true)
          }}
        >
          <PlusIcon /> New reseller
        </Button>
      </div>

      {isLoading ? (
        <SkeletonRows />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : !resellers || resellers.length === 0 ? (
        <EmptyState
          icon={UsersRoundIcon}
          title="No resellers yet"
          description="Add a reseller to allocate voucher batches and track commissions."
          action={
            <Button onClick={() => setFormOpen(true)}>
              <PlusIcon /> New reseller
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-2">
          {resellers.map((r) => (
            <div
              key={r.id}
              className="flex cursor-pointer items-center justify-between gap-3 rounded-card border border-border bg-surface p-3 hover:bg-surface-2"
              onClick={() => setDetailId(r.id)}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate font-medium text-text">{r.name}</p>
                  {!r.is_active && <Badge variant="danger">Inactive</Badge>}
                </div>
                <p className="text-xs text-text-muted">
                  {formatPhoneLocal(r.phone)} · {r.commission_rate}% commission
                  {r.locations?.name ? ` · ${r.locations.name}` : ''}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Edit reseller"
                onClick={(e) => {
                  e.stopPropagation()
                  setEditId(r.id)
                  setFormOpen(true)
                }}
              >
                <PencilIcon className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <ResellerFormDialog open={formOpen} onOpenChange={setFormOpen} resellerId={editId} />
      <ResellerDetailSheet resellerId={detailId} onClose={() => setDetailId(null)} />
    </div>
  )
}
