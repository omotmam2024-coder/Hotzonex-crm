import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { EmptyState } from '@/components/shared/EmptyState'
import { formatDate, formatMoney } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import { ClipboardListIcon } from 'lucide-react'

interface ResellerDetailSheetProps {
  resellerId: string | null
  onClose: () => void
}

function useResellerStats(resellerId: string | null) {
  return useQuery({
    queryKey: ['resellers', 'stats', resellerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vouchers')
        .select('status, price_sold, currency')
        .eq('reseller_id', resellerId!)
      if (error) throw error
      const allocated = data.length
      const sold = data.filter((v) => v.status === 'sold').length
      const grossByCurrency = new Map<string, number>()
      for (const v of data) {
        if (v.status === 'sold' && v.price_sold) {
          grossByCurrency.set(v.currency, (grossByCurrency.get(v.currency) ?? 0) + v.price_sold)
        }
      }
      return { allocated, sold, available: allocated - sold, gross: [...grossByCurrency.entries()] }
    },
    enabled: !!resellerId,
  })
}

function useSettlements(resellerId: string | null) {
  return useQuery({
    queryKey: ['reseller_settlements', resellerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reseller_settlements')
        .select('*')
        .eq('reseller_id', resellerId!)
        .order('period_end', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!resellerId,
  })
}

export function ResellerDetailSheet({ resellerId, onClose }: ResellerDetailSheetProps) {
  const queryClient = useQueryClient()
  const { data: stats } = useResellerStats(resellerId)
  const { data: settlements } = useSettlements(resellerId)
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')
  const [saving, setSaving] = useState(false)

  async function recordSettlement() {
    if (!resellerId || !periodStart || !periodEnd) return
    setSaving(true)
    const { data: userData } = await supabase.auth.getUser()
    // Scoped to SSP: vouchers are sold almost exclusively in SSP, and a
    // settlement can't honestly sum gross/commission across currencies.
    const { data: sold, error: soldError } = await supabase
      .from('vouchers')
      .select('price_sold, currency')
      .eq('reseller_id', resellerId)
      .eq('status', 'sold')
      .eq('currency', 'SSP')
      .gte('sold_at', periodStart)
      .lte('sold_at', periodEnd)
    if (soldError) {
      toast.error(soldError.message)
      setSaving(false)
      return
    }
    const { data: reseller } = await supabase.from('resellers').select('commission_rate').eq('id', resellerId).single()
    const gross = sold.reduce((sum, v) => sum + (v.price_sold ?? 0), 0)
    const commission = gross * ((reseller?.commission_rate ?? 0) / 100)

    const { error } = await supabase.from('reseller_settlements').insert({
      reseller_id: resellerId,
      period_start: periodStart,
      period_end: periodEnd,
      vouchers_sold: sold.length,
      gross_amount: gross,
      commission,
      created_by: userData.user?.id,
    })
    setSaving(false)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('Settlement recorded')
    setPeriodStart('')
    setPeriodEnd('')
    await queryClient.invalidateQueries({ queryKey: ['reseller_settlements', resellerId] })
  }

  return (
    <Sheet open={!!resellerId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="flex w-full flex-col gap-4 overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Reseller performance</SheetTitle>
        </SheetHeader>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-card border border-border bg-surface p-3 text-center">
            <p className="text-xl font-semibold text-text">{stats?.allocated ?? '—'}</p>
            <p className="text-xs text-text-muted">Allocated</p>
          </div>
          <div className="rounded-card border border-border bg-surface p-3 text-center">
            <p className="text-xl font-semibold text-text">{stats?.sold ?? '—'}</p>
            <p className="text-xs text-text-muted">Sold</p>
          </div>
          <div className="rounded-card border border-border bg-surface p-3 text-center">
            <p className="text-xl font-semibold text-text">{stats?.available ?? '—'}</p>
            <p className="text-xs text-text-muted">Available</p>
          </div>
        </div>

        {stats && stats.gross.length > 0 && (
          <p className="text-sm text-text-muted">
            Lifetime gross: {stats.gross.map(([c, v]) => formatMoney(v, c as 'SSP' | 'USD')).join(' + ')}
          </p>
        )}

        <div className="rounded-card border border-border p-3">
          <h3 className="mb-2 text-sm font-semibold text-text">Record settlement</h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <Label htmlFor="periodStart" className="text-xs">
                From
              </Label>
              <Input id="periodStart" type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="periodEnd" className="text-xs">
                To
              </Label>
              <Input id="periodEnd" type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
            </div>
          </div>
          <Button
            className="mt-2 w-full"
            size="sm"
            disabled={saving || !periodStart || !periodEnd}
            onClick={() => void recordSettlement()}
          >
            {saving ? 'Calculating…' : 'Calculate & record'}
          </Button>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold text-text">Settlement history</h3>
          {!settlements || settlements.length === 0 ? (
            <EmptyState icon={ClipboardListIcon} title="No settlements yet" />
          ) : (
            <div className="flex flex-col gap-2">
              {settlements.map((s) => (
                <div key={s.id} className="rounded-lg border border-border p-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text">
                      {formatDate(s.period_start)} – {formatDate(s.period_end)}
                    </span>
                    <span className="text-text-muted">{s.vouchers_sold} sold</span>
                  </div>
                  <div className="mt-1 flex justify-between text-xs text-text-muted">
                    <span>Gross {formatMoney(s.gross_amount, 'SSP')}</span>
                    <span>Commission {formatMoney(s.commission, 'SSP')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
