import { WifiOffIcon } from 'lucide-react'
import { useEffect, useState } from 'react'

/** A persistent banner while the browser reports no connection — data on screen may be stale/cached. */
export function OfflineBanner() {
  const [online, setOnline] = useState(() => navigator.onLine)

  useEffect(() => {
    const goOnline = () => setOnline(true)
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  if (online) return null

  return (
    <div className="flex items-center justify-center gap-2 bg-warning/15 px-4 py-1.5 text-xs font-medium text-warning no-print">
      <WifiOffIcon className="size-3.5" /> You're offline — showing cached data where available.
    </div>
  )
}
