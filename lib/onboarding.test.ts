import { describe, it, expect } from 'vitest'
import { needsOnboarding, getOnboardingPath } from './onboarding'

describe('lib/onboarding.ts', () => {
  describe('needsOnboarding', () => {
    it('should return false for null user', () => {
      expect(needsOnboarding(null)).toBe(false)
    })

    it('should return false for undefined user', () => {
      expect(needsOnboarding(undefined)).toBe(false)
    })

    it('should return false for user without id', () => {
      expect(needsOnboarding({ role: 'VOLUNTEER' })).toBe(false)
    })

    it('should return false when onboarding is completed', () => {
      const user = {
        id: '123',
        role: 'VOLUNTEER',
        onboardingCompletedAt: '2024-01-01T00:00:00.000Z'
      }
      expect(needsOnboarding(user)).toBe(false)
    })

    it('should return false for FACILITATOR when onboarding is completed', () => {
      const user = {
        id: '123',
        role: 'FACILITATOR',
        onboardingCompletedAt: '2024-01-01T00:00:00.000Z'
      }
      expect(needsOnboarding(user)).toBe(false)
    })

    it('should return true for FACILTEER who has not completed onboarding', () => {
      const user = {
        id: '123',
        role: 'FACILITATOR'
      }
      expect(needsOnboarding(user)).toBe(true)
    })

    it('should return true for VOLUNTEER who has not completed onboarding', () => {
      const user = {
        id: '123',
        role: 'VOLUNTEER'
      }
      expect(needsOnboarding(user)).toBe(true)
    })

    it('should return true for PARTNER who has not completed onboarding', () => {
      const user = {
        id: '123',
        role: 'PARTNER'
      }
      expect(needsOnboarding(user)).toBe(true)
    })

    it('should return false for ADMIN', () => {
      const user = {
        id: '123',
        role: 'ADMIN'
      }
      expect(needsOnboarding(user)).toBe(false)
    })

    it('should return false for HOME_ADMIN', () => {
      const user = {
        id: '123',
        role: 'HOME_ADMIN'
      }
      expect(needsOnboarding(user)).toBe(false)
    })

    it('should return false for BOARD', () => {
      const user = {
        id: '123',
        role: 'BOARD'
      }
      expect(needsOnboarding(user)).toBe(false)
    })

    it('should return false for PAYROLL', () => {
      const user = {
        id: '123',
        role: 'PAYROLL'
      }
      expect(needsOnboarding(user)).toBe(false)
    })

    it('should return false when skip count is 3 or more', () => {
      const user = {
        id: '123',
        role: 'VOLUNTEER',
        onboardingSkipCount: 3
      }
      expect(needsOnboarding(user)).toBe(false)
    })

    it('should return true when skip count is less than 3', () => {
      const user = {
        id: '123',
        role: 'VOLUNTEER',
        onboardingSkipCount: 2
      }
      expect(needsOnboarding(user)).toBe(true)
    })

    it('should return false for unknown roles', () => {
      const user = {
        id: '123',
        role: 'UNKNOWN_ROLE'
      }
      expect(needsOnboarding(user)).toBe(false)
    })

    it('should handle missing skip count as 0', () => {
      const user = {
        id: '123',
        role: 'VOLUNTEER',
        onboardingSkipCount: undefined
      }
      expect(needsOnboarding(user)).toBe(true)
    })
  })

  describe('getOnboardingPath', () => {
    it('should return /volunteer/onboarding for VOLUNTEER', () => {
      expect(getOnboardingPath('VOLUNTEER')).toBe('/volunteer/onboarding')
    })

    it('should return /facilitator/onboarding for FACILITATOR', () => {
      expect(getOnboardingPath('FACILITATOR')).toBe('/facilitator/onboarding')
    })

    it('should return /staff/onboarding for PARTNER', () => {
      expect(getOnboardingPath('PARTNER')).toBe('/staff/onboarding')
    })

    it('should return /staff/onboarding for exempt/other roles', () => {
      expect(getOnboardingPath('ADMIN')).toBe('/staff/onboarding')
      expect(getOnboardingPath('HOME_ADMIN')).toBe('/staff/onboarding')
      expect(getOnboardingPath('BOARD')).toBe('/staff/onboarding')
    })
  })
})
