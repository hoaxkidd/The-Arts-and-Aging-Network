import { auth } from "@/auth"
import { NextRequest, NextResponse } from "next/server"
import { needsOnboarding, getOnboardingPath } from "@/lib/onboarding"
import { getRoleHomePath, getStaffBasePathForRole } from "@/lib/role-routes"

const authMiddleware = auth

function debugLog(hypothesisId: string, location: string, message: string, data: Record<string, unknown>) {
  // #region agent log
  fetch('http://127.0.0.1:7932/ingest/d150821c-e880-4593-9da4-b74c1d3885d0', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '7a8fa1' },
    body: JSON.stringify({
      sessionId: '7a8fa1',
      runId: 'repro-4',
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {})
  // #endregion
}

export default authMiddleware((req: NextRequest & { auth: unknown }) => {
  const isLoggedIn = !!req.auth
  const { pathname } = req.nextUrl
  const user = req.auth as { user?: { role?: string; roles?: string[]; primaryRole?: string; onboardingCompletedAt?: string; onboardingSkipCount?: number; volunteerReviewStatus?: string } } | undefined
  const userRole = user?.user?.role
  const userRoles = Array.isArray(user?.user?.roles) && user?.user?.roles.length > 0
    ? user.user.roles
    : (userRole ? [userRole] : [])
  const primaryRole = user?.user?.primaryRole || userRole
  const authUser = user?.user
  const hasRole = (role: string) => userRoles.includes(role)
  const hasAnyRole = (roles: string[]) => roles.some((role) => userRoles.includes(role))
  const onboardingCookie = req.cookies.get('onboarding_completed')

  // Add pathname to headers so layouts/components can access it
  const requestHeaders = new Headers(req.headers)
  requestHeaders.set('x-pathname', pathname)

  // Canonicalize legacy /staff URLs for role-specific namespaces
  if (isLoggedIn && pathname.startsWith('/staff') && (primaryRole === 'FACILITATOR' || primaryRole === 'BOARD')) {
    const roleBase = getStaffBasePathForRole(primaryRole)
    const suffix = pathname.slice('/staff'.length)
    return NextResponse.redirect(new URL(`${roleBase}${suffix}`, req.nextUrl))
  }

  // Facilitator namespace uses mirrored route files under /facilitator
  if (pathname.startsWith('/facilitator')) {
    if (!isLoggedIn) return NextResponse.redirect(new URL('/login', req.nextUrl))

    if (!hasRole('FACILITATOR') && !hasRole('ADMIN')) {
      return NextResponse.redirect(new URL(getRoleHomePath(primaryRole), req.nextUrl))
    }

    if (authUser && needsOnboarding(authUser) && onboardingCookie?.value !== '1') {
      const onboardingPath = getOnboardingPath(primaryRole ?? '')
      if (pathname !== onboardingPath && !pathname.startsWith('/login') && !pathname.startsWith('/invite')) {
        return NextResponse.redirect(new URL(onboardingPath, req.nextUrl))
      }
    }

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  }

  // Board namespace uses mirrored route files under /board
  if (pathname.startsWith('/board')) {
    if (!isLoggedIn) return NextResponse.redirect(new URL('/login', req.nextUrl))

    if (!hasRole('BOARD') && !hasRole('ADMIN')) {
      return NextResponse.redirect(new URL(getRoleHomePath(primaryRole), req.nextUrl))
    }

    if (authUser && needsOnboarding(authUser) && onboardingCookie?.value !== '1') {
      const onboardingPath = getOnboardingPath(primaryRole ?? '')
      if (pathname !== onboardingPath && !pathname.startsWith('/login') && !pathname.startsWith('/invite')) {
        return NextResponse.redirect(new URL(onboardingPath, req.nextUrl))
      }
    }

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  }

  // Volunteer role-named onboarding route rewritten to shared onboarding page
  if (pathname.startsWith('/volunteers/onboarding')) {
    if (!isLoggedIn) return NextResponse.redirect(new URL('/login', req.nextUrl))
    if (!hasRole('VOLUNTEER')) return NextResponse.redirect(new URL(getRoleHomePath(primaryRole), req.nextUrl))
    const rewriteUrl = new URL(req.nextUrl.toString())
    rewriteUrl.pathname = '/staff/onboarding'
    return NextResponse.rewrite(rewriteUrl, {
      request: {
        headers: requestHeaders,
      },
    })
  }

  // Onboarding: redirect staff/dashboard users who haven't completed profile
  // Also check cookie-based completion flag to avoid stale JWT issues
  if (isLoggedIn && authUser && needsOnboarding(authUser) && onboardingCookie?.value !== '1') {
    const onboardingPath = getOnboardingPath(primaryRole ?? '')
    if (pathname !== onboardingPath && !pathname.startsWith('/login') && !pathname.startsWith('/invite')) {
      if (
        pathname.startsWith('/staff') ||
        pathname.startsWith('/dashboard') ||
        pathname.startsWith('/facilitator') ||
        pathname.startsWith('/volunteers')
      ) {
        console.log('[Middleware] Redirecting to onboarding, pathname:', pathname, 'role:', userRole)
        return NextResponse.redirect(new URL(onboardingPath, req.nextUrl))
      }
    }
  }

  // Special handling for VOLUNTEER role - after 3 skips, allow access to /staff routes
  if (isLoggedIn && hasRole('VOLUNTEER')) {
    const skipCount = authUser?.onboardingSkipCount ?? 0
    // After 3 skips, allow volunteers to access /staff (except onboarding)
    if (skipCount >= 3 && pathname.startsWith('/staff') && !pathname.startsWith('/staff/onboarding')) {
      console.log('[Middleware] Volunteer with 3+ skips, allowing access to:', pathname)
      // Allow access to /staff routes
    }
  }

  // Protect admin routes
  if (pathname.startsWith('/admin')) {
    debugLog('H6', 'middleware.ts:admin-guard', 'Admin route evaluated', {
      pathname,
      isLoggedIn,
      primaryRole: primaryRole ?? null,
      roles: userRoles,
    })
    if (!isLoggedIn) return NextResponse.redirect(new URL('/login', req.nextUrl))
    if (!hasRole('ADMIN')) {
      debugLog('H6', 'middleware.ts:admin-guard', 'Admin route redirected for non-admin role', {
        pathname,
        primaryRole: primaryRole ?? null,
        roles: userRoles,
      })
      if (hasRole('PAYROLL')) return NextResponse.redirect(new URL('/payroll', req.nextUrl))
      if (hasRole('HOME_ADMIN')) return NextResponse.redirect(new URL('/dashboard', req.nextUrl))
      if (hasAnyRole(['FACILITATOR', 'BOARD', 'PARTNER', 'VOLUNTEER'])) {
        return NextResponse.redirect(new URL(getRoleHomePath(primaryRole), req.nextUrl))
      }
      return NextResponse.redirect(new URL('/', req.nextUrl))
    }
  }

  // Protect payroll routes
  if (pathname.startsWith('/payroll')) {
    if (!isLoggedIn) return NextResponse.redirect(new URL('/login', req.nextUrl))

    if (!hasRole('PAYROLL')) {
      if (hasRole('ADMIN')) return NextResponse.redirect(new URL('/admin', req.nextUrl))
      if (hasRole('HOME_ADMIN')) return NextResponse.redirect(new URL('/dashboard', req.nextUrl))
      if (hasAnyRole(['FACILITATOR', 'BOARD', 'PARTNER', 'VOLUNTEER'])) {
        return NextResponse.redirect(new URL(getRoleHomePath(primaryRole), req.nextUrl))
      }
       return NextResponse.redirect(new URL('/', req.nextUrl))
    }
  }

  // Protect dashboard routes (HOME_ADMIN)
  if (pathname.startsWith('/dashboard')) {
    if (!isLoggedIn) return NextResponse.redirect(new URL('/login', req.nextUrl))
    if (!hasRole('HOME_ADMIN')) {
      if (hasRole('ADMIN')) return NextResponse.redirect(new URL('/admin', req.nextUrl))
      if (hasRole('PAYROLL')) return NextResponse.redirect(new URL('/payroll', req.nextUrl))
      if (hasAnyRole(['FACILITATOR', 'BOARD', 'PARTNER', 'VOLUNTEER'])) {
        return NextResponse.redirect(new URL(getRoleHomePath(primaryRole), req.nextUrl))
      }
      return NextResponse.redirect(new URL('/', req.nextUrl))
    }
  }

  // Protect events routes - all authenticated users can view
  if (pathname.startsWith('/events')) {
    if (!isLoggedIn) return NextResponse.redirect(new URL('/login', req.nextUrl))
    return NextResponse.next({
      request: {
        headers: requestHeaders
      }
    })
  }

  // HOME_ADMIN and VOLUNTEER cannot access staff directory
  if (pathname.startsWith('/staff/directory')) {
    if (!isLoggedIn) return NextResponse.redirect(new URL('/login', req.nextUrl))
    if (hasRole('HOME_ADMIN') && !hasAnyRole(['ADMIN', 'FACILITATOR', 'PAYROLL', 'BOARD', 'PARTNER'])) {
      return NextResponse.redirect(new URL('/dashboard', req.nextUrl))
    }
    if (hasRole('VOLUNTEER') && !hasAnyRole(['ADMIN', 'FACILITATOR', 'PAYROLL', 'BOARD', 'PARTNER'])) {
      return NextResponse.redirect(new URL('/volunteers', req.nextUrl))
    }
    return NextResponse.next({
      request: {
        headers: requestHeaders
      }
    })
  }

  // Allow all logged-in users to access inbox and groups
  if (pathname.startsWith('/staff/inbox') || pathname.startsWith('/staff/groups')) {
    if (!isLoggedIn) return NextResponse.redirect(new URL('/login', req.nextUrl))
    return NextResponse.next({
      request: {
        headers: requestHeaders
      }
    })
  }

  // Protect staff routes (FACILITATOR/VOLUNTEER/BOARD/PARTNER/PAYROLL)
  if (pathname.startsWith('/staff')) {
    if (!isLoggedIn) return NextResponse.redirect(new URL('/login', req.nextUrl))
    const allowedStaffRoles = ['FACILITATOR', 'VOLUNTEER', 'BOARD', 'PARTNER', 'PAYROLL']
    if (!hasAnyRole(allowedStaffRoles)) {
      if (hasRole('ADMIN')) return NextResponse.redirect(new URL('/admin', req.nextUrl))
      if (hasRole('PAYROLL')) return NextResponse.redirect(new URL('/payroll', req.nextUrl))
      if (hasRole('HOME_ADMIN')) return NextResponse.redirect(new URL('/dashboard', req.nextUrl))
      return NextResponse.redirect(new URL('/', req.nextUrl))
    }
  }

  // Protect volunteers routes (VOLUNTEER only - must be approved)
  if (pathname.startsWith('/volunteers')) {
    if (!isLoggedIn) return NextResponse.redirect(new URL('/login', req.nextUrl))
    if (!hasRole('VOLUNTEER')) {
      if (hasRole('ADMIN')) return NextResponse.redirect(new URL('/admin', req.nextUrl))
      if (hasRole('PAYROLL')) return NextResponse.redirect(new URL('/payroll', req.nextUrl))
      if (hasRole('HOME_ADMIN')) return NextResponse.redirect(new URL('/dashboard', req.nextUrl))
      if (hasAnyRole(['FACILITATOR', 'BOARD', 'PARTNER'])) {
        return NextResponse.redirect(new URL(getRoleHomePath(primaryRole), req.nextUrl))
      }
      return NextResponse.redirect(new URL('/', req.nextUrl))
    }
    // Check volunteer approval status - must be APPROVED to access volunteer portal
    const volunteerStatus = authUser?.volunteerReviewStatus
    if (volunteerStatus !== 'APPROVED') {
      return NextResponse.redirect(new URL('/volunteers/onboarding', req.nextUrl))
    }

    if (pathname.startsWith('/volunteers/inbox')) {
      const suffix = pathname.slice('/volunteers'.length)
      const rewriteUrl = new URL(req.nextUrl.toString())
      rewriteUrl.pathname = `/staff${suffix}`
      return NextResponse.rewrite(rewriteUrl, {
        request: {
          headers: requestHeaders,
        },
      })
    }
  }

  // Redirect logged-in users away from login page
  if (pathname.startsWith('/login') && isLoggedIn) {
    if (primaryRole === 'ADMIN') return NextResponse.redirect(new URL('/admin', req.nextUrl))
    if (primaryRole === 'PAYROLL') return NextResponse.redirect(new URL('/payroll', req.nextUrl))
    if (primaryRole === 'HOME_ADMIN') return NextResponse.redirect(new URL('/dashboard', req.nextUrl))
    if (primaryRole === 'VOLUNTEER') return NextResponse.redirect(new URL('/volunteers', req.nextUrl))
    if (primaryRole === 'FACILITATOR' || primaryRole === 'BOARD' || primaryRole === 'PARTNER') {
      return NextResponse.redirect(new URL(getRoleHomePath(primaryRole), req.nextUrl))
    }
    return NextResponse.redirect(new URL('/', req.nextUrl))
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders
    }
  })
})

export const config = {
  matcher: [
    '/admin/:path*',
    '/dashboard/:path*',
    '/payroll/:path*',
    '/staff/:path*',
    '/facilitator/:path*',
    '/board/:path*',
    '/volunteers/:path*',
    '/events/:path*',
    '/notifications/:path*',
  ],
}
