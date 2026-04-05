'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { completeOnboarding, skipOnboarding } from '@/app/actions/staff-onboarding'
import { STYLES } from '@/lib/styles'
import { cn } from '@/lib/utils'

export function OnboardingActions({ 
  redirectTo = '/staff'
}: { 
  redirectTo?: string
}) {
  const router = useRouter()
  const [isCompleting, setIsCompleting] = useState(false)
  const [isSkipping, setIsSkipping] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Determine redirect URL dynamically based on role and approval status
  const getRedirectUrl = () => {
    // If already on volunteer portal path, stay there
    if (redirectTo.includes('/volunteers')) {
      return redirectTo
    }
    // Otherwise use provided redirectTo (should be /staff for staff roles)
    return redirectTo
  }

  async function handleComplete() {
    setIsCompleting(true)
    setError(null)
    
    try {
      const result = await completeOnboarding()
      
      if (result?.success) {
        const target = result.redirectTo || getRedirectUrl()
        router.refresh()
        router.push(target)
      } else if (result?.error) {
        setError(result.error)
      }
    } catch (e) {
      setError('An unexpected error occurred')
    }
    
    setIsCompleting(false)
  }

  async function handleSkip() {
    setIsSkipping(true)
    setError(null)
    
    try {
      const result = await skipOnboarding()
      
      if (result?.success) {
        const target = result.redirectTo || getRedirectUrl()
        router.refresh()
        router.push(target)
      } else if (result?.error) {
        setError(result.error)
      }
    } catch (e) {
      setError('An unexpected error occurred')
    }
    
    setIsSkipping(false)
  }

  return (
    <div className="flex flex-col gap-3 pt-4 border-t border-gray-200">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleComplete}
          disabled={isCompleting}
          className={cn(STYLES.btn, STYLES.btnPrimary, isCompleting && 'opacity-70 cursor-not-allowed')}
        >
          {isCompleting ? 'Saving...' : "Save & Continue"}
        </button>
        <button
          type="button"
          onClick={handleSkip}
          disabled={isSkipping}
          className={cn(STYLES.btn, STYLES.btnGhost, isSkipping && 'opacity-70 cursor-not-allowed')}
        >
          {isSkipping ? 'Processing...' : 'Remind me later'}
        </button>
      </div>
    </div>
  )
}
