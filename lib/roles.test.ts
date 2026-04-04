import { describe, expect, it } from 'vitest'
import { canMergeRoles, normalizeRoleList } from './roles'

describe('roles multi-role policy', () => {
  it('allows facilitator + volunteer merge', () => {
    expect(canMergeRoles(['FACILITATOR'], 'VOLUNTEER')).toEqual({ ok: true })
  })

  it('allows payroll + volunteer merge', () => {
    expect(canMergeRoles(['PAYROLL'], 'VOLUNTEER')).toEqual({ ok: true })
  })

  it('rejects adding BOARD to an existing multi-role user', () => {
    const result = canMergeRoles(['FACILITATOR', 'VOLUNTEER'], 'BOARD')
    expect(result.ok).toBe(false)
    expect(result.error).toContain('BOARD is an exclusive role')
  })

  it('rejects adding any role to BOARD user', () => {
    const result = canMergeRoles(['BOARD'], 'VOLUNTEER')
    expect(result.ok).toBe(false)
    expect(result.error).toContain('BOARD is an exclusive role')
  })

  it('normalizes role arrays to unique valid values', () => {
    expect(normalizeRoleList(['VOLUNTEER', 'VOLUNTEER', 'INVALID', 'PAYROLL'])).toEqual(['VOLUNTEER', 'PAYROLL'])
  })
})
