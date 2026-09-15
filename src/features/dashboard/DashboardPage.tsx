import { useQuery } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'

const UNIT_LABEL: Record<string, string> = {
  wifi: 'WiFi',
  services: 'Services',
  refreshment: 'Refreshment Centre',
}

const ROLE_LABEL: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  manager: 'Manager',
  agent: 'Agent',
  technician: 'Technician',
  viewer: 'Viewer',
}

function useMyLocations(locationIds: string[]) {
  return useQuery({
    queryKey: ['locations', 'byIds', locationIds],
    queryFn: async () => {
      if (locationIds.length === 0) return []
      const { data, error } = await supabase.from('locations').select('id, name').in('id', locationIds)
      if (error) throw error
      return data
    },
    staleTime: 60_000,
  })
}

export function DashboardPage() {
  const { profile } = useAuth()
  const locationIds = profile?.location_ids ?? []
  const scopedToAllLocations = profile?.role === 'owner' || profile?.role === 'admin' || locationIds.length === 0
  const { data: locations, isLoading: locationsLoading } = useMyLocations(scopedToAllLocations ? [] : locationIds)

  if (!profile) return null

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-semibold text-text">Welcome, {profile.full_name || profile.email}</h1>
        <p className="text-sm text-text-muted">Here&apos;s what your account can see across Hotzonex.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your access</CardTitle>
          <CardDescription>Set by an admin — you can&apos;t change this yourself.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-text-muted">Role</span>
            <Badge variant="info">{ROLE_LABEL[profile.role] ?? profile.role}</Badge>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-text-muted">Business units</span>
            {profile.business_units.length === 0 ? (
              <span className="text-sm text-text-muted">None assigned</span>
            ) : (
              profile.business_units.map((unit) => (
                <Badge key={unit} variant="default">
                  {UNIT_LABEL[unit] ?? unit}
                </Badge>
              ))
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-text-muted">Locations</span>
            {scopedToAllLocations ? (
              <Badge variant="success">All locations</Badge>
            ) : locationsLoading ? (
              <Skeleton className="h-5 w-24" />
            ) : locations && locations.length > 0 ? (
              locations.map((loc) => (
                <Badge key={loc.id} variant="default">
                  {loc.name}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-text-muted">None assigned</span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What&apos;s next</CardTitle>
          <CardDescription>This build is being delivered phase by phase.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-text-muted">
            Foundation is live: sign-in, roles, and the app shell. Customers, the sales pipeline, WiFi
            operations, support, billing, and reporting arrive in the phases that follow — each one fully
            working before the next begins.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
