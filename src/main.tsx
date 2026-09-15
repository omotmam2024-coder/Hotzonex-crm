import { QueryClientProvider } from '@tanstack/react-query'
import { StrictMode, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import { Toaster } from '@/components/ui/sonner'
import { ActivityModalProvider } from '@/features/activities/ActivityModalProvider'
import { useAuth, AuthProvider } from '@/hooks/useAuth'
import { queryClient } from '@/lib/queryClient'
import './styles/index.css'

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
