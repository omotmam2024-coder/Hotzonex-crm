import { Badge, type badgeVariants } from '@/components/ui/badge'
import type { VariantProps } from 'class-variance-authority'

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>

// Status colours are consistent everywhere: active/paid/won = success,
// pending/expiring/partial = warning, expired/overdue/lost = danger,
// draft/new = muted, info states = info.
const STATUS_VARIANT: Record<string, BadgeVariant> = {
  // customers
  lead: 'muted',
  prospect: 'info',
  active: 'success',
  dormant: 'warning',
  churned: 'danger',
  blacklisted: 'danger',
  // deals
  open: 'info',
  won: 'success',
  lost: 'danger',
  // generic
  draft: 'muted',
  new: 'muted',
  pending: 'warning',
  expiring_soon: 'warning',
  partial: 'warning',
  expired: 'danger',
  overdue: 'danger',
  void: 'danger',
  cancelled: 'danger',
  sent: 'info',
  paid: 'success',
  completed: 'success',
  confirmed: 'success',
  // tickets
  pending_customer: 'warning',
  escalated: 'danger',
  resolved: 'success',
  closed: 'muted',
  // campaigns
  scheduled: 'info',
  running: 'info',
}

function labelize(status: string) {
  return status
    .split('_')
    .map((w) => w[0]!.toUpperCase() + w.slice(1))
    .join(' ')
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge variant={STATUS_VARIANT[status] ?? 'default'}>{labelize(status)}</Badge>
}
