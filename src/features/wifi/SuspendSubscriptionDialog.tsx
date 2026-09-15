import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { ReasonDialog } from '@/components/shared/ReasonDialog'
import { supabase } from '@/lib/supabase'

interface SuspendSubscriptionDialogProps {
  subscriptionId: string | null
  onClose: () => void
}

export function SuspendSubscriptionDialog({ subscriptionId, onClose }: SuspendSubscriptionDialogProps) {
  const queryClient = useQueryClient()
  const [loading, setLoading] = useState(false)

  async function confirm(reason: string) {
    if (!subscriptionId) return
    setLoading(true)
    const { error } = await supabase.rpc('fn_suspend_subscription', {
      p_subscription_id: subscriptionId,
      p_reason: reason,
    })
    setLoading(false)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('Subscription suspended')
    await queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
    onClose()
  }

  return (
    <ReasonDialog
      open={!!subscriptionId}
      onOpenChange={(open) => !open && onClose()}
      title="Suspend subscription"
      description="The customer will lose service until this is resumed. Logged to their timeline."
      placeholder="e.g. Non-payment, customer request…"
      confirmLabel="Suspend"
      variant="destructive"
      loading={loading}
      onConfirm={confirm}
    />
  )
}
