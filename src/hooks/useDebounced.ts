import { useEffect, useState } from 'react'

/** Debounce a fast-changing value — search inputs default to 350ms per the low-bandwidth discipline. */
export function useDebounced<T>(value: T, delayMs = 350) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(t)
  }, [value, delayMs])
  return debounced
}
