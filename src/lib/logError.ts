import { supabase } from '@/lib/supabase'
import type { Json } from '@/types/database'

/** Writes to `error_log` so failures are visible without asking the field agent what happened. */
export async function logError(error: unknown, context?: { route?: string; extra?: Record<string, Json> }) {
  const message = error instanceof Error ? error.message : String(error)
  const stack = error instanceof Error ? error.stack : undefined

  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.error('[logError]', message, context, error)
  }

  try {
    const { data } = await supabase.auth.getUser()
    await supabase.from('error_log').insert({
      user_id: data.user?.id ?? null,
      route: context?.route ?? window.location.pathname,
      message,
      stack: stack ?? null,
      context: context?.extra ?? null,
    })
  } catch {
    // Logging must never throw into the caller — losing one error report
    // beats crashing the app that was trying to report it.
  }
}
