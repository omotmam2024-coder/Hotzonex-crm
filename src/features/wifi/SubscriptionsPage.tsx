import { useQuery, useQueryClient } from '@tanstack/react-query'
import { PlusIcon, WifiIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { SkeletonRows } from '@/components/shared/SkeletonRows'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatDate, formatMoney } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import { RenewSubscriptionDialog } from './RenewSubscriptionDialog'
import { SubscriptionFormDialog } from './SubscriptionFormDialog'
import { SuspendSubscriptionDialog } from './SuspendSubscriptionDialog'

interface SubscriptionRow {
  id: string
  subscription_code: string | null
  end_date: string
  monthly_fee: number
  currency: 'SSP' | 'USD'
  status: string
  customers: { display_name: string | null } | null
  service_plans: { name: string } | null
}

function daysLeft(endDate: string) {
  const diff = Math.ceil((new Date(endDate).getTime() - Date.now()) / 86_400_000)
  return diff
}

function useSubscriptionsList() {
  return useQuery({
    queryKey: ['subscriptions', 'list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('id, subscription_code, end_date, monthly_fee, currency, status, customers(display_name), service_plans(name)')
        .order('end_date')
        .limit(200)
      if (error) throw error
      return data as unknown as SubscriptionRow[]
    },
  })
}

export function SubscriptionsPage() {
  const { data: subs, isLoading, isError, refetch } = useSubscriptionsList()
  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [renewTarget, setRenewTarget] = useState<SubscriptionRow | null>(null)
  const [suspendId, setSuspendId] = useState<string | null>(null)

  async function resume(id: string) {
    const { error } = await supabase.rpc('fn_resume_subscription', { p_subscription_id: id })
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('Subscription resumed')
    await queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
  }

  return (
    <div className="flex flex-col gap-3 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text">Subscriptions</h2>
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <PlusIcon /> New subscription
        </Button>
      </div>

      {isLoading ? (
        <SkeletonRows />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : !subs || subs.length === 0 ? (
        <EmptyState
          icon={WifiIcon}
          title="No subscriptions yet"
          description="Add a home or office internet subscription to start tracking renewals."
          action={
            <Button onClick={() => setFormOpen(true)}>
              <PlusIcon /> New subscription
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-2">
          {subs.map((s) => {
            const dl = daysLeft(s.end_date)
            return (
              <div key={s.id} className="flex items-center justify-between gap-3 rounded-card border border-border bg-surface p-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-text">{s.customers?.display_name}</p>
                    <StatusBadge status={s.status} />
                  </div>
                  <p className="text-xs text-text-muted">
                    {s.service_plans?.name} · {formatMoney(s.monthly_fee, s.currency)}/mo · Ends {formatDate(s.end_date)}{' '}
                    {s.status !== 'cancelled' && (
                      <span className={dl < 0 ? 'text-danger' : dl <= 7 ? 'text-warning' : ''}>
                        ({dl < 0 ? `${Math.abs(dl)}d overdue` : `${dl}d left`})
                      </span>
                    )}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      Actions
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => setRenewTarget(s)}>Renew</DropdownMenuItem>
                    {s.status === 'suspended' ? (
                      <DropdownMenuItem onSelect={() => void resume(s.id)}>Resume</DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem variant="destructive" onSelect={() => setSuspendId(s.id)}>
                        Suspend
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )
          })}
        </div>
      )}

      <SubscriptionFormDialog open={formOpen} onOpenChange={setFormOpen} />
      <RenewSubscriptionDialog
        subscriptionId={renewTarget?.id ?? null}
        monthlyFee={renewTarget?.monthly_fee ?? 0}
        onClose={() => setRenewTarget(null)}
      />
      <SuspendSubscriptionDialog subscriptionId={suspendId} onClose={() => setSuspendId(null)} />
    </div>
  )
}
