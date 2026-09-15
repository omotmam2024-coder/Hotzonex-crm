import { useEffect, useRef } from 'react'
import type { UseFormReturn } from 'react-hook-form'

/**
 * Persists an in-progress form to localStorage and restores it on mount, so a
 * dropped connection or a killed browser tab never loses work the user
 * already typed. Call `clear()` after a successful submit.
 */
export function useFormDraft<T extends Record<string, unknown>>(key: string, form: UseFormReturn<T>) {
  const storageKey = `hzx.draft.${key}`
  const restored = useRef(false)

  useEffect(() => {
    if (restored.current) return
    restored.current = true
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) {
        const draft = JSON.parse(raw) as T
        form.reset(draft, { keepDefaultValues: true })
      }
    } catch {
      // Corrupt or inaccessible storage — start clean rather than blocking the form.
    }
  }, [storageKey, form])

  useEffect(() => {
    const subscription = form.watch((values) => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(values))
      } catch {
        // Private browsing / storage full: draft persistence is best-effort.
      }
    })
    return () => subscription.unsubscribe()
  }, [storageKey, form])

  function clear() {
    try {
      localStorage.removeItem(storageKey)
    } catch {
      // Nothing to clean up if storage was never writable.
    }
  }

  return { clear }
}
