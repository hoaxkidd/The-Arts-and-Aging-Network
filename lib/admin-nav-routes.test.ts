import { describe, it, expect } from 'vitest'
import { existsSync } from 'fs'
import { join } from 'path'
import { CANONICAL_ADMIN_NAV_HREFS } from './menu'

/** href → expected `app/` segment with page.tsx (merge safety §17.2). */
const HREF_TO_APP_PAGE: Record<string, string> = {
  '/admin': 'app/admin/page.tsx',
  '/admin/audit-log': 'app/admin/audit-log/page.tsx',
  '/admin/financials': 'app/admin/financials/page.tsx',
  '/admin/events': 'app/admin/events/page.tsx',
  '/admin/broadcasts': 'app/admin/broadcasts/page.tsx',
  '/admin/email-reminders': 'app/admin/email-reminders/page.tsx',
  '/admin/communication': 'app/admin/communication/page.tsx',
  '/admin/conversation-requests': 'app/admin/conversation-requests/page.tsx',
  '/admin/payroll-forms': 'app/admin/payroll-forms/page.tsx',
  '/admin/requests': 'app/admin/requests/page.tsx',
  '/admin/homes': 'app/admin/homes/page.tsx',
  '/admin/users': 'app/admin/users/page.tsx',
  '/staff/directory': 'app/staff/directory/page.tsx',
  '/admin/inventory': 'app/admin/inventory/page.tsx',
  '/admin/donors': 'app/admin/donors/page.tsx',
  '/admin/testimonials': 'app/admin/testimonials/page.tsx',
  '/admin/forms': 'app/admin/forms/page.tsx',
  '/admin/form-submissions': 'app/admin/form-submissions/page.tsx',
  '/admin/import': 'app/admin/import/page.tsx',
  '/admin/settings': 'app/admin/settings/page.tsx',
  '/admin/profile': 'app/admin/profile/page.tsx',
}

describe('admin nav route files exist', () => {
  const root = process.cwd()

  it('maps every canonical href to a page file', () => {
    expect(Object.keys(HREF_TO_APP_PAGE).length).toBe(21)
    expect(new Set(Object.keys(HREF_TO_APP_PAGE))).toEqual(new Set(CANONICAL_ADMIN_NAV_HREFS))
  })

  it.each(Object.entries(HREF_TO_APP_PAGE))('page exists for %s', (href, relativePath) => {
    const abs = join(root, relativePath)
    expect(existsSync(abs), `Missing ${relativePath} for ${href}`).toBe(true)
  })
})
