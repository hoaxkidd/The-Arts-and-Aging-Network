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
  'CONTRACTOR',
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
  'CONTRACTOR',
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
  CONTRACTOR: 'Contractor',
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
  CONTRACTOR: 'Contractors',
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
