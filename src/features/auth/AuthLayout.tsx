import type { ReactNode } from 'react'

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-bg px-4 py-8">
      <div className="mb-8 flex flex-col items-center gap-2">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-accent/15 text-2xl font-bold text-accent">
          H
        </div>
        <div className="text-center">
          <h1 className="text-lg font-semibold text-text">Hotzonex CRM</h1>
          <p className="text-sm text-text-muted">WiFi &middot; Services &middot; Refreshment Centre</p>
        </div>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  )
}
