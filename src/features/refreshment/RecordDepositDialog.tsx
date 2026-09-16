import { useEffect, useState } from 'react'
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
import type { Database } from '@/types/database'

type PaymentMethod = Database['public']['Enums']['payment_method']

interface RecordDepositDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultAmount: number
  loading?: boolean
  onConfirm: (amount: number, method: PaymentMethod) => void | Promise<void>
}

/** Deposit taken on a booking creates a real payment record against the customer. */
export function RecordDepositDialog({ open, onOpenChange, defaultAmount, loading, onConfirm }: RecordDepositDialogProps) {
  const [amount, setAmount] = useState(String(defaultAmount))
  const [method, setMethod] = useState<PaymentMethod>('cash')

  useEffect(() => {
    if (open) setAmount(String(defaultAmount))
  }, [open, defaultAmount])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record deposit</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="deposit-amount">Amount</Label>
          <Input id="deposit-amount" type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
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
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button disabled={!Number(amount) || loading} onClick={() => void onConfirm(Number(amount), method)}>
            {loading ? 'Recording…' : 'Record deposit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
