import { DndContext, DragOverlay, useDraggable, useDroppable, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core'
import { useQueryClient } from '@tanstack/react-query'
import { AlertTriangleIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { formatMoney } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { LostReasonDialog } from './LostReasonDialog'
import type { DealRow } from './useDeals'

interface Stage {
  id: string
  name: string
  probability: number
  is_won: boolean
  is_lost: boolean
}

interface KanbanBoardProps {
  stages: Stage[]
  deals: DealRow[]
  businessUnit: string
  dealRotDays: number
  onOpenDeal: (dealId: string) => void
}

function summarizeByCurrency(deals: DealRow[], weightedBy?: Map<string, number>) {
  const totals = new Map<string, number>()
  for (const d of deals) {
    const amount = weightedBy ? d.value * ((weightedBy.get(d.stage_id) ?? 0) / 100) : d.value
    totals.set(d.currency, (totals.get(d.currency) ?? 0) + amount)
  }
  return [...totals.entries()]
}

function isRotting(deal: DealRow, dealRotDays: number) {
  if (deal.status !== 'open' || !deal.last_activity_at) return false
  const days = (Date.now() - new Date(deal.last_activity_at).getTime()) / 86_400_000
  return days > dealRotDays
}

function DealCard({ deal, rotting, onOpen }: { deal: DealRow; rotting: boolean; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: deal.id })
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={onOpen}
      style={transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined}
      className={cn(
        'cursor-grab touch-none rounded-lg border bg-surface p-2.5 text-sm shadow-sm active:cursor-grabbing',
        rotting ? 'border-warning/50' : 'border-border',
        isDragging && 'opacity-50',
      )}
    >
      <div className="flex items-start justify-between gap-1">
        <p className="line-clamp-2 font-medium text-text">{deal.title}</p>
        {rotting && <AlertTriangleIcon className="size-3.5 shrink-0 text-warning" />}
      </div>
      <p className="truncate text-xs text-text-muted">{deal.customers?.display_name}</p>
      <p className="mt-1 text-sm font-medium text-text">{formatMoney(deal.value, deal.currency)}</p>
    </div>
  )
}

function Column({
  stage,
  deals,
  dealRotDays,
  onOpenDeal,
}: {
  stage: Stage
  deals: DealRow[]
  dealRotDays: number
  onOpenDeal: (id: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id })
  const weighted = summarizeByCurrency(deals, new Map([[stage.id, stage.probability]]))

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex w-72 shrink-0 flex-col gap-2 rounded-card border border-border bg-bg p-2',
        isOver && 'ring-2 ring-accent',
      )}
    >
      <div className="px-1">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text">{stage.name}</h3>
          <span className="text-xs text-text-muted">{deals.length}</span>
        </div>
        <p className="text-xs text-text-muted">
          {weighted.length === 0 ? formatMoney(0) : weighted.map(([c, v]) => formatMoney(v, c as 'SSP' | 'USD')).join(' + ')}
        </p>
      </div>
      <div className="flex min-h-16 flex-col gap-2">
        {deals.map((d) => (
          <DealCard key={d.id} deal={d} rotting={isRotting(d, dealRotDays)} onOpen={() => onOpenDeal(d.id)} />
        ))}
      </div>
    </div>
  )
}

export function KanbanBoard({ stages, deals, businessUnit, dealRotDays, onOpenDeal }: KanbanBoardProps) {
  const queryClient = useQueryClient()
  const [activeDeal, setActiveDeal] = useState<DealRow | null>(null)
  const [pendingLost, setPendingLost] = useState<{ dealId: string; stageId: string } | null>(null)

  const queryKey = ['deals', 'byUnit', businessUnit]

  async function moveDeal(dealId: string, stageId: string, extra: Record<string, unknown> = {}) {
    const previous = queryClient.getQueryData<DealRow[]>(queryKey)
    queryClient.setQueryData<DealRow[]>(queryKey, (old) =>
      old?.map((d) => (d.id === dealId ? { ...d, stage_id: stageId, ...(extra as Partial<DealRow>) } : d)),
    )

    const fromStage = previous?.find((d) => d.id === dealId)?.stage_id
    const { error } = await supabase.from('deals').update({ stage_id: stageId, ...extra }).eq('id', dealId)

    if (error) {
      queryClient.setQueryData(queryKey, previous)
      toast.error(error.message)
      return
    }

    const toStageName = stages.find((s) => s.id === stageId)?.name
    const fromStageName = stages.find((s) => s.id === fromStage)?.name
    await supabase.from('activities').insert({
      customer_id: previous?.find((d) => d.id === dealId)?.customer_id,
      deal_id: dealId,
      type: 'system',
      direction: 'internal',
      subject: 'Stage changed',
      body: `Moved from ${fromStageName ?? 'unknown'} to ${toStageName ?? 'unknown'}`,
    })
    await queryClient.invalidateQueries({ queryKey: ['deals', 'byCustomer'] })
  }

  function handleDragStart(event: DragStartEvent) {
    const deal = deals.find((d) => d.id === event.active.id)
    setActiveDeal(deal ?? null)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDeal(null)
    const { active, over } = event
    if (!over) return
    const dealId = active.id as string
    const stageId = over.id as string
    const deal = deals.find((d) => d.id === dealId)
    if (!deal || deal.stage_id === stageId) return

    const targetStage = stages.find((s) => s.id === stageId)
    if (targetStage?.is_lost) {
      setPendingLost({ dealId, stageId })
      return
    }
    const extra = targetStage?.is_won ? { status: 'won', closed_at: new Date().toISOString() } : {}
    void moveDeal(dealId, stageId, extra)
  }

  return (
    <>
      <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto p-4">
          {stages.map((stage) => (
            <Column
              key={stage.id}
              stage={stage}
              deals={deals.filter((d) => d.stage_id === stage.id)}
              dealRotDays={dealRotDays}
              onOpenDeal={onOpenDeal}
            />
          ))}
        </div>
        <DragOverlay>
          {activeDeal && (
            <div className="w-64 rounded-lg border border-accent bg-surface p-2.5 text-sm shadow-lg">
              <p className="font-medium text-text">{activeDeal.title}</p>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <LostReasonDialog
        open={!!pendingLost}
        onOpenChange={(open) => !open && setPendingLost(null)}
        onConfirm={async (reason) => {
          if (!pendingLost) return
          await moveDeal(pendingLost.dealId, pendingLost.stageId, {
            status: 'lost',
            lost_reason: reason,
            closed_at: new Date().toISOString(),
          })
          setPendingLost(null)
        }}
      />
    </>
  )
}
