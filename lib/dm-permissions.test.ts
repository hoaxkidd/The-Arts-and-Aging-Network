import { describe, expect, it } from 'vitest'
import { getDmDecision } from './dm-permissions'

describe('dm permissions matrix', () => {
  it('allows admin to message anyone', () => {
    expect(getDmDecision('ADMIN', 'VOLUNTEER')).toBe('allowed')
    expect(getDmDecision('ADMIN', 'BOARD')).toBe('allowed')
  })

  it('allows anyone to message admin', () => {
    expect(getDmDecision('VOLUNTEER', 'ADMIN')).toBe('allowed')
    expect(getDmDecision('BOARD', 'ADMIN')).toBe('allowed')
    expect(getDmDecision('HOME_ADMIN', 'ADMIN')).toBe('allowed')
  })

  it('allows facilitator and payroll to message all staff roles directly', () => {
    expect(getDmDecision('FACILITATOR', 'PAYROLL')).toBe('allowed')
    expect(getDmDecision('FACILITATOR', 'VOLUNTEER')).toBe('allowed')
    expect(getDmDecision('PAYROLL', 'FACILITATOR')).toBe('allowed')
    expect(getDmDecision('PAYROLL', 'BOARD')).toBe('allowed')
    expect(getDmDecision('PAYROLL', 'HOME_ADMIN')).toBe('allowed')
  })

  it('allows volunteer to message facilitators directly', () => {
    expect(getDmDecision('VOLUNTEER', 'FACILITATOR')).toBe('allowed')
  })

  it('requires approval for volunteer to message other non-admin roles', () => {
    expect(getDmDecision('VOLUNTEER', 'VOLUNTEER')).toBe('requires_approval')
    expect(getDmDecision('VOLUNTEER', 'PAYROLL')).toBe('requires_approval')
    expect(getDmDecision('VOLUNTEER', 'BOARD')).toBe('requires_approval')
  })

  it('requires approval for board/home admin/partner when target is non-admin', () => {
    expect(getDmDecision('BOARD', 'FACILITATOR')).toBe('requires_approval')
    expect(getDmDecision('HOME_ADMIN', 'FACILITATOR')).toBe('requires_approval')
    expect(getDmDecision('PARTNER', 'VOLUNTEER')).toBe('requires_approval')
  })
})
