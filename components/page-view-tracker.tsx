'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { trackClientEvent } from '@/lib/track-client'

// Reports one page_view per navigation. The admin dashboard is skipped so reviewing usage doesn't inflate it.
export function PageViewTracker() {
  const pathname = usePathname()
  const lastPath = useRef<string | null>(null)

  useEffect(() => {
    if (lastPath.current === pathname || pathname.startsWith('/admin')) return
    lastPath.current = pathname
    trackClientEvent('page_view')
  }, [pathname])

  return null
}
