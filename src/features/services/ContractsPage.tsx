import { differenceInCalendarDays } from 'date-fns'
import { FileSignatureIcon, PlusIcon } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { SkeletonRows } from '@/components/shared/SkeletonRows'
import { useAuth } from '@/hooks/useAuth'
import { can } from '@/lib/permissions'
import { formatDate, formatMoney } from '@/lib/format'
import { ContractFormDialog } from './ContractFormDialog'
import { useContracts } from './useContracts'

function RenewalBadge({ renewalDate, autoRenew }: { renewalDate: string | null; autoRenew: boolean }) {
  if (!renewalDate) return null
  const days = differenceInCalendarDays(new Date(renewalDate), new Date())
  const variant = days < 0 ? 'danger' : days <= 7 ? 'danger' : days <= 30 ? 'warning' : 'muted'
  const label = days < 0 ? `Renewal overdue (${formatDate(renewalDate)})` : `Renews in ${days}d (${formatDate(renewalDate)})`
  return (
    <Badge variant={variant}>
      {label}
      {!autoRenew ? ' · manual' : ''}
    </Badge>
  )
}

export function ContractsPage() {
  const { profile } = useAuth()
  const { data, isLoading, isError, refetch } = useContracts()
  const [formOpen, setFormOpen] = useState(false)
  const [editId, setEditId] = useState<string | undefined>(undefined)
  const canWrite = can(profile, 'create')

  return (
    <div className="flex flex-col gap-3 p-4 md:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-text">Contracts & retainers</h2>
        {canWrite && (
          <Button
            onClick={() => {
              setEditId(undefined)
              setFormOpen(true)
            }}
          >
            <PlusIcon /> New contract
          </Button>
        )}
      </div>

      {isLoading ? (
        <SkeletonRows />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : !data || data.length === 0 ? (
        <EmptyState icon={FileSignatureIcon} title="No contracts yet" description="Retainers and monthly service contracts show up here." />
      ) : (
        <div className="flex flex-col gap-2">
          {data.map((c) => {
            const rowContent = (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-text">{c.title}</p>
                  <span className="text-sm text-text">{formatMoney(c.monthly_amount, c.currency)}/mo</span>
                </div>
                <p className="text-xs text-text-muted">
                  {c.customers?.display_name} · {c.contract_code} · since {formatDate(c.start_date)} · created{' '}
                  {formatDate(c.created_at)}
                </p>
                <div className="flex flex-wrap items-center gap-1.5">
                  {!c.is_active && <Badge variant="muted">Inactive</Badge>}
                  <RenewalBadge renewalDate={c.renewal_date} autoRenew={c.auto_renew} />
                </div>
              </>
            )
            // Only writers can open the edit dialog — same gate as the "New
            // contract" button above; a viewer gets a plain read-only row
            // rather than a form whose Save would just be rejected by RLS.
            return canWrite ? (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setEditId(c.id)
                  setFormOpen(true)
                }}
                className="flex flex-col gap-1.5 rounded-card border border-border bg-surface p-3 text-left hover:bg-surface-2"
              >
                {rowContent}
              </button>
            ) : (
              <div key={c.id} className="flex flex-col gap-1.5 rounded-card border border-border bg-surface p-3">
                {rowContent}
              </div>
            )
          })}
        </div>
      )}

      <ContractFormDialog open={formOpen} onOpenChange={setFormOpen} contractId={editId} />
    </div>
  )
}
