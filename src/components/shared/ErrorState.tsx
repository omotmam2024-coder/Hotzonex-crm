import { AlertTriangleIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorStateProps {
  message?: string
  onRetry?: () => void
}

/** Every list has an error state with a retry button — never a bare failure. */
export function ErrorState({ message = 'Something went wrong loading this.', onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-danger/15 text-danger">
        <AlertTriangleIcon className="size-6" />
      </div>
      <p className="max-w-sm text-sm text-text-muted">{message}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  )
}
