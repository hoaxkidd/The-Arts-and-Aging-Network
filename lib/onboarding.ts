/**
 * Onboarding: prompt users to complete their profile after first login.
 * Only FACILITATOR, VOLUNTEER, and PARTNER roles require onboarding.
 * HOME_ADMIN and BOARD are exempt.
 */

const MAX_SKIP_COUNT = 3

export type SessionUser = {
  id?: string
  role?: string
  onboardingCompletedAt?: string | null
  onboardingSkipCount?: number
}

/**
 * Returns true if the user should be shown the onboarding / profile completion flow.
 * Staff and dashboard users who have not completed onboarding and have not exceeded skip count.
 */
export function needsOnboarding(user: SessionUser | null | undefined): boolean {
  if (!user?.id) return false
  if (user.onboardingCompletedAt) return false
  const skipCount = user.onboardingSkipCount ?? 0
  if (skipCount >= MAX_SKIP_COUNT) return false
  // Only FACILITATOR, VOLUNTEER, and PARTNER require onboarding
  // HOME_ADMIN and BOARD are exempt
  const staffRoles = ['FACILITATOR', 'VOLUNTEER', 'PARTNER']
  return staffRoles.includes(user.role ?? '')
}

export function getOnboardingPath(_role: string): string {
  // All roles that need onboarding go to /staff/onboarding
  return '/staff/onboarding'
}
