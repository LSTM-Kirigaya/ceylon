'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

export function AnalyticsTracker() {
  const pathname = usePathname()
  const last = useRef<string | null>(null)

  useEffect(() => {
    if (!pathname || pathname === last.current) return
    last.current = pathname
    const t = window.setTimeout(() => {
      void fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ path: pathname }),
      }).catch(() => {})
    }, 400)
    return () => window.clearTimeout(t)
  }, [pathname])

  return null
}
