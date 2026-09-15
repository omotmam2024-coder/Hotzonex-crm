import { useQuery } from '@tanstack/react-query'
import { HardHatIcon, PlusIcon } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { SkeletonRows } from '@/components/shared/SkeletonRows'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { useAuth } from '@/hooks/useAuth'
import { formatDateTime } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import { InstallationFormDialog } from './InstallationFormDialog'
import { TechnicianJobCard } from './TechnicianJobCard'

function useInstallationsList(technicianOnly: boolean, userId?: string) {
  return useQuery({
    queryKey: ['installations', 'list', technicianOnly, userId],
    queryFn: async () => {
      let q = supabase
        .from('installations')
        .select(
          'id, job_code, job_type, status, scheduled_at, install_fee, technician_id, customers(display_name, phone_primary, address_text)',
        )
        .order('scheduled_at', { ascending: true, nullsFirst: false })
        .limit(100)
      if (technicianOnly && userId) q = q.eq('technician_id', userId)
      const { data, error } = await q
      if (error) throw error
      return data
    },
    enabled: !technicianOnly || !!userId,
  })
}

export function InstallationsPage() {
  const { profile } = useAuth()
  const isTechnician = profile?.role === 'technician'
  const { data: jobs, isLoading, isError, refetch } = useInstallationsList(isTechnician, profile?.id)
  const [formOpen, setFormOpen] = useState(false)

  return (
    <div className="flex flex-col gap-3 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text">{isTechnician ? 'My jobs' : 'Installations'}</h2>
        {!isTechnician && (
          <Button size="sm" onClick={() => setFormOpen(true)}>
            <PlusIcon /> Schedule
          </Button>
        )}
      </div>

      {isLoading ? (
        <SkeletonRows />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : !jobs || jobs.length === 0 ? (
        <EmptyState
          icon={HardHatIcon}
          title={isTechnician ? 'No jobs assigned' : 'No installations scheduled'}
          description={!isTechnician ? 'Schedule a home, office or hotspot installation.' : undefined}
          action={
            !isTechnician && (
              <Button onClick={() => setFormOpen(true)}>
                <PlusIcon /> Schedule
              </Button>
            )
          }
        />
      ) : isTechnician ? (
        <div className="flex flex-col gap-2">
          {jobs.map((job) => (
            <TechnicianJobCard key={job.id} job={job} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {jobs.map((j) => (
            <div key={j.id} className="flex items-center justify-between gap-3 rounded-card border border-border bg-surface p-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-text">{j.customers?.display_name}</p>
                <p className="text-xs text-text-muted">
                  {j.job_type} · {j.scheduled_at ? formatDateTime(j.scheduled_at) : 'Unscheduled'} · {j.job_code}
                </p>
              </div>
              <StatusBadge status={j.status} />
            </div>
          ))}
        </div>
      )}

      <InstallationFormDialog open={formOpen} onOpenChange={setFormOpen} />
    </div>
  )
}
