export type BookingsAccessPolicyConfig = {
  allowedRoles: string[]
}

export const BOOKINGS_ACCESS_POLICY_TEMPLATE_TYPE = 'BOOKINGS_ACCESS_POLICY_CONFIG'

export const DEFAULT_BOOKINGS_ACCESS_POLICY_CONFIG: BookingsAccessPolicyConfig = {
  allowedRoles: ['ADMIN', 'VOLUNTEER', 'FACILITATOR', 'BOARD'],
}

export const BOOKING_ACCESS_CANDIDATE_ROLES = ['ADMIN', 'VOLUNTEER', 'FACILITATOR', 'BOARD'] as const

export const BOOKING_ACCESS_ROLE_LABELS: Record<(typeof BOOKING_ACCESS_CANDIDATE_ROLES)[number], string> = {
  ADMIN: 'Administrator',
  VOLUNTEER: 'Volunteer',
  FACILITATOR: 'Facilitator',
  BOARD: 'Board',
}

const VALID_BOOKINGS_ROLES = [...BOOKING_ACCESS_CANDIDATE_ROLES]

function uniqRoles(roles: string[]): string[] {
  return Array.from(new Set(roles))
}

export function normalizeBookingsAllowedRoles(roles: unknown): string[] {
  if (!Array.isArray(roles)) return [...DEFAULT_BOOKINGS_ACCESS_POLICY_CONFIG.allowedRoles]

  const normalized = uniqRoles(
    roles
      .map((role) => (typeof role === 'string' ? role.trim().toUpperCase() : ''))
      .filter((role) => VALID_BOOKINGS_ROLES.includes(role))
  )

  return normalized.length > 0
    ? normalized
    : [...DEFAULT_BOOKINGS_ACCESS_POLICY_CONFIG.allowedRoles]
}

export function parseBookingsAccessPolicyConfig(raw: string | null | undefined): BookingsAccessPolicyConfig {
  if (!raw) return { ...DEFAULT_BOOKINGS_ACCESS_POLICY_CONFIG }

  try {
    const parsed = JSON.parse(raw)
    return {
      allowedRoles: normalizeBookingsAllowedRoles(parsed?.allowedRoles),
    }
  } catch {
    return { ...DEFAULT_BOOKINGS_ACCESS_POLICY_CONFIG }
  }
}

export function canRoleAccessBookings(role: string | null | undefined, config: BookingsAccessPolicyConfig): boolean {
  if (!role) return false
  if (role === 'HOME_ADMIN') return false
  return config.allowedRoles.includes(role)
}
