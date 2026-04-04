export function getRoleHomePath(role: string | null | undefined): string {
  switch (role) {
    case 'ADMIN':
      return '/admin'
    case 'PAYROLL':
      return '/payroll'
    case 'HOME_ADMIN':
      return '/dashboard'
    case 'VOLUNTEER':
      return '/volunteers'
    case 'FACILITATOR':
      return '/facilitator'
    case 'BOARD':
      return '/board'
    case 'PARTNER':
      return '/staff'
    default:
      return '/'
  }
}

export function getStaffBasePathForRole(role: string | null | undefined): string {
  if (role === 'FACILITATOR') return '/facilitator'
  if (role === 'BOARD') return '/board'
  return '/staff'
}

export function getInboxBasePathForRole(role: string | null | undefined): string {
  if (role === 'VOLUNTEER') return '/volunteers'
  if (role === 'FACILITATOR') return '/facilitator'
  if (role === 'BOARD') return '/board'
  return '/staff'
}

export function getStaffBasePathFromPathname(pathname: string): string {
  if (pathname.startsWith('/facilitator')) return '/facilitator'
  if (pathname.startsWith('/board')) return '/board'
  if (pathname.startsWith('/staff')) return '/staff'
  return '/staff'
}

export function normalizeStaffNamespace(pathname: string): string {
  if (pathname.startsWith('/facilitator/')) return pathname.replace('/facilitator/', '/staff/')
  if (pathname === '/facilitator') return '/staff'
  if (pathname.startsWith('/board/')) return pathname.replace('/board/', '/staff/')
  if (pathname === '/board') return '/staff'
  return pathname
}
