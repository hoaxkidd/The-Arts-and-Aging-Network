/**
 * Onboarding: prompt users to complete their profile after first login.
 * "Medium" enforcement: allow skipping a limited number of times.
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
  const staffRoles = ['FACILITATOR', 'CONTRACTOR', 'VOLUNTEER', 'BOARD', 'PARTNER']
  const dashboardRoles = ['HOME_ADMIN']
  return staffRoles.includes(user.role ?? '') || dashboardRoles.includes(user.role ?? '')
}

export function getOnboardingPath(role: string): string {
  if (role === 'HOME_ADMIN') return '/dashboard/onboarding'
  return '/staff/onboarding'
}
