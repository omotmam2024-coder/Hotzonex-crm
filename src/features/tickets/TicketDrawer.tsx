import { useQuery, useQueryClient } from '@tanstack/react-query'
import { RotateCcwIcon, SendIcon, StarIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { ReasonDialog } from '@/components/shared/ReasonDialog'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { useAuth } from '@/hooks/useAuth'
import { useProfiles } from '@/hooks/useProfiles'
import { can } from '@/lib/permissions'
import { formatDateTime, formatRelative } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import type { Database } from '@/types/database'
import { ResolveTicketDialog } from './ResolveTicketDialog'
import { SlaChip } from './SlaChip'

interface TicketDrawerProps {
  ticketId: string | null
  onClose: () => void
}

const OPEN_STATUSES = ['new', 'open', 'pending_customer', 'escalated'] as const

export function TicketDrawer({ ticketId, onClose }: TicketDrawerProps) {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const { data: profiles } = useProfiles()
  const [commentBody, setCommentBody] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [posting, setPosting] = useState(false)
  const [resolveOpen, setResolveOpen] = useState(false)
  const [reopenOpen, setReopenOpen] = useState(false)
  const [working, setWorking] = useState(false)

  const { data: ticket, refetch } = useQuery({
    queryKey: ['tickets', 'detail', ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tickets')
        .select('*, customers(display_name, phone_primary), ticket_categories(name)')
        .eq('id', ticketId!)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!ticketId,
  })

  const { data: comments, refetch: refetchComments } = useQuery({
    queryKey: ['ticket_comments', ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticket_comments')
        .select('id, body, is_internal, user_id, created_at')
        .eq('ticket_id', ticketId!)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data
    },
    enabled: !!ticketId,
  })

  useEffect(() => {
    setCommentBody('')
    setIsInternal(false)
  }, [ticketId])

  function profileName(id: string | null) {
    if (!id) return 'System'
    return profiles?.find((p) => p.id === id)?.full_name || 'Someone'
  }

  async function invalidateAll() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['tickets'] }),
      refetch(),
      refetchComments(),
    ])
  }

  async function postComment() {
    if (!ticketId || !commentBody.trim()) return
    setPosting(true)
    const { error } = await supabase
      .from('ticket_comments')
      .insert({ ticket_id: ticketId, body: commentBody.trim(), is_internal: isInternal, user_id: profile?.id })
    setPosting(false)
    if (error) {
      toast.error(error.message)
      return
    }
    setCommentBody('')
    setIsInternal(false)
    await invalidateAll()
  }

  async function updateStatus(value: string) {
    if (!ticketId) return
    const { error } = await supabase
      .from('tickets')
      .update({ status: value as Database['public']['Enums']['ticket_status'] })
      .eq('id', ticketId)
    if (error) {
      toast.error(error.message)
      return
    }
    await invalidateAll()
  }

  async function updatePriority(value: string) {
    if (!ticketId) return
    const { error } = await supabase
      .from('tickets')
      .update({ priority: value as Database['public']['Enums']['priority_level'] })
      .eq('id', ticketId)
    if (error) {
      toast.error(error.message)
      return
    }
    await invalidateAll()
  }

  async function updateAssignee(value: string | null) {
    if (!ticketId) return
    const { error } = await supabase.from('tickets').update({ assigned_to: value }).eq('id', ticketId)
    if (error) {
      toast.error(error.message)
      return
    }
    await invalidateAll()
  }

  async function resolve(category: string, note: string) {
    if (!ticketId) return
    setWorking(true)
    const { error } = await supabase.rpc('fn_resolve_ticket', { p_ticket_id: ticketId, p_category: category, p_note: note })
    setWorking(false)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('Ticket resolved')
    setResolveOpen(false)
    await invalidateAll()
  }

  async function reopen(reason: string) {
    if (!ticketId) return
    setWorking(true)
    const { error } = await supabase.rpc('fn_reopen_ticket', { p_ticket_id: ticketId, p_reason: reason })
    setWorking(false)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('Ticket reopened')
    setReopenOpen(false)
    await invalidateAll()
  }

  async function rate(stars: number) {
    if (!ticketId) return
    const { error } = await supabase.from('tickets').update({ satisfaction: stars }).eq('id', ticketId)
    if (error) {
      toast.error(error.message)
      return
    }
    await invalidateAll()
  }

  const canWrite = can(profile, 'create')
  const canResolve = ticket && OPEN_STATUSES.includes(ticket.status as (typeof OPEN_STATUSES)[number])

  return (
    <Sheet open={!!ticketId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="flex w-full flex-col gap-4 overflow-y-auto sm:max-w-md">
        {ticket && (
          <>
            <SheetHeader>
              <div className="flex flex-wrap items-center gap-2">
                <SheetTitle>{ticket.subject}</SheetTitle>
                <StatusBadge status={ticket.status} />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs text-text-muted">
                  {ticket.ticket_number} · {ticket.customers?.display_name ?? 'No customer'}
                </p>
                <SlaChip
                  status={ticket.status}
                  firstResponseAt={ticket.first_response_at}
                  resolvedAt={ticket.resolved_at}
                  slaResponseDue={ticket.sla_response_due}
                  slaResolveDue={ticket.sla_resolve_due}
                />
              </div>
            </SheetHeader>

            {ticket.description && <p className="text-sm text-text">{ticket.description}</p>}

            {ticket.status === 'resolved' && (
              <div className="flex flex-col gap-2 rounded-lg border border-success/40 bg-success/10 p-3">
                <p className="text-sm text-success">
                  Resolved{ticket.resolution_category ? ` — ${ticket.resolution_category}` : ''}
                </p>
                {ticket.resolution && <p className="text-sm text-text">{ticket.resolution}</p>}
                {ticket.satisfaction == null ? (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-text-muted">Rate this resolution:</span>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button key={s} type="button" onClick={() => void rate(s)} aria-label={`${s} stars`}>
                        <StarIcon className="size-4 text-warning" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <StarIcon
                        key={s}
                        className={cn('size-4', s <= ticket.satisfaction! ? 'fill-warning text-warning' : 'text-border')}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {canWrite && (
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label>Status</Label>
                  <Select
                    value={ticket.status}
                    onValueChange={(v) => (v === 'resolved' ? setResolveOpen(true) : void updateStatus(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="pending_customer">Pending customer</SelectItem>
                      <SelectItem value="escalated">Escalated</SelectItem>
                      <SelectItem value="resolved" disabled={!canResolve}>
                        Resolved
                      </SelectItem>
                      <SelectItem value="closed" disabled={ticket.status !== 'resolved'}>
                        Closed
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Priority</Label>
                  <Select value={ticket.priority} onValueChange={(v) => void updatePriority(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 flex flex-col gap-1.5">
                  <Label>Assignee</Label>
                  <Select
                    value={ticket.assigned_to ?? '__none'}
                    onValueChange={(v) => void updateAssignee(v === '__none' ? null : v)}
                  >
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
              </div>
            )}

            {canWrite && (
              <div className="flex gap-2">
                {canResolve && (
                  <Button className="flex-1" onClick={() => setResolveOpen(true)}>
                    Resolve
                  </Button>
                )}
                {(ticket.status === 'resolved' || ticket.status === 'closed') && (
                  <Button variant="outline" className="flex-1" onClick={() => setReopenOpen(true)}>
                    <RotateCcwIcon className="size-4" /> Reopen
                  </Button>
                )}
              </div>
            )}

            <div className="flex flex-col gap-2 border-t border-border pt-3">
              <h3 className="text-sm font-semibold text-text">Comments</h3>
              {comments && comments.length > 0 ? (
                comments.map((c) => (
                  <div
                    key={c.id}
                    className={cn(
                      'rounded-lg border p-2 text-sm',
                      c.is_internal ? 'border-warning/40 bg-warning/10' : 'border-border',
                    )}
                  >
                    <div className="flex justify-between text-xs text-text-muted">
                      <span className="flex items-center gap-1">
                        {profileName(c.user_id)}
                        {c.is_internal && <Badge variant="warning">Internal</Badge>}
                      </span>
                      <span>{formatRelative(c.created_at)}</span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-text">{c.body}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-text-muted">No comments yet.</p>
              )}

              {canWrite && (
                <div className="flex flex-col gap-2">
                  <Textarea
                    rows={2}
                    placeholder="Add a comment…"
                    value={commentBody}
                    onChange={(e) => setCommentBody(e.target.value)}
                  />
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-xs text-text-muted">
                      <Switch checked={isInternal} onCheckedChange={setIsInternal} />
                      Internal note
                    </label>
                    <Button size="sm" disabled={!commentBody.trim() || posting} onClick={() => void postComment()}>
                      <SendIcon className="size-4" /> {posting ? 'Posting…' : 'Post'}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <p className="text-xs text-text-muted">Created {formatDateTime(ticket.created_at)}</p>
          </>
        )}

        <ResolveTicketDialog open={resolveOpen} onOpenChange={setResolveOpen} loading={working} onConfirm={resolve} />
        <ReasonDialog
          open={reopenOpen}
          onOpenChange={setReopenOpen}
          title="Reopen ticket"
          description="This restarts the resolution SLA timer from now."
          placeholder="Why is this being reopened?"
          confirmLabel="Reopen ticket"
          loading={working}
          onConfirm={reopen}
        />
      </SheetContent>
    </Sheet>
  )
}
