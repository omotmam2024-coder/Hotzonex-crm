import { AlertTriangleIcon } from 'lucide-react'
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { logError } from '@/lib/logError'

interface Props {
  children: ReactNode
  route?: string
}

interface State {
  error: Error | null
}

/** One error boundary per route: a broken screen never takes the whole app down with it. */
export class RouteErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    void logError(error, { route: this.props.route, extra: { componentStack: info.componentStack ?? null } })
  }

  handleRetry = () => {
    this.setState({ error: null })
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-6 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-danger/15 text-danger">
            <AlertTriangleIcon className="size-6" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-text">Something went wrong</h2>
            <p className="mt-1 text-sm text-text-muted">
              This screen hit an error. It has been logged. Try again, or come back later.
            </p>
          </div>
          <Button onClick={this.handleRetry}>Try again</Button>
        </div>
      )
    }
    return this.props.children
  }
}
