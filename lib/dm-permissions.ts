type DmDecision = 'allowed' | 'requires_approval'

type Role = string | null | undefined

export function getDmDecision(senderRole: Role, targetRole: Role): DmDecision {
  if (!senderRole || !targetRole) return 'requires_approval'

  // Admin can message anyone directly
  if (senderRole === 'ADMIN') return 'allowed'

  // Everyone can message admin directly
  if (targetRole === 'ADMIN') return 'allowed'

  // Any non-admin to non-admin conversation start requires admin approval.
  return 'requires_approval'
}
