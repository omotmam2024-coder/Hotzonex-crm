import type { ReactNode } from 'react'
import { useSettingValue } from '@/hooks/useSettingValue'
import { APP_NAME } from '@/lib/appName'

export function AuthLayout({ children }: { children: ReactNode }) {
  const { data: company } = useSettingValue('company', { name: APP_NAME } as { name: string })
  const name = company?.name || APP_NAME

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-bg px-4 py-8">
      <div className="mb-8 flex flex-col items-center gap-2">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-accent/15 text-2xl font-bold text-accent">
          {name.charAt(0).toUpperCase()}
        </div>
        <div className="text-center">
          <h1 className="text-lg font-semibold text-text">{name}</h1>
          <p className="text-sm text-text-muted">Customers · billing · support</p>
        </div>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  )
}
