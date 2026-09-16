import { MegaphoneIcon, PlusIcon } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { SkeletonRows } from '@/components/shared/SkeletonRows'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { useAuth } from '@/hooks/useAuth'
import { can } from '@/lib/permissions'
import { formatDate, formatMoney } from '@/lib/format'
import { CampaignFormDialog } from './CampaignFormDialog'
import { CampaignWorkQueueDrawer } from './CampaignWorkQueueDrawer'
import { useCampaigns, type CampaignRow } from './useCampaigns'

export function CampaignsPage() {
  const { profile } = useAuth()
  const { data, isLoading, isError, refetch } = useCampaigns()
  const [newOpen, setNewOpen] = useState(false)
  const [openCampaign, setOpenCampaign] = useState<CampaignRow | null>(null)
  const canWrite = can(profile, 'create')

  return (
    <div className="flex flex-col gap-3 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text">Campaigns</h2>
        {canWrite && (
          <Button size="sm" onClick={() => setNewOpen(true)}>
            <PlusIcon /> New campaign
          </Button>
        )}
      </div>

      {isLoading ? (
        <SkeletonRows />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={MegaphoneIcon}
          title="No campaigns yet"
          description="Build an audience filter and send a WhatsApp campaign without touching a spreadsheet."
          action={
            canWrite ? (
              <Button onClick={() => setNewOpen(true)}>
                <PlusIcon /> New campaign
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="flex flex-col gap-2">
          {data.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setOpenCampaign(c)}
              className="flex items-center justify-between gap-3 rounded-card border border-border bg-surface p-3 text-left hover:bg-surface-2"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-text">{c.name}</p>
                  <StatusBadge status={c.status} />
                </div>
                <p className="text-xs text-text-muted">
                  {c.channel} · {c.message_templates?.name ?? 'No template'} · {formatDate(c.created_at)}
                </p>
              </div>
              {c.budget > 0 && <span className="shrink-0 text-sm text-text">{formatMoney(c.budget, c.currency)}</span>}
            </button>
          ))}
        </div>
      )}

      <CampaignFormDialog open={newOpen} onOpenChange={setNewOpen} />
      <CampaignWorkQueueDrawer campaign={openCampaign} onClose={() => setOpenCampaign(null)} />
    </div>
  )
}
