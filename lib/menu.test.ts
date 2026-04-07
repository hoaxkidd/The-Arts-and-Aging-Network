import { describe, it, expect } from 'vitest'
import {
  adminNavGroups,
  CANONICAL_ADMIN_NAV_HREFS,
  adminNavHrefIsActive,
} from './menu'

const FROZEN_22 = [
  '/admin',
  '/admin/audit-log',
  '/admin/financials',
  '/admin/events',
  '/admin/event-requests',
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
  it('has exactly 22 unique child hrefs matching frozen list', () => {
    const flat = adminNavGroups.flatMap((g) => g.children.map((c) => c.href))
    expect(new Set(flat).size).toBe(22)
    expect(flat.length).toBe(22)
    expect(new Set(flat)).toEqual(new Set(FROZEN_22))
    expect([...CANONICAL_ADMIN_NAV_HREFS].sort()).toEqual([...FROZEN_22].sort())
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
