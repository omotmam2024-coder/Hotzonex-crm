import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

type Tone = 'default' | 'warning' | 'danger' | 'success'

const TONE_CLASSES: Record<Tone, string> = {
  default: 'bg-surface-2 text-text-muted',
  warning: 'bg-warning/15 text-warning',
  danger: 'bg-danger/15 text-danger',
  success: 'bg-success/15 text-success',
}

interface StatTileProps {
  icon: LucideIcon
  label: string
  value: string | number
  sublabel?: string
  href?: string
  tone?: Tone
  loading?: boolean
}

/** A single home-dashboard stat: icon, headline number, label, optional link to the filtered list it summarizes. */
export function StatTile({ icon: Icon, label, value, sublabel, href, tone = 'default', loading }: StatTileProps) {
  const content = (
    <div className="flex items-center gap-3 rounded-card border border-border bg-surface p-3">
      <div className={cn('flex size-10 shrink-0 items-center justify-center rounded-full', TONE_CLASSES[tone])}>
        <Icon className="size-5" />
      </div>
      <div className="min-w-0">
        {loading ? (
          <Skeleton className="h-6 w-12" />
        ) : (
          <p className="text-lg leading-tight font-semibold text-text">{value}</p>
        )}
        <p className="truncate text-xs text-text-muted">{label}</p>
        {sublabel && <p className="truncate text-[11px] text-text-muted">{sublabel}</p>}
      </div>
    </div>
  )

  if (!href) return content
  return (
    <Link to={href} className="block transition-opacity hover:opacity-80">
      {content}
    </Link>
  )
}
