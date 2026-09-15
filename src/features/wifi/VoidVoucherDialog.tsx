import { ReasonDialog } from '@/components/shared/ReasonDialog'

interface VoidVoucherDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  code?: string
  loading?: boolean
  onConfirm: (reason: string) => void | Promise<void>
}

export function VoidVoucherDialog({ open, onOpenChange, code, loading, onConfirm }: VoidVoucherDialogProps) {
  return (
    <ReasonDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Void voucher ${code}?`}
      description="This cannot be undone. A reason is required and this action is recorded in the audit log."
      placeholder="e.g. Printed in error, damaged code…"
      confirmLabel="Void voucher"
      variant="destructive"
      loading={loading}
      onConfirm={onConfirm}
    />
  )
}
