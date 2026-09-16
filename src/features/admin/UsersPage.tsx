import { useQueryClient } from '@tanstack/react-query'
import { PencilIcon, UserPlusIcon, UsersIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { SkeletonRows } from '@/components/shared/SkeletonRows'
import { useAuth } from '@/hooks/useAuth'
import { useLocations } from '@/hooks/useLocations'
import { useUnitLabels } from '@/hooks/useUnitLabels'
import { formatDate } from '@/lib/format'
import { can } from '@/lib/permissions'
import { supabase } from '@/lib/supabase'
import { UserFormDialog } from './UserFormDialog'
import { useUsers } from './useUsers'

const ROLE_LABEL: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  manager: 'Manager',
  agent: 'Agent',
  technician: 'Technician',
  viewer: 'Viewer',
}

const ROLE_BADGE_VARIANT: Record<string, 'success' | 'info' | 'muted' | 'warning'> = {
  owner: 'success',
  admin: 'success',
  manager: 'info',
  agent: 'muted',
  technician: 'muted',
  viewer: 'warning',
}

export function UsersPage() {
  const { profile: currentProfile } = useAuth()
  const { data: users, isLoading, isError, refetch } = useUsers()
  const { data: locations } = useLocations(false)
  const UNIT_LABEL = useUnitLabels()
  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [editId, setEditId] = useState<string | undefined>(undefined)

  if (!can(currentProfile, 'manage_users')) {
    return (
      <EmptyState
        icon={UsersIcon}
        title="Admins only"
        description="Ask an owner or admin if you need to invite staff or change someone's role."
      />
    )
  }

  const locationName = (id: string) => locations?.find((l) => l.id === id)?.name ?? id

  async function toggleActive(id: string, isActive: boolean) {
    if (id === currentProfile?.id) {
      toast.error("You can't deactivate your own account.")
      return
    }
    const { error } = await supabase.from('profiles').update({ is_active: !isActive }).eq('id', id)
    if (error) toast.error(error.message)
    else await queryClient.invalidateQueries({ queryKey: ['profiles', 'admin-users'] })
  }

  return (
    <div className="flex flex-col gap-3 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text">Users</h1>
          <p className="text-sm text-text-muted">Invite staff and manage roles, business units, and locations.</p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setEditId(undefined)
            setFormOpen(true)
          }}
        >
          <UserPlusIcon /> Invite staff
        </Button>
      </div>

      {isLoading ? (
        <SkeletonRows />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : !users || users.length === 0 ? (
        <EmptyState icon={UsersIcon} title="No users yet" />
      ) : (
        <div className="flex flex-col gap-2">
          {users.map((u) => (
            <div key={u.id} className="flex items-start justify-between gap-3 rounded-card border border-border bg-surface p-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-medium text-text">{u.full_name || u.email || 'Unnamed'}</p>
                  <Badge variant={ROLE_BADGE_VARIANT[u.role] ?? 'muted'}>{ROLE_LABEL[u.role] ?? u.role}</Badge>
                  {!u.is_active && <Badge variant="danger">Deactivated</Badge>}
                </div>
                <p className="text-xs text-text-muted">
                  {u.email ?? '—'} · Joined {formatDate(u.created_at)}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {u.business_units.map((unit) => (
                    <Badge key={unit} variant="outline" className="text-[10px]">
                      {UNIT_LABEL[unit] ?? unit}
                    </Badge>
                  ))}
                  {u.location_ids.map((id) => (
                    <Badge key={id} variant="outline" className="text-[10px]">
                      {locationName(id)}
                    </Badge>
                  ))}
                  {u.location_ids.length === 0 && (
                    <Badge variant="outline" className="text-[10px]">
                      All locations
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Switch
                  checked={u.is_active}
                  disabled={u.role === 'owner' || u.id === currentProfile?.id}
                  onCheckedChange={() => void toggleActive(u.id, u.is_active)}
                  aria-label={u.is_active ? 'Deactivate' : 'Reactivate'}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Edit user"
                  onClick={() => {
                    setEditId(u.id)
                    setFormOpen(true)
                  }}
                >
                  <PencilIcon className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <UserFormDialog open={formOpen} onOpenChange={setFormOpen} userId={editId} />
    </div>
  )
}
