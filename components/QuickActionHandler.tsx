'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// setup keyboard shortcuts
export function QuickActionHandler() {
  const router = useRouter()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // shortcuts only work if not typing in an input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return

      // Alt + N: New Request
      if (e.altKey && e.key === 'n') {
        e.preventDefault()
        router.push('/payroll/requests')
      }
      // Alt + P: Profile
      if (e.altKey && e.key === 'p') {
        e.preventDefault()
        router.push('/payroll/profile')
      }
      // Alt + D: Dashboard
      if (e.altKey && e.key === 'd') {
        e.preventDefault()
        router.push('/payroll')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [router])

  return null
}
