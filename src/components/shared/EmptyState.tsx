import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: ReactNode
}

/** Every list has a designed empty state with a primary action — never a blank screen. */
export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-surface-2 text-text-muted">
        <Icon className="size-6" />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-text">{title}</h3>
        {description && <p className="mt-1 max-w-sm text-sm text-text-muted">{description}</p>}
      </div>
      {action}
    </div>
  )
}
