/**
 * Single source of truth for user roles across the app.
 * Used by: staff directory, admin user edit, auth, and directory actions.
 */

export const VALID_ROLES = [
  'ADMIN',
  'BOARD',
  'PAYROLL',
  'HOME_ADMIN',
  'FACILITATOR',
  'VOLUNTEER',
  'PARTNER',
] as const

export type UserRole = (typeof VALID_ROLES)[number]

/** Order for grouping and sorting (e.g. staff directory tabs) */
export const ROLE_ORDER: UserRole[] = [
  'ADMIN',
  'BOARD',
  'PAYROLL',
  'HOME_ADMIN',
  'FACILITATOR',
  'VOLUNTEER',
  'PARTNER',
]

/** Display labels for UI */
export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Administrator',
  BOARD: 'Board Member',
  PAYROLL: 'Payroll Staff',
  HOME_ADMIN: 'Home Administrator',
  FACILITATOR: 'Facilitator',
  VOLUNTEER: 'Volunteer',
  PARTNER: 'Community Partner',
}

/** Short labels for compact UI (e.g. directory tabs) */
export const ROLE_LABELS_SHORT: Record<UserRole, string> = {
  ADMIN: 'Administration',
  BOARD: 'Board',
  PAYROLL: 'Payroll',
  HOME_ADMIN: 'Home Admins',
  FACILITATOR: 'Facilitators',
  VOLUNTEER: 'Volunteers',
  PARTNER: 'Partners',
}

export function isValidRole(role: string): role is UserRole {
  return VALID_ROLES.includes(role as UserRole)
}

export function getRoleLabel(role: string, short = false): string {
  const labels = short ? ROLE_LABELS_SHORT : ROLE_LABELS
  return isValidRole(role) ? labels[role] : role
}

export function isPayrollOrAdminRole(role: string | null | undefined): boolean {
  return role === 'PAYROLL' || role === 'ADMIN'
}

export function normalizeRoleList(roles: unknown): UserRole[] {
  if (!Array.isArray(roles)) return []
  const filtered = roles.filter((role): role is UserRole => typeof role === 'string' && isValidRole(role))
  return Array.from(new Set(filtered))
}

export function isBoardExclusiveViolation(existingRoles: string[], incomingRole: string): boolean {
  const hasBoard = existingRoles.includes('BOARD')
  if (incomingRole === 'BOARD') {
    return existingRoles.some((role) => role !== 'BOARD')
  }
  if (hasBoard && incomingRole !== 'BOARD') {
    return true
  }
  return false
}

export function canMergeRoles(existingRoles: string[], incomingRole: string): { ok: boolean; error?: string } {
  if (!isValidRole(incomingRole)) {
    return { ok: false, error: 'Invalid role' }
  }
  if (isBoardExclusiveViolation(existingRoles, incomingRole)) {
    return { ok: false, error: 'BOARD is an exclusive role and cannot be merged with other roles' }
  }
  return { ok: true }
}
