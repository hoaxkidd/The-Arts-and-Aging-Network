import { describe, it, expect } from 'vitest'
import {
  adminNavGroups,
  CANONICAL_ADMIN_NAV_HREFS,
  adminNavHrefIsActive,
} from './menu'

const FROZEN_21 = [
  '/admin',
  '/admin/audit-log',
  '/admin/financials',
  '/admin/bookings',
  '/admin/broadcasts',
  '/admin/email-reminders',
  '/admin/communication',
  '/admin/conversation-requests',
  '/admin/payroll-forms',
  '/admin/requests',
  '/admin/homes',
  '/admin/users',
  '/staff/directory',
  '/admin/inventory',
  '/admin/donors',
  '/admin/testimonials',
  '/admin/forms',
  '/admin/form-submissions',
  '/admin/import',
  '/admin/settings',
  '/admin/profile',
] as const

describe('adminNavGroups', () => {
  it('has exactly 21 unique child hrefs matching frozen list', () => {
    const flat = adminNavGroups.flatMap((g) => g.children.map((c) => c.href))
    expect(new Set(flat).size).toBe(21)
    expect(flat.length).toBe(21)
    expect(new Set(flat)).toEqual(new Set(FROZEN_21))
    expect([...CANONICAL_ADMIN_NAV_HREFS].sort()).toEqual([...FROZEN_21].sort())
  })

  it('has 8 groups', () => {
    expect(adminNavGroups.length).toBe(8)
  })
})

describe('adminNavHrefIsActive', () => {
  it('matches /admin only for dashboard root', () => {
    expect(adminNavHrefIsActive('/admin', '/admin')).toBe(true)
    expect(adminNavHrefIsActive('/admin/users', '/admin')).toBe(false)
  })

  it('matches prefix for nested admin routes', () => {
    expect(adminNavHrefIsActive('/admin/users/xyz', '/admin/users')).toBe(true)
    expect(adminNavHrefIsActive('/admin/homes/h1', '/admin/homes')).toBe(true)
  })

  it('matches staff directory and subpaths', () => {
    expect(adminNavHrefIsActive('/staff/directory', '/staff/directory')).toBe(true)
    expect(adminNavHrefIsActive('/staff/directory/u1', '/staff/directory')).toBe(true)
  })
})
