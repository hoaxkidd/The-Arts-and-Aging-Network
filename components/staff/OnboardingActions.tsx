'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { completeOnboarding, skipOnboarding } from '@/app/actions/staff-onboarding'
import { updateStaffProfile } from '@/app/actions/staff'
import { STYLES } from '@/lib/styles'
import { cn } from '@/lib/utils'

export function OnboardingActions({ redirectTo = '/staff' }: { redirectTo?: string }) {
  const router = useRouter()
  const [isCompleting, setIsCompleting] = useState(false)
  const [isSkipping, setIsSkipping] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleComplete() {
    console.log('[OnboardingActions] handleComplete called')
    setIsCompleting(true)
    setError(null)
    
    try {
      // Auto-save: Find and submit the profile form
      const form = document.querySelector('form')
      if (form) {
        console.log('[OnboardingActions] Saving profile form...')
        const formData = new FormData(form)
        const saveResult = await updateStaffProfile(formData)
        console.log('[OnboardingActions] Save result:', saveResult)
        
        if (saveResult?.error) {
          alert('Failed to save profile: ' + saveResult.error)
          setIsCompleting(false)
          return
        }
        console.log('[OnboardingActions] Profile saved successfully')
      } else {
        console.log('[OnboardingActions] No form found to save')
      }
      
      // Then complete onboarding
      console.log('[OnboardingActions] Completing onboarding...')
      const result = await completeOnboarding()
      console.log('[OnboardingActions] Complete result:', result)
      
      if (result?.success) {
        console.log('[OnboardingActions] Onboarding completed, redirecting to:', redirectTo)
        router.push(redirectTo)
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
    console.log('[OnboardingActions] handleSkip called')
    setIsSkipping(true)
    setError(null)
    
    try {
      console.log('[OnboardingActions] Skipping onboarding...')
      const result = await skipOnboarding()
      console.log('[OnboardingActions] Skip result:', result)
      
      if (result?.success) {
        console.log('[OnboardingActions] Onboarding skipped, redirecting to:', redirectTo)
        router.push(redirectTo)
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
