import { auth } from "@/auth"
import { NextRequest, NextResponse } from "next/server"
import { needsOnboarding, getOnboardingPath } from "@/lib/onboarding"
import { getRoleHomePath, getStaffBasePathForRole } from "@/lib/role-routes"

const authMiddleware = auth

export default authMiddleware((req: NextRequest & { auth: unknown }) => {
  const isLoggedIn = !!req.auth
  const { pathname } = req.nextUrl

  // Permanent backward-compatibility redirects for legacy Event-era URLs.
  // Keep these mappings to avoid breaking older links and integrations.
  const legacyRedirects: Array<[string, string]> = [
    ['/admin/events', '/admin/bookings'],
    ['/dashboard/events', '/dashboard/bookings'],
    ['/staff/events', '/staff/bookings'],
    ['/facilitator/events', '/facilitator/bookings'],
    ['/board/events', '/board/bookings'],
    ['/partner/events', '/partner/bookings'],
    ['/dashboard/my-events', '/dashboard/my-bookings'],
    ['/staff/my-events', '/staff/my-bookings'],
    ['/facilitator/my-events', '/facilitator/my-bookings'],
    ['/partner/my-events', '/partner/my-bookings'],
    ['/volunteer/my-events', '/volunteer/my-bookings'],
    ['/admin/event-requests', '/admin/booking-requests'],
    ['/events', '/bookings'],
  ]

  for (const [legacyPrefix, canonicalPrefix] of legacyRedirects) {
    if (pathname === legacyPrefix || pathname.startsWith(`${legacyPrefix}/`)) {
      const nextUrl = req.nextUrl.clone()
      nextUrl.pathname = pathname.replace(legacyPrefix, canonicalPrefix)
      return NextResponse.redirect(nextUrl, 308)
    }
  }
  const user = req.auth as { user?: { role?: string; roles?: string[]; primaryRole?: string; onboardingCompletedAt?: string; onboardingSkipCount?: number; volunteerReviewStatus?: string } } | undefined
  const userRole = user?.user?.role
  const userRoles = Array.isArray(user?.user?.roles) && user?.user?.roles.length > 0
    ? user.user.roles
    : (userRole ? [userRole] : [])
  const primaryRole = user?.user?.primaryRole || userRole
  const requestedActiveRoleCookie = req.cookies.get('active_role')?.value
  const activeRole = requestedActiveRoleCookie && userRoles.includes(requestedActiveRoleCookie)
    ? requestedActiveRoleCookie
    : primaryRole
  const authUser = user?.user
  const hasRole = (role: string) => userRoles.includes(role)
  const hasAnyRole = (roles: string[]) => roles.some((role) => userRoles.includes(role))
  const onboardingCookie = req.cookies.get('onboarding_completed')

  // Add pathname to headers so layouts/components can access it
  const requestHeaders = new Headers(req.headers)
  requestHeaders.set('x-pathname', pathname)

  // Multi-role landing: must not be intercepted by onboarding redirects
  if (pathname === '/choose-role' || pathname.startsWith('/choose-role/')) {
    if (!isLoggedIn) {
      const login = new URL('/login', req.nextUrl)
      login.searchParams.set('callbackUrl', '/choose-role')
      return NextResponse.redirect(login)
    }
    return NextResponse.next({
      request: { headers: requestHeaders },
    })
  }

  // Canonicalize legacy /staff URLs for role-specific namespaces
  if (isLoggedIn && pathname.startsWith('/staff') && (activeRole === 'FACILITATOR' || activeRole === 'BOARD' || activeRole === 'PARTNER')) {
    const roleBase = getStaffBasePathForRole(activeRole)
    const suffix = pathname.slice('/staff'.length)
    return NextResponse.redirect(new URL(`${roleBase}${suffix}`, req.nextUrl))
  }

  // Facilitator namespace uses mirrored route files under /facilitator
  if (pathname.startsWith('/facilitator')) {
    if (!isLoggedIn) return NextResponse.redirect(new URL('/login', req.nextUrl))

    if (!hasRole('FACILITATOR') && !hasRole('ADMIN')) {
      return NextResponse.redirect(new URL(getRoleHomePath(activeRole), req.nextUrl))
    }

    if (authUser && needsOnboarding(authUser) && onboardingCookie?.value !== '1') {
      const onboardingPath = getOnboardingPath(activeRole ?? '')
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
      return NextResponse.redirect(new URL(getRoleHomePath(activeRole), req.nextUrl))
    }

    if (authUser && needsOnboarding(authUser) && onboardingCookie?.value !== '1') {
      const onboardingPath = getOnboardingPath(activeRole ?? '')
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
  if (pathname.startsWith('/volunteer/onboarding')) {
    if (!isLoggedIn) return NextResponse.redirect(new URL('/login', req.nextUrl))
    if (!hasRole('VOLUNTEER')) return NextResponse.redirect(new URL(getRoleHomePath(activeRole), req.nextUrl))
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
    const onboardingPath = getOnboardingPath(activeRole ?? '')
    if (pathname !== onboardingPath && !pathname.startsWith('/login') && !pathname.startsWith('/invite')) {
      if (
        pathname.startsWith('/staff') ||
        pathname.startsWith('/dashboard') ||
        pathname.startsWith('/facilitator') ||
        pathname.startsWith('/volunteer')
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
    if (!isLoggedIn) return NextResponse.redirect(new URL('/login', req.nextUrl))
    if (!hasRole('ADMIN')) {
      if (hasRole('PAYROLL')) return NextResponse.redirect(new URL('/payroll', req.nextUrl))
      if (hasRole('HOME_ADMIN')) return NextResponse.redirect(new URL('/dashboard', req.nextUrl))
      if (hasAnyRole(['FACILITATOR', 'BOARD', 'PARTNER', 'VOLUNTEER'])) {
        return NextResponse.redirect(new URL(getRoleHomePath(activeRole), req.nextUrl))
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
        return NextResponse.redirect(new URL(getRoleHomePath(activeRole), req.nextUrl))
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
        return NextResponse.redirect(new URL(getRoleHomePath(activeRole), req.nextUrl))
      }
      return NextResponse.redirect(new URL('/', req.nextUrl))
    }
  }

  // Protect events routes - all authenticated users can view
  if (pathname.startsWith('/bookings')) {
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
      return NextResponse.redirect(new URL('/volunteer', req.nextUrl))
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

  // Protect partner routes (PARTNER only; allow ADMIN as well)
  if (pathname.startsWith('/partner')) {
    if (!isLoggedIn) return NextResponse.redirect(new URL('/login', req.nextUrl))
    if (!hasRole('PARTNER') && !hasRole('ADMIN')) {
      if (hasRole('PAYROLL')) return NextResponse.redirect(new URL('/payroll', req.nextUrl))
      if (hasRole('HOME_ADMIN')) return NextResponse.redirect(new URL('/dashboard', req.nextUrl))
      if (hasAnyRole(['FACILITATOR', 'BOARD', 'VOLUNTEER'])) {
        return NextResponse.redirect(new URL(getRoleHomePath(activeRole), req.nextUrl))
      }
      return NextResponse.redirect(new URL('/', req.nextUrl))
    }
  }

  // Protect volunteer routes (VOLUNTEER only - must be approved)
  if (pathname.startsWith('/volunteer')) {
    if (!isLoggedIn) return NextResponse.redirect(new URL('/login', req.nextUrl))
    if (!hasRole('VOLUNTEER')) {
      if (hasRole('ADMIN')) return NextResponse.redirect(new URL('/admin', req.nextUrl))
      if (hasRole('PAYROLL')) return NextResponse.redirect(new URL('/payroll', req.nextUrl))
      if (hasRole('HOME_ADMIN')) return NextResponse.redirect(new URL('/dashboard', req.nextUrl))
      if (hasAnyRole(['FACILITATOR', 'BOARD', 'PARTNER'])) {
        return NextResponse.redirect(new URL(getRoleHomePath(activeRole), req.nextUrl))
      }
      return NextResponse.redirect(new URL('/', req.nextUrl))
    }
    // Check volunteer approval status - must be APPROVED to access volunteer portal
    const volunteerStatus = authUser?.volunteerReviewStatus
    if (volunteerStatus !== 'APPROVED' && !pathname.startsWith('/volunteer/onboarding')) {
      return NextResponse.redirect(new URL('/volunteer/onboarding', req.nextUrl))
    }

    if (pathname.startsWith('/volunteer/inbox')) {
      const suffix = pathname.slice('/volunteer'.length)
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
    if (activeRole === 'ADMIN') return NextResponse.redirect(new URL('/admin', req.nextUrl))
    if (activeRole === 'PAYROLL') return NextResponse.redirect(new URL('/payroll', req.nextUrl))
    if (activeRole === 'HOME_ADMIN') return NextResponse.redirect(new URL('/dashboard', req.nextUrl))
    if (activeRole === 'VOLUNTEER') return NextResponse.redirect(new URL('/volunteer', req.nextUrl))
    if (activeRole === 'FACILITATOR' || activeRole === 'BOARD' || activeRole === 'PARTNER') {
      return NextResponse.redirect(new URL(getRoleHomePath(activeRole), req.nextUrl))
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
    '/choose-role',
    '/choose-role/:path*',
    '/admin/:path*',
    '/dashboard/:path*',
    '/payroll/:path*',
    '/staff/:path*',
    '/facilitator/:path*',
    '/board/:path*',
    '/partner/:path*',
    '/volunteer/:path*',
    '/bookings/:path*',
    '/events/:path*',
    '/admin/events/:path*',
    '/dashboard/events/:path*',
    '/staff/events/:path*',
    '/facilitator/events/:path*',
    '/board/events/:path*',
    '/partner/events/:path*',
    '/admin/event-requests/:path*',
    '/dashboard/my-events/:path*',
    '/staff/my-events/:path*',
    '/facilitator/my-events/:path*',
    '/partner/my-events/:path*',
    '/volunteer/my-events/:path*',
    '/notifications/:path*',
  ],
}
