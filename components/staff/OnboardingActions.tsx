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

  async function handleComplete() {
    setIsCompleting(true)
    
    // Auto-save: Find and submit the profile form
    const form = document.querySelector('form')
    if (form) {
      const formData = new FormData(form)
      const saveResult = await updateStaffProfile(formData)
      if (saveResult?.error) {
        alert('Failed to save profile: ' + saveResult.error)
        setIsCompleting(false)
        return
      }
    }
    
    // Then complete onboarding
    const result = await completeOnboarding()
    if (result?.success) {
      router.push(redirectTo)
      router.refresh()
    } else if (result?.error) {
      alert('Failed to complete onboarding: ' + result.error)
    }
    setIsCompleting(false)
  }

  async function handleSkip() {
    setIsSkipping(true)
    const result = await skipOnboarding()
    if (result?.success) {
      router.push(redirectTo)
      router.refresh()
    } else if (result?.error) {
      alert('Failed to skip onboarding: ' + result.error)
    }
    setIsSkipping(false)
  }

  return (
    <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-gray-200">
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
        {isSkipping ? '...' : 'Remind me later'}
      </button>
    </div>
  )
}
