import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { APP_NAME } from '@/lib/appName'

const LAST_ROUTE_KEY = 'hzx.lastRoute'

export function rememberRoute(pathname: string) {
  if (pathname === '/login' || pathname.startsWith('/setup') || pathname.startsWith('/forgot-password') || pathname.startsWith('/reset-password')) {
    return
  }
  try {
    localStorage.setItem(LAST_ROUTE_KEY, pathname)
  } catch {
    // Private browsing / storage disabled: restoring the last route is a
    // convenience, not a requirement.
  }
}

export function getRememberedRoute(): string | null {
  try {
    return localStorage.getItem(LAST_ROUTE_KEY)
  } catch {
    return null
  }
}

function FullPageLoader() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg">
      <div className="flex flex-col items-center gap-3">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-accent/15 text-2xl font-bold text-accent animate-pulse">
          {APP_NAME.charAt(0).toUpperCase()}
        </div>
        <p className="text-sm text-text-muted">Loading…</p>
      </div>
    </div>
  )
}

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, profile, loading } = useAuth()
  const location = useLocation()

  if (loading) return <FullPageLoader />

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (!profile) {
    // The signup trigger runs asynchronously right after account creation;
    // this closes that brief gap instead of showing a broken shell.
    return <FullPageLoader />
  }

  if (!profile.is_active) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-2 bg-bg px-6 text-center">
        <h2 className="text-base font-semibold text-text">Account deactivated</h2>
        <p className="text-sm text-text-muted">Ask an admin to reactivate your account.</p>
      </div>
    )
  }

  return children
}
