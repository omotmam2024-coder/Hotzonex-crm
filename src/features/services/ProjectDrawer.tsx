import { useQueryClient } from '@tanstack/react-query'
import { PlusIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { useAuth } from '@/hooks/useAuth'
import { useProfiles } from '@/hooks/useProfiles'
import { can } from '@/lib/permissions'
import { formatDate, formatMoney } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'
import { useMilestoneInvoices, useProjectDetail, useProjectMilestones } from './useProjects'

interface ProjectDrawerProps {
  projectId: string | null
  onClose: () => void
}

const STATUSES: Database['public']['Enums']['project_status'][] = [
  'discovery',
  'in_progress',
  'review',
  'delivered',
  'on_hold',
  'closed',
]

export function ProjectDrawer({ projectId, onClose }: ProjectDrawerProps) {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const { data: profiles } = useProfiles()
  const { data: project, refetch } = useProjectDetail(projectId)
  const { data: milestones, refetch: refetchMilestones } = useProjectMilestones(projectId)
  const [newMilestone, setNewMilestone] = useState({ title: '', dueDate: '', amount: '0' })
  const [adding, setAdding] = useState(false)
  const [completeTarget, setCompleteTarget] = useState<string | null>(null)
  const [completing, setCompleting] = useState(false)

  const invoiceIds = useMemo(() => milestones?.map((m) => m.invoice_id).filter((id): id is string => !!id) ?? [], [milestones])
  const { data: invoices } = useMilestoneInvoices(invoiceIds)

  const canWrite = can(profile, 'create')

  async function invalidateAll() {
    await Promise.all([queryClient.invalidateQueries({ queryKey: ['projects'] }), refetch(), refetchMilestones()])
  }

  async function updateStatus(status: string) {
    if (!projectId) return
    const { error } = await supabase
      .from('projects')
      .update({ status: status as Database['public']['Enums']['project_status'] })
      .eq('id', projectId)
    if (error) {
      toast.error(error.message)
      return
    }
    await invalidateAll()
  }

  async function updateProgress(pct: number) {
    if (!projectId) return
    const { error } = await supabase.from('projects').update({ progress_pct: pct }).eq('id', projectId)
    if (error) {
      toast.error(error.message)
      return
    }
    await invalidateAll()
  }

  async function updateOwner(ownerId: string | null) {
    if (!projectId) return
    const { error } = await supabase.from('projects').update({ owner_id: ownerId }).eq('id', projectId)
    if (error) {
      toast.error(error.message)
      return
    }
    await invalidateAll()
  }

  async function addMilestone() {
    if (!projectId || !newMilestone.title.trim()) return
    setAdding(true)
    const { error } = await supabase.from('project_milestones').insert({
      project_id: projectId,
      title: newMilestone.title.trim(),
      due_date: newMilestone.dueDate || null,
      amount: Number(newMilestone.amount) || 0,
      sort_order: milestones?.length ?? 0,
    })
    setAdding(false)
    if (error) {
      toast.error(error.message)
      return
    }
    setNewMilestone({ title: '', dueDate: '', amount: '0' })
    await refetchMilestones()
  }

  async function completeMilestone() {
    if (!completeTarget) return
    setCompleting(true)
    const { error } = await supabase.rpc('fn_complete_milestone', { p_milestone_id: completeTarget })
    setCompleting(false)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('Milestone completed — draft invoice raised')
    setCompleteTarget(null)
    await invalidateAll()
  }

  return (
    <Sheet open={!!projectId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="flex w-full flex-col gap-4 overflow-y-auto sm:max-w-lg">
        {project && (
          <>
            <SheetHeader>
              <div className="flex flex-wrap items-center gap-2">
                <SheetTitle>{project.name}</SheetTitle>
                <StatusBadge status={project.status} />
              </div>
              <p className="text-xs text-text-muted">
                {project.project_code} · {project.customers?.display_name}
              </p>
            </SheetHeader>

            {project.description && <p className="text-sm text-text">{project.description}</p>}

            <div className="grid grid-cols-2 gap-3 rounded-card border border-border bg-surface-2 p-3 text-sm">
              <div>
                <p className="text-text-muted">Budget</p>
                <p className="text-text">{formatMoney(project.budget, project.currency)}</p>
              </div>
              <div>
                <p className="text-text-muted">Due date</p>
                <p className="text-text">{project.due_date ? formatDate(project.due_date) : '—'}</p>
              </div>
            </div>

            {canWrite && (
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label>Status</Label>
                  <Select value={project.status} onValueChange={(v) => void updateStatus(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s.replace('_', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Owner</Label>
                  <Select value={project.owner_id ?? '__none'} onValueChange={(v) => void updateOwner(v === '__none' ? null : v)}>
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
                <div className="col-span-2 flex flex-col gap-1.5">
                  <Label>Progress: {project.progress_pct}%</Label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    defaultValue={project.progress_pct}
                    onMouseUp={(e) => void updateProgress(Number(e.currentTarget.value))}
                    onTouchEnd={(e) => void updateProgress(Number(e.currentTarget.value))}
                    className="w-full accent-accent"
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2 border-t border-border pt-3">
              <Label>Milestones</Label>
              {milestones?.map((m) => {
                const invoice = invoices?.find((i) => i.id === m.invoice_id)
                return (
                  <div key={m.id} className="flex items-center justify-between gap-2 rounded-lg border border-border p-2.5">
                    <div className="min-w-0">
                      <p className="text-sm text-text">{m.title}</p>
                      <p className="text-xs text-text-muted">
                        {m.due_date ? `Due ${formatDate(m.due_date)} · ` : ''}
                        {formatMoney(m.amount, project.currency)}
                        {invoice ? ` · Invoice ${invoice.invoice_number}` : ''}
                      </p>
                    </div>
                    {m.status === 'completed' ? (
                      <StatusBadge status="completed" />
                    ) : canWrite ? (
                      <Button size="sm" variant="outline" onClick={() => setCompleteTarget(m.id)}>
                        Complete
                      </Button>
                    ) : (
                      <StatusBadge status={m.status} />
                    )}
                  </div>
                )
              })}
              {(!milestones || milestones.length === 0) && <p className="text-sm text-text-muted">No milestones yet.</p>}

              {canWrite && (
                <div className="flex flex-col gap-1.5 rounded-lg border border-dashed border-border p-2.5">
                  <Input
                    placeholder="Milestone title"
                    value={newMilestone.title}
                    onChange={(e) => setNewMilestone((n) => ({ ...n, title: e.target.value }))}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="date"
                      value={newMilestone.dueDate}
                      onChange={(e) => setNewMilestone((n) => ({ ...n, dueDate: e.target.value }))}
                    />
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Amount"
                      value={newMilestone.amount}
                      onChange={(e) => setNewMilestone((n) => ({ ...n, amount: e.target.value }))}
                    />
                  </div>
                  <Button type="button" variant="outline" size="sm" disabled={adding || !newMilestone.title.trim()} onClick={() => void addMilestone()}>
                    <PlusIcon className="size-4" /> Add milestone
                  </Button>
                </div>
              )}
            </div>

            <ConfirmDialog
              open={!!completeTarget}
              onOpenChange={(open) => !open && setCompleteTarget(null)}
              title="Complete this milestone?"
              description="A draft invoice will be raised, pre-filled with the milestone's title and amount."
              confirmLabel="Complete & raise invoice"
              loading={completing}
              onConfirm={completeMilestone}
            />
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
