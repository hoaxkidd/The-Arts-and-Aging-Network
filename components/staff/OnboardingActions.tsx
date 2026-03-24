'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { completeOnboarding, skipOnboarding } from '@/app/actions/staff-onboarding'
import { STYLES } from '@/lib/styles'
import { cn } from '@/lib/utils'

export function OnboardingActions({ 
  redirectTo = '/staff',
  role = 'FACILITATOR'
}: { 
  redirectTo?: string
  role?: string 
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
    console.log('[OnboardingActions] handleComplete called, role:', role)
    setIsCompleting(true)
    setError(null)
    
    try {
      console.log('[OnboardingActions] Calling completeOnboarding...')
      const result = await completeOnboarding()
      console.log('[OnboardingActions] Complete result:', result)
      
      if (result?.success) {
        console.log('[OnboardingActions] Success, redirecting to:', getRedirectUrl())
        router.push(getRedirectUrl())
        router.refresh()
      } else if (result?.error) {
        console.error('[OnboardingActions] Complete error:', result.error)
        setError(result.error)
        alert('Failed to complete onboarding: ' + result.error)
      }
    } catch (e) {
      console.error('[OnboardingActions] Exception:', e)
      setError('An unexpected error occurred')
      alert('An unexpected error occurred')
    }
    
    setIsCompleting(false)
  }

  async function handleSkip() {
    console.log('[OnboardingActions] handleSkip called, role:', role)
    setIsSkipping(true)
    setError(null)
    
    try {
      console.log('[OnboardingActions] Calling skipOnboarding...')
      const result = await skipOnboarding()
      console.log('[OnboardingActions] Skip result:', result)
      
      if (result?.success) {
        console.log('[OnboardingActions] Success, redirecting to:', getRedirectUrl())
        router.push(getRedirectUrl())
        router.refresh()
      } else if (result?.error) {
        console.error('[OnboardingActions] Skip error:', result.error)
        setError(result.error)
        alert('Failed to skip onboarding: ' + result.error)
      }
    } catch (e) {
      console.error('[OnboardingActions] Skip exception:', e)
      setError('An unexpected error occurred')
      alert('An unexpected error occurred')
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
