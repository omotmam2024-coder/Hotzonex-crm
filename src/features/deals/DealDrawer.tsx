import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { CurrencyInput } from '@/components/shared/CurrencyInput'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { LogActivityModal } from '@/features/activities/LogActivityModal'
import { useProfiles } from '@/hooks/useProfiles'
import { formatDate, formatRelative } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'
import { usePipelines } from './usePipelines'

interface DealDrawerProps {
  dealId: string | null
  onClose: () => void
}

export function DealDrawer({ dealId, onClose }: DealDrawerProps) {
  const queryClient = useQueryClient()
  const { data: profiles } = useProfiles()
  const { data: pipelines } = usePipelines()
  const [logOpen, setLogOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const { data: deal, refetch } = useQuery({
    queryKey: ['deals', 'detail', dealId],
    queryFn: async () => {
      const { data, error } = await supabase.from('deals').select('*, customers(display_name)').eq('id', dealId!).single()
      if (error) throw error
      return data
    },
    enabled: !!dealId,
  })

  const { data: activities } = useQuery({
    queryKey: ['activities', 'byDeal', dealId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activities')
        .select('id, subject, body, occurred_at, type')
        .eq('deal_id', dealId!)
        .order('occurred_at', { ascending: false })
        .limit(20)
      if (error) throw error
      return data
    },
    enabled: !!dealId,
  })

  const [value, setValue] = useState<number | null>(null)
  const [currency, setCurrency] = useState<Database['public']['Enums']['currency_code']>('SSP')
  const [stageId, setStageId] = useState('')
  const [ownerId, setOwnerId] = useState<string | null>(null)

  useEffect(() => {
    if (deal) {
      setValue(deal.value)
      setCurrency(deal.currency)
      setStageId(deal.stage_id)
      setOwnerId(deal.owner_id)
    }
  }, [deal])

  const pipeline = pipelines?.find((p) => p.id === deal?.pipeline_id)

  async function save() {
    if (!dealId) return
    setSaving(true)
    const { error } = await supabase
      .from('deals')
      .update({ value: value ?? 0, currency, stage_id: stageId, owner_id: ownerId })
      .eq('id', dealId)
    setSaving(false)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('Deal updated')
    await queryClient.invalidateQueries({ queryKey: ['deals'] })
    await refetch()
  }

  return (
    <Sheet open={!!dealId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="flex w-full flex-col gap-4 overflow-y-auto sm:max-w-md">
        {deal && (
          <>
            <SheetHeader>
              <div className="flex items-center gap-2">
                <SheetTitle>{deal.title}</SheetTitle>
                <StatusBadge status={deal.status} />
              </div>
              <p className="text-xs text-text-muted">
                {deal.deal_code} · {deal.customers?.display_name}
              </p>
            </SheetHeader>

            {deal.status === 'lost' && deal.lost_reason && (
              <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
                Lost: {deal.lost_reason}
              </p>
            )}

            <div className="flex flex-col gap-1.5">
              <Label>Value</Label>
              <CurrencyInput
                amount={value}
                onAmountChange={setValue}
                currency={currency}
                onCurrencyChange={setCurrency}
                disabled={deal.status !== 'open'}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Stage</Label>
              <Select value={stageId} onValueChange={setStageId} disabled={deal.status !== 'open'}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {pipeline?.pipeline_stages.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Owner</Label>
              <Select value={ownerId ?? '__none'} onValueChange={(v) => setOwnerId(v === '__none' ? null : v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Unassigned</SelectItem>
                  {profiles?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.full_name || p.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {deal.expected_close && (
              <div className="flex flex-col gap-1.5">
                <Label>Expected close</Label>
                <Input value={formatDate(deal.expected_close)} disabled />
              </div>
            )}

            <Button onClick={() => void save()} disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </Button>

            <div className="flex items-center justify-between border-t border-border pt-3">
              <h3 className="text-sm font-semibold text-text">Activity</h3>
              <Button variant="outline" size="sm" onClick={() => setLogOpen(true)}>
                Log activity
              </Button>
            </div>
            <div className="flex flex-col gap-2">
              {activities && activities.length > 0 ? (
                activities.map((a) => (
                  <div key={a.id} className="rounded-lg border border-border p-2 text-sm">
                    <div className="flex justify-between text-xs text-text-muted">
                      <span>{a.subject ?? a.type}</span>
                      <span>{formatRelative(a.occurred_at)}</span>
                    </div>
                    {a.body && <p className="mt-1 text-text">{a.body}</p>}
                  </div>
                ))
              ) : (
                <p className="text-sm text-text-muted">No activity logged for this deal yet.</p>
              )}
            </div>

            <LogActivityModal
              open={logOpen}
              onOpenChange={setLogOpen}
              customerId={deal.customer_id}
              customerLabel={deal.customers?.display_name ?? ''}
              onLogged={() => void queryClient.invalidateQueries({ queryKey: ['activities', 'byDeal', dealId] })}
            />
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
