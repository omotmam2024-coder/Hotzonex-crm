import { differenceInMinutes } from 'date-fns'
import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'

interface SlaChipProps {
  status: string
  firstResponseAt: string | null
  resolvedAt: string | null
  slaResponseDue: string | null
  slaResolveDue: string | null
}

function formatMinutes(mins: number) {
  const abs = Math.abs(mins)
  if (abs < 60) return `${Math.round(abs)}m`
  const hours = Math.floor(abs / 60)
  const rem = Math.round(abs % 60)
  return rem > 0 ? `${hours}h ${rem}m` : `${hours}h`
}

/**
 * Live countdown against the SLA target that's currently active: response
 * (until first_response_at is set) then resolution (until resolved_at is
 * set). Always recomputed from the stored due-date, never from an elapsed
 * counter, so it can't drift with the viewer's clock.
 */
export function SlaChip({ status, firstResponseAt, resolvedAt, slaResponseDue, slaResolveDue }: SlaChipProps) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])

  if (status === 'resolved' || status === 'closed') return null

  const target = !firstResponseAt ? slaResponseDue : !resolvedAt ? slaResolveDue : null
  if (!target) return null

  const label = !firstResponseAt ? 'Response' : 'Resolve'
  const mins = differenceInMinutes(new Date(target), now)
  const breached = mins < 0

  return (
    <Badge variant={breached ? 'danger' : mins < 60 ? 'warning' : 'muted'}>
      {label} {breached ? `${formatMinutes(mins)} overdue` : `due in ${formatMinutes(mins)}`}
    </Badge>
  )
}
