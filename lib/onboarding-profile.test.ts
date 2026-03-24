import { describe, it, expect } from 'vitest'

// Test ProfileForm skills pre-fill logic
describe('components/staff/ProfileForm.tsx - Skills Pre-fill Logic', () => {
  // Simulate the skills logic from ProfileForm
  type RoleData = { skills?: string[] }
  type IntakeData = { skills?: string[]; tasks?: { name: string; rating: number }[]; hobbies?: string }

  const parseJson = <T>(str: string | null, fallback: T): T => {
    if (!str) return fallback
    try {
      return JSON.parse(str) as T
    } catch {
      return fallback
    }
  }

  const getInitialSkills = (intakeAnswers: string | null, roleData: string | null): string[] => {
    const intake = parseJson<IntakeData>(intakeAnswers, { skills: [], tasks: [], hobbies: '' })
    const roleDataParsed = parseJson<RoleData>(roleData, {})
    const roleDataSkills = Array.isArray(roleDataParsed.skills) ? roleDataParsed.skills : []
    
    const intakeSkills = Array.isArray(intake.skills) ? intake.skills : []
    
    // Use intake skills, fallback to roleData skills if empty
    return intakeSkills.length > 0 ? intakeSkills : roleDataSkills
  }

  describe('getInitialSkills', () => {
    it('should return intake skills when present', () => {
      const intakeAnswers = JSON.stringify({ skills: ['Art', 'Music'], tasks: [], hobbies: '' })
      const result = getInitialSkills(intakeAnswers, null)
      expect(result).toEqual(['Art', 'Music'])
    })

    it('should fallback to roleData skills when intake is empty', () => {
      const intakeAnswers = JSON.stringify({ skills: [], tasks: [], hobbies: '' })
      const roleData = JSON.stringify({ skills: ['Exercise', 'Dance'] })
      const result = getInitialSkills(intakeAnswers, roleData)
      expect(result).toEqual(['Exercise', 'Dance'])
    })

    it('should prefer roleData when intake skills is missing', () => {
      const intakeAnswers = JSON.stringify({ tasks: [], hobbies: '' })
      const roleData = JSON.stringify({ skills: ['Photography'] })
      const result = getInitialSkills(intakeAnswers, roleData)
      expect(result).toEqual(['Photography'])
    })

    it('should return empty array when both are empty', () => {
      const intakeAnswers = JSON.stringify({ skills: [], tasks: [], hobbies: '' })
      const roleData = JSON.stringify({ skills: [] })
      const result = getInitialSkills(intakeAnswers, roleData)
      expect(result).toEqual([])
    })

    it('should return empty array when both are null', () => {
      const result = getInitialSkills(null, null)
      expect(result).toEqual([])
    })

    it('should handle malformed JSON gracefully', () => {
      const result = getInitialSkills('invalid json', null)
      expect(result).toEqual([])
    })

    it('should return roleData skills when intake is malformed', () => {
      const roleData = JSON.stringify({ skills: ['Cooking'] })
      const result = getInitialSkills('invalid json', roleData)
      expect(result).toEqual(['Cooking'])
    })
  })
})

// Test emergency contact parsing logic
describe('components/staff/ProfileForm.tsx - Emergency Contact Logic', () => {
  const parseEmergencyContact = (ecString: string | null): Record<string, string> => {
    if (!ecString) return {}
    try {
      return JSON.parse(ecString)
    } catch {
      return {}
    }
  }

  describe('parseEmergencyContact', () => {
    it('should parse valid emergency contact JSON', () => {
      const ecString = JSON.stringify({ name: 'John Doe', phone: '555-1234', relation: 'Father' })
      const result = parseEmergencyContact(ecString)
      expect(result).toEqual({ name: 'John Doe', phone: '555-1234', relation: 'Father' })
    })

    it('should return empty object for null', () => {
      expect(parseEmergencyContact(null)).toEqual({})
    })

    it('should return empty object for empty string', () => {
      expect(parseEmergencyContact('')).toEqual({})
    })

    it('should return empty object for invalid JSON', () => {
      expect(parseEmergencyContact('not valid json')).toEqual({})
    })

    it('should handle partial data', () => {
      const ecString = JSON.stringify({ name: 'Jane Doe' })
      const result = parseEmergencyContact(ecString)
      expect(result).toEqual({ name: 'Jane Doe' })
    })
  })
})

// Test flat mode section visibility
describe('components/staff/ProfileForm.tsx - Flat Mode Section Logic', () => {
  type VisibleTabs = string[] | undefined

  const showSection = (id: string, visibleTabs: VisibleTabs): boolean => {
    return !visibleTabs || visibleTabs.includes(id)
  }

  describe('showSection', () => {
    it('should return true when no visibleTabs specified', () => {
      expect(showSection('contact', undefined)).toBe(true)
      expect(showSection('emergency', undefined)).toBe(true)
      expect(showSection('health', undefined)).toBe(true)
    })

    it('should return true when section is in visibleTabs', () => {
      const visibleTabs = ['personal', 'contact', 'emergency', 'health', 'intake']
      expect(showSection('contact', visibleTabs)).toBe(true)
      expect(showSection('emergency', visibleTabs)).toBe(true)
    })

    it('should return false when section is not in visibleTabs', () => {
      const visibleTabs = ['personal', 'contact', 'health']
      expect(showSection('emergency', visibleTabs)).toBe(false)
    })

    it('should return true for all sections when visibleTabs includes them all', () => {
      const visibleTabs = ['personal', 'contact', 'emergency', 'health', 'intake', 'employment', 'skills', 'compliance', 'documents']
      expect(showSection('personal', visibleTabs)).toBe(true)
      expect(showSection('contact', visibleTabs)).toBe(true)
      expect(showSection('emergency', visibleTabs)).toBe(true)
      expect(showSection('health', visibleTabs)).toBe(true)
    })
  })
})

// Test onboarding status banner logic
describe('app/staff/onboarding/page.tsx - Status Banner Logic', () => {
  type VolunteerStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REQUEST_CORRECTIONS' | undefined

  const getBannerState = (status: VolunteerStatus): { showBanner: boolean; type: 'pending' | 'approved' | 'corrections' | null } => {
    switch (status) {
      case 'PENDING_REVIEW':
        return { showBanner: true, type: 'pending' }
      case 'APPROVED':
        return { showBanner: true, type: 'approved' }
      case 'REQUEST_CORRECTIONS':
        return { showBanner: true, type: 'corrections' }
      default:
        return { showBanner: false, type: null }
    }
  }

  describe('getBannerState', () => {
    it('should return pending banner for PENDING_REVIEW', () => {
      const result = getBannerState('PENDING_REVIEW')
      expect(result.showBanner).toBe(true)
      expect(result.type).toBe('pending')
    })

    it('should return approved banner for APPROVED', () => {
      const result = getBannerState('APPROVED')
      expect(result.showBanner).toBe(true)
      expect(result.type).toBe('approved')
    })

    it('should return corrections banner for REQUEST_CORRECTIONS', () => {
      const result = getBannerState('REQUEST_CORRECTIONS')
      expect(result.showBanner).toBe(true)
      expect(result.type).toBe('corrections')
    })

    it('should return no banner for undefined', () => {
      const result = getBannerState(undefined)
      expect(result.showBanner).toBe(false)
      expect(result.type).toBe(null)
    })
  })
})