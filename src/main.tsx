import { QueryClientProvider } from '@tanstack/react-query'
import { StrictMode, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import App from './App.tsx'
import { Toaster } from '@/components/ui/sonner'
import { ActivityModalProvider } from '@/features/activities/ActivityModalProvider'
import { useAuth, AuthProvider } from '@/hooks/useAuth'
import { APP_NAME } from '@/lib/appName'
import { queryClient } from '@/lib/queryClient'
import './styles/index.css'

document.title = APP_NAME

// The default auto-injected registerSW.js (now disabled — see vite.config.ts)
// only ever registers the service worker once; it never notices a newer one
// or reloads to pick it up, so an already-open tab can keep running a stale
// build indefinitely after a deploy. This checks for updates and reloads
// automatically the moment a new service worker takes over — no prompt,
// matching registerType: 'autoUpdate'.
if ('serviceWorker' in navigator) {
  registerSW({
    immediate: true,
    onNeedRefresh() {
      window.location.reload()
    },
  })
}

function AuthedProviders({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  // The activity modal needs an authenticated user (it writes rows as the
  // signed-in profile), so it only mounts once a session exists.
  if (!session) return <>{children}</>
  return <ActivityModalProvider>{children}</ActivityModalProvider>
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AuthedProviders>
            <App />
          </AuthedProviders>
          <Toaster />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
