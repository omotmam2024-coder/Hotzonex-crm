import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: (failureCount, error) => {
        // Don't burn retries on auth/permission errors — RLS denials won't
        // resolve themselves, and a hostile/misconfigured client shouldn't
        // hammer the database.
        const message = error instanceof Error ? error.message : ''
        if (/JWT|permission|RLS|not authorised/i.test(message)) return false
        return failureCount < 2
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
})
