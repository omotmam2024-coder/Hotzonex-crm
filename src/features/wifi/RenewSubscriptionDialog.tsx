import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

type PaymentMethod = Database['public']['Enums']['payment_method']

interface RenewSubscriptionDialogProps {
  subscriptionId: string | null
  monthlyFee: number
  onClose: () => void
}

export function RenewSubscriptionDialog({ subscriptionId, monthlyFee, onClose }: RenewSubscriptionDialogProps) {
  const queryClient = useQueryClient()
  const [months, setMonths] = useState(1)
  const [amount, setAmount] = useState(String(monthlyFee))
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [saving, setSaving] = useState(false)

  async function submit() {
    if (!subscriptionId) return
    setSaving(true)
    const { data, error } = await supabase.rpc('fn_renew_subscription', {
      p_subscription_id: subscriptionId,
      p_months: months,
      p_amount: Number(amount) || undefined,
      p_method: method,
    })
    setSaving(false)
    if (error) {
      toast.error(error.message)
      return
    }
    const result = data as { new_end_date: string }
    toast.success(`Renewed to ${result.new_end_date}`)
    await queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
    onClose()
  }

  return (
    <Dialog open={!!subscriptionId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Renew subscription</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="months">Months</Label>
            <Input
              id="months"
              type="number"
              min="1"
              value={months}
              onChange={(e) => {
                const m = Number(e.target.value) || 1
                setMonths(m)
                setAmount(String(monthlyFee * m))
              }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="amount">Amount taken (SSP)</Label>
            <Input id="amount" type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Payment method</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="mobile_money">Mobile Money</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="agent_code">Agent Code</SelectItem>
                <SelectItem value="credit">Credit (on account)</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={saving}>
            {saving ? 'Renewing…' : 'Renew'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
