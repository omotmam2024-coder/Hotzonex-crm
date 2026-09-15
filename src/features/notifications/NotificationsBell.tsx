import { useQuery, useQueryClient } from '@tanstack/react-query'
import { BellIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/hooks/useAuth'
import { formatRelative } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

export function NotificationsBell() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data } = useQuery({
    queryKey: ['notifications', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('id, type, title, body, link, read_at, created_at')
        .order('created_at', { ascending: false })
        .limit(20)
      if (error) throw error
      return data
    },
    enabled: !!profile,
    refetchInterval: 60_000,
  })

  const unreadCount = data?.filter((n) => !n.read_at).length ?? 0

  async function markRead(id: string, link: string | null) {
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id)
    await queryClient.invalidateQueries({ queryKey: ['notifications'] })
    if (link) navigate(link)
  }

  async function markAllRead() {
    const unreadIds = data?.filter((n) => !n.read_at).map((n) => n.id) ?? []
    if (unreadIds.length === 0) return
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).in('id', unreadIds)
    await queryClient.invalidateQueries({ queryKey: ['notifications'] })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="relative flex size-9 items-center justify-center rounded-lg hover:bg-surface-2"
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        >
          <BellIcon className="size-4.5 text-text-muted" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex size-2 rounded-full bg-danger" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-1">
          <DropdownMenuLabel className="px-0 py-0">Notifications</DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => void markAllRead()}>
              Mark all read
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        {!data || data.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-text-muted">You're all caught up.</p>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {data.map((n) => (
              <DropdownMenuItem
                key={n.id}
                className={cn('flex flex-col items-start gap-0.5 whitespace-normal', !n.read_at && 'bg-accent/5')}
                onSelect={() => void markRead(n.id, n.link)}
              >
                <div className="flex w-full items-center gap-1.5">
                  {!n.read_at && <span className="size-1.5 shrink-0 rounded-full bg-accent" />}
                  <span className="text-sm font-medium text-text">{n.title}</span>
                </div>
                {n.body && <span className="text-xs text-text-muted">{n.body}</span>}
                <span className="text-[10px] text-text-muted">{formatRelative(n.created_at)}</span>
              </DropdownMenuItem>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
