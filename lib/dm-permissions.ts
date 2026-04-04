type DmDecision = 'allowed' | 'requires_approval'

type Role = string | null | undefined

function isStaffRole(role: Role): boolean {
  return role === 'FACILITATOR' || role === 'PAYROLL' || role === 'VOLUNTEER' || role === 'BOARD' || role === 'PARTNER' || role === 'HOME_ADMIN'
}

export function getDmDecision(senderRole: Role, targetRole: Role): DmDecision {
  if (!senderRole || !targetRole) return 'requires_approval'

  // Global bypasses
  if (senderRole === 'ADMIN') return 'allowed'
  if (targetRole === 'ADMIN') return 'allowed'

  // Facilitators and payroll can message all staff directly
  if ((senderRole === 'FACILITATOR' || senderRole === 'PAYROLL') && isStaffRole(targetRole)) {
    return 'allowed'
  }

  // Volunteers can message admins/facilitators directly; all others need approval
  if (senderRole === 'VOLUNTEER') {
    return targetRole === 'FACILITATOR' ? 'allowed' : 'requires_approval'
  }

  // Board can message admin directly; all others need approval
  if (senderRole === 'BOARD') {
    return 'requires_approval'
  }

  // Home admins and partners require approval unless admin (handled above)
  if (senderRole === 'HOME_ADMIN' || senderRole === 'PARTNER') {
    return 'requires_approval'
  }

  return 'requires_approval'
}
