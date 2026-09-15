import { ReasonDialog } from '@/components/shared/ReasonDialog'

interface LostReasonDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (reason: string) => void | Promise<void>
}

export function LostReasonDialog({ open, onOpenChange, onConfirm }: LostReasonDialogProps) {
  return (
    <ReasonDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Why was this deal lost?"
      placeholder="e.g. Chose a competitor, budget too high…"
      confirmLabel="Mark as lost"
      variant="destructive"
      onConfirm={onConfirm}
    />
  )
}
