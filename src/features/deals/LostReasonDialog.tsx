import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface LostReasonDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (reason: string) => void | Promise<void>
}

export function LostReasonDialog({ open, onOpenChange, onConfirm }: LostReasonDialogProps) {
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Why was this deal lost?</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="lostReason">Reason</Label>
          <Textarea
            id="lostReason"
            rows={3}
            autoFocus
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Chose a competitor, budget too high…"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={!reason.trim() || submitting}
            onClick={async () => {
              setSubmitting(true)
              await onConfirm(reason.trim())
              setSubmitting(false)
              setReason('')
            }}
          >
            {submitting ? 'Saving…' : 'Mark as lost'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
