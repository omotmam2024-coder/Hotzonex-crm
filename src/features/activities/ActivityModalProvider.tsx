import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { LogActivityModal } from './LogActivityModal'

interface OpenOptions {
  customerId?: string
  customerLabel?: string
}

interface ActivityModalContextValue {
  openLogActivity: (opts?: OpenOptions) => void
}

const ActivityModalContext = createContext<ActivityModalContextValue | null>(null)

export function ActivityModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [target, setTarget] = useState<OpenOptions>({})

  function openLogActivity(opts?: OpenOptions) {
    setTarget(opts ?? {})
    setOpen(true)
  }

  // Global "A" shortcut opens the modal from anywhere — reachable from the
  // whole app, not just the customer page — while typing stays untouched.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key.toLowerCase() !== 'a' || e.metaKey || e.ctrlKey || e.altKey) return
      const target = e.target as HTMLElement | null
      const tag = target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) return
      e.preventDefault()
      openLogActivity()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <ActivityModalContext.Provider value={{ openLogActivity }}>
      {children}
      <LogActivityModal
        open={open}
        onOpenChange={setOpen}
        customerId={target.customerId}
        customerLabel={target.customerLabel}
      />
    </ActivityModalContext.Provider>
  )
}

export function useActivityModal() {
  const ctx = useContext(ActivityModalContext)
  if (!ctx) throw new Error('useActivityModal must be used within ActivityModalProvider')
  return ctx
}
