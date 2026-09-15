import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangleIcon, SearchIcon, TicketIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { SkeletonRows } from '@/components/shared/SkeletonRows'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { useAuth } from '@/hooks/useAuth'
import { useDebounced } from '@/hooks/useDebounced'
import { formatDate, formatMoney } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import { VoidVoucherDialog } from './VoidVoucherDialog'

interface VoucherRow {
  id: string
  code: string
  status: string
  price_sold: number | null
  currency: 'SSP' | 'USD'
  sold_at: string | null
  created_at: string
  service_plans: { name: string } | null
  customers: { display_name: string | null } | null
}

interface StockRow {
  plan_name: string
  location_name: string | null
  available: number
  reorder_level: number
}

function useVoucherSearch(search: string) {
  return useQuery({
    queryKey: ['vouchers', 'search', search],
    queryFn: async () => {
      let q = supabase
        .from('vouchers')
        .select('id, code, status, price_sold, currency, sold_at, created_at, service_plans(name), customers(display_name)')
        .order('created_at', { ascending: false })
        .limit(50)
      if (search.trim()) q = q.ilike('code', `%${search.trim().toUpperCase()}%`)
      const { data, error } = await q
      if (error) throw error
      return data as unknown as VoucherRow[]
    },
  })
}

function useStockAlerts() {
  return useQuery({
    queryKey: ['v_voucher_stock'],
    queryFn: async () => {
      const { data, error } = await supabase.from('v_voucher_stock').select('*')
      if (error) throw error
      return (data as unknown as StockRow[]).filter((r) => r.available < r.reorder_level)
    },
    staleTime: 60_000,
  })
}

export function VouchersPage() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const [searchInput, setSearchInput] = useState('')
  const debounced = useDebounced(searchInput, 350)
  const { data: vouchers, isLoading, isError, refetch } = useVoucherSearch(debounced)
  const { data: lowStock } = useStockAlerts()
  const [voidTarget, setVoidTarget] = useState<VoucherRow | null>(null)
  const [voiding, setVoiding] = useState(false)

  const canVoid = useMemo(
    () => profile && ['owner', 'admin', 'manager'].includes(profile.role),
    [profile],
  )

  async function confirmVoid(reason: string) {
    if (!voidTarget) return
    setVoiding(true)
    const { error } = await supabase.rpc('fn_void_voucher', { p_voucher_id: voidTarget.id, p_reason: reason })
    setVoiding(false)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('Voucher voided')
    setVoidTarget(null)
    await queryClient.invalidateQueries({ queryKey: ['vouchers'] })
  }

  return (
    <div className="flex flex-col gap-3 p-4 md:p-6">
      <h2 className="text-lg font-semibold text-text">Vouchers</h2>

      {lowStock && lowStock.length > 0 && (
        <div className="flex flex-col gap-1 rounded-card border border-warning/40 bg-warning/10 p-3">
          <div className="flex items-center gap-2 text-sm font-medium text-warning">
            <AlertTriangleIcon className="size-4" /> Low stock
          </div>
          {lowStock.map((r, i) => (
            <p key={i} className="text-xs text-warning">
              {r.plan_name} at {r.location_name ?? 'unassigned location'}: {r.available} left (reorder at {r.reorder_level})
            </p>
          ))}
        </div>
      )}

      <div className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-muted" />
        <Input
          placeholder="Search by voucher code…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <SkeletonRows />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : !vouchers || vouchers.length === 0 ? (
        <EmptyState icon={TicketIcon} title="No vouchers found" />
      ) : (
        <div className="flex flex-col gap-2">
          {vouchers.map((v) => (
            <div key={v.id} className="flex items-center justify-between gap-3 rounded-card border border-border bg-surface p-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-mono text-sm font-medium text-text">{v.code}</p>
                  <StatusBadge status={v.status} />
                </div>
                <p className="text-xs text-text-muted">
                  {v.service_plans?.name}
                  {v.customers?.display_name ? ` · ${v.customers.display_name}` : ''}
                  {v.price_sold ? ` · ${formatMoney(v.price_sold, v.currency)}` : ''}
                  {v.sold_at ? ` · sold ${formatDate(v.sold_at)}` : ` · created ${formatDate(v.created_at)}`}
                </p>
              </div>
              {canVoid && v.status !== 'void' && v.status !== 'sold' && (
                <Badge
                  variant="outline"
                  className="cursor-pointer"
                  onClick={() => setVoidTarget(v)}
                >
                  Void
                </Badge>
              )}
            </div>
          ))}
        </div>
      )}

      <VoidVoucherDialog
        open={!!voidTarget}
        onOpenChange={(open) => !open && setVoidTarget(null)}
        code={voidTarget?.code}
        loading={voiding}
        onConfirm={confirmVoid}
      />
    </div>
  )
}
