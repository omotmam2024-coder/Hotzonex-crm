import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckIcon, ClockIcon, ListTodoIcon, PlusIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { SkeletonRows } from '@/components/shared/SkeletonRows'
import { useAuth } from '@/hooks/useAuth'
import { formatDateTime } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

interface TaskRow {
  id: string
  title: string
  due_at: string | null
  priority: string
  status: string
  customer_id: string | null
  assigned_to: string | null
  customers: { display_name: string | null } | null
}

const PRIORITY_DOT: Record<string, string> = {
  urgent: 'bg-danger',
  high: 'bg-warning',
  normal: 'bg-info',
  low: 'bg-text-muted',
}

function useMyDayTasks(userId: string | undefined) {
  return useQuery({
    queryKey: ['tasks', 'my-day', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('id, title, due_at, priority, status, customer_id, assigned_to, customers(display_name)')
        .in('status', ['open', 'in_progress'])
        .order('due_at', { ascending: true, nullsFirst: false })
        .limit(200)
      if (error) throw error
      return data as unknown as TaskRow[]
    },
    enabled: !!userId,
  })
}

function bucketize(tasks: TaskRow[], userId: string) {
  const now = new Date()
  const todayEnd = new Date(now)
  todayEnd.setHours(23, 59, 59, 999)

  const mine = tasks.filter((t) => t.assigned_to === userId)
  const unassigned = tasks.filter((t) => !t.assigned_to)

  const overdue = mine.filter((t) => t.due_at && new Date(t.due_at) < now)
  const dueToday = mine.filter((t) => t.due_at && new Date(t.due_at) >= now && new Date(t.due_at) <= todayEnd)
  const upcoming = mine.filter((t) => !t.due_at || new Date(t.due_at) > todayEnd)

  return { overdue, dueToday, upcoming, unassigned }
}

export function MyDayPage() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const { data, isLoading, isError, refetch } = useMyDayTasks(profile?.id)
  const [newTitle, setNewTitle] = useState('')
  const [adding, setAdding] = useState(false)

  async function complete(taskId: string) {
    const { error } = await supabase
      .from('tasks')
      .update({ status: 'done', completed_at: new Date().toISOString() })
      .eq('id', taskId)
    if (error) toast.error(error.message)
    else await queryClient.invalidateQueries({ queryKey: ['tasks'] })
  }

  async function snooze(taskId: string) {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const { error } = await supabase.from('tasks').update({ due_at: tomorrow.toISOString() }).eq('id', taskId)
    if (error) toast.error(error.message)
    else await queryClient.invalidateQueries({ queryKey: ['tasks'] })
  }

  async function claim(taskId: string) {
    const { error } = await supabase.from('tasks').update({ assigned_to: profile?.id }).eq('id', taskId)
    if (error) toast.error(error.message)
    else await queryClient.invalidateQueries({ queryKey: ['tasks'] })
  }

  async function addTask() {
    if (!newTitle.trim()) return
    setAdding(true)
    const { error } = await supabase.from('tasks').insert({
      title: newTitle.trim(),
      assigned_to: profile?.id,
      created_by: profile?.id,
      due_at: new Date().toISOString(),
    })
    setAdding(false)
    if (error) {
      toast.error(error.message)
      return
    }
    setNewTitle('')
    await queryClient.invalidateQueries({ queryKey: ['tasks'] })
  }

  if (isLoading) {
    return (
      <div className="p-4">
        <SkeletonRows count={5} />
      </div>
    )
  }
  if (isError || !data) {
    return <ErrorState onRetry={() => void refetch()} />
  }

  const { overdue, dueToday, upcoming, unassigned } = bucketize(data, profile?.id ?? '')
  const nothingAtAll = overdue.length + dueToday.length + upcoming.length + unassigned.length === 0

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5 p-4 md:p-6">
      <h1 className="text-xl font-semibold text-text">My Day</h1>

      <div className="flex gap-2 rounded-card border border-border bg-surface p-3">
        <Input
          placeholder="Add a task for today…"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              void addTask()
            }
          }}
        />
        <Button onClick={() => void addTask()} disabled={adding || !newTitle.trim()}>
          <PlusIcon />
        </Button>
      </div>

      {nothingAtAll ? (
        <EmptyState icon={ListTodoIcon} title="Nothing on your plate" description="You're all caught up." />
      ) : (
        <>
          <TaskGroup title="Overdue" tasks={overdue} tone="danger" onComplete={complete} onSnooze={snooze} />
          <TaskGroup title="Due today" tasks={dueToday} tone="warning" onComplete={complete} onSnooze={snooze} />
          <TaskGroup title="Upcoming" tasks={upcoming} onComplete={complete} onSnooze={snooze} />
          <TaskGroup title="Unassigned queue" tasks={unassigned} onComplete={complete} onClaim={claim} />
        </>
      )}
    </div>
  )
}

function TaskGroup({
  title,
  tasks,
  tone,
  onComplete,
  onSnooze,
  onClaim,
}: {
  title: string
  tasks: TaskRow[]
  tone?: 'danger' | 'warning'
  onComplete: (id: string) => void
  onSnooze?: (id: string) => void
  onClaim?: (id: string) => void
}) {
  if (tasks.length === 0) return null
  return (
    <div>
      <h2
        className={cn(
          'mb-2 text-xs font-semibold tracking-wide uppercase',
          tone === 'danger' ? 'text-danger' : tone === 'warning' ? 'text-warning' : 'text-text-muted',
        )}
      >
        {title} ({tasks.length})
      </h2>
      <div className="flex flex-col gap-2">
        {tasks.map((t) => (
          <div key={t.id} className="flex items-center gap-3 rounded-card border border-border bg-surface p-3">
            <button
              onClick={() => onComplete(t.id)}
              aria-label="Complete task"
              className="flex size-6 shrink-0 items-center justify-center rounded-full border border-border hover:border-success hover:text-success"
            >
              <CheckIcon className="size-3.5" />
            </button>
            <span className={cn('size-2 shrink-0 rounded-full', PRIORITY_DOT[t.priority])} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-text">{t.title}</p>
              <p className="truncate text-xs text-text-muted">
                {t.customers?.display_name}
                {t.customers?.display_name && t.due_at ? ' · ' : ''}
                {t.due_at ? formatDateTime(t.due_at) : ''}
              </p>
            </div>
            {onSnooze && (
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label="Snooze" onClick={() => onSnooze(t.id)}>
                <ClockIcon className="size-4" />
              </Button>
            )}
            {onClaim && (
              <Button variant="outline" size="sm" className="h-8 shrink-0" onClick={() => onClaim(t.id)}>
                Claim
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
