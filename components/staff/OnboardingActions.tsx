'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { completeOnboarding, skipOnboarding } from '@/app/actions/staff-onboarding'
import { STYLES } from '@/lib/styles'
import { cn } from '@/lib/utils'

export function OnboardingActions({ redirectTo = '/staff' }: { redirectTo?: string }) {
  const router = useRouter()
  const [isCompleting, setIsCompleting] = useState(false)
  const [isSkipping, setIsSkipping] = useState(false)

  async function handleComplete() {
    setIsCompleting(true)
    const result = await completeOnboarding()
    if (result?.success) {
      router.push(redirectTo)
      router.refresh()
    }
    setIsCompleting(false)
  }

  async function handleSkip() {
    setIsSkipping(true)
    const result = await skipOnboarding()
    if (result?.success) {
      router.push(redirectTo)
      router.refresh()
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
        {isCompleting ? 'Saving...' : "I've reviewed my profile — continue"}
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
