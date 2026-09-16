import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckIcon, MessageCircleIcon } from 'lucide-react'
import { useMemo } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { useAuth } from '@/hooks/useAuth'
import { useSettingValue } from '@/hooks/useSettingValue'
import { APP_NAME } from '@/lib/appName'
import { renderTemplate, SAMPLE_TEMPLATE_VALUES } from '@/lib/messageTemplate'
import { formatPhoneLocal, whatsappLink } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'
import { useAudienceMembers, type AudienceFilter } from './useAudience'
import type { CampaignRow } from './useCampaigns'

type CampaignStatus = Database['public']['Enums']['campaign_status']

interface CampaignWorkQueueDrawerProps {
  campaign: CampaignRow | null
  onClose: () => void
}

export function CampaignWorkQueueDrawer({ campaign, onClose }: CampaignWorkQueueDrawerProps) {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const { data: company } = useSettingValue('company', { name: APP_NAME } as { name: string })

  const audienceFilter: AudienceFilter = campaign?.audience_filter ?? {}
  const { data: members, isLoading: membersLoading } = useAudienceMembers(audienceFilter, !!campaign)

  const { data: template } = useQuery({
    queryKey: ['message_templates', 'byId', campaign?.template_id],
    queryFn: async () => {
      const { data, error } = await supabase.from('message_templates').select('body').eq('id', campaign!.template_id!).single()
      if (error) throw error
      return data
    },
    enabled: !!campaign?.template_id,
  })

  const { data: sentLog, refetch: refetchLog } = useQuery({
    queryKey: ['message_log', 'byCampaign', campaign?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('message_log').select('customer_id').eq('campaign_id', campaign!.id)
      if (error) throw error
      return data
    },
    enabled: !!campaign,
  })

  const sentIds = useMemo(() => new Set(sentLog?.map((l) => l.customer_id).filter(Boolean)), [sentLog])

  async function updateStatus(status: CampaignStatus) {
    if (!campaign) return
    const { error } = await supabase.from('campaigns').update({ status }).eq('id', campaign.id)
    if (error) {
      toast.error(error.message)
      return
    }
    await queryClient.invalidateQueries({ queryKey: ['campaigns'] })
  }

  async function sendTo(member: { id: string; display_name: string | null; phone_primary: string; whatsapp: string | null }) {
    if (!campaign) return
    const phone = member.whatsapp || member.phone_primary
    // Only {{customer_name}} is filled from real data here — {{plan}},
    // {{expiry_date}} etc. vary by audience type and aren't fetched
    // per-recipient for a bulk send, so they fall back to placeholder text
    // the sender can edit in the wa.me compose box before hitting send.
    const body = template
      ? renderTemplate(template.body, { ...SAMPLE_TEMPLATE_VALUES, customer_name: member.display_name ?? 'there' })
      : `Hello ${member.display_name ?? 'there'}, this is ${company?.name || APP_NAME}.`

    window.open(whatsappLink(phone, body), '_blank', 'noreferrer')

    const { error } = await supabase.from('message_log').insert({
      customer_id: member.id,
      campaign_id: campaign.id,
      template_id: campaign.template_id,
      channel: campaign.channel,
      to_number: phone,
      body,
      status: 'sent',
      sent_by: profile?.id,
      sent_at: new Date().toISOString(),
    })
    if (error) {
      toast.error(error.message)
      return
    }
    if (campaign.status === 'draft') await updateStatus('running')
    await refetchLog()
  }

  return (
    <Sheet open={!!campaign} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="flex w-full flex-col gap-4 overflow-y-auto sm:max-w-lg">
        {campaign && (
          <>
            <SheetHeader>
              <div className="flex flex-wrap items-center gap-2">
                <SheetTitle>{campaign.name}</SheetTitle>
                <StatusBadge status={campaign.status} />
              </div>
              <p className="text-xs text-text-muted">
                {members?.length ?? 0} recipient(s) · {sentIds.size} sent
              </p>
            </SheetHeader>

            <div className="flex items-center gap-2">
              <span className="text-xs text-text-muted">Status:</span>
              <Select value={campaign.status} onValueChange={(v) => void updateStatus(v as CampaignStatus)}>
                <SelectTrigger className="h-8 w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="running">Running</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {membersLoading ? (
              <p className="text-sm text-text-muted">Loading audience…</p>
            ) : !members || members.length === 0 ? (
              <EmptyState icon={MessageCircleIcon} title="No matching customers" description="Adjust the audience filter — this list is re-evaluated live." />
            ) : (
              <div className="flex flex-col gap-2">
                {members.map((m) => {
                  const sent = sentIds.has(m.id)
                  return (
                    <div key={m.id} className="flex items-center justify-between gap-2 rounded-card border border-border bg-surface p-3">
                      <div className="min-w-0">
                        <p className="text-sm text-text">{m.display_name ?? 'Unnamed'}</p>
                        <p className="text-xs text-text-muted">{formatPhoneLocal(m.whatsapp || m.phone_primary)}</p>
                      </div>
                      {sent ? (
                        <span className="flex shrink-0 items-center gap-1 text-xs text-success">
                          <CheckIcon className="size-3.5" /> Sent
                        </span>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => void sendTo(m)}>
                          Send
                        </Button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
