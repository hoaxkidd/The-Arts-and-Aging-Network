import { auth } from "@/auth"
import { NextResponse } from "next/server"
import { needsOnboarding, getOnboardingPath } from "@/lib/onboarding"

const authMiddleware = auth

export default authMiddleware((req: { nextUrl: URL; auth: unknown; headers: Headers }) => {
  const isLoggedIn = !!req.auth
  const { pathname } = req.nextUrl
  const user = req.auth as { user?: { role?: string; onboardingCompletedAt?: string; onboardingSkipCount?: number; volunteerReviewStatus?: string } } | undefined
  const userRole = user?.user?.role
  const authUser = user?.user

  // Onboarding: redirect staff/dashboard users who haven't completed profile
  if (isLoggedIn && authUser && needsOnboarding(authUser)) {
    const onboardingPath = getOnboardingPath(userRole ?? '')
    if (pathname !== onboardingPath && !pathname.startsWith('/login') && !pathname.startsWith('/invite')) {
      if (pathname.startsWith('/staff') || pathname.startsWith('/dashboard')) {
        console.log('[Middleware] Redirecting to onboarding, pathname:', pathname, 'role:', userRole)
        return NextResponse.redirect(new URL(onboardingPath, req.nextUrl))
      }
    }
  }

  // Special handling for VOLUNTEER role - after 3 skips, allow access to /staff routes
  if (isLoggedIn && userRole === 'VOLUNTEER') {
    const skipCount = authUser?.onboardingSkipCount ?? 0
    // After 3 skips, allow volunteers to access /staff (except onboarding)
    if (skipCount >= 3 && pathname.startsWith('/staff') && !pathname.startsWith('/staff/onboarding')) {
      console.log('[Middleware] Volunteer with 3+ skips, allowing access to:', pathname)
      // Allow access to /staff routes
    }
  }

  // Add pathname to headers so layout can access it
  const requestHeaders = new Headers(req.headers)
  requestHeaders.set('x-pathname', pathname)

  // Protect admin routes
  if (pathname.startsWith('/admin')) {
    if (!isLoggedIn) return NextResponse.redirect(new URL('/login', req.nextUrl))
    if (userRole !== 'ADMIN') {
      if (userRole === 'PAYROLL') return NextResponse.redirect(new URL('/payroll', req.nextUrl))
      if (userRole === 'HOME_ADMIN') return NextResponse.redirect(new URL('/dashboard', req.nextUrl))
      if (userRole === 'FACILITATOR') {
        return NextResponse.redirect(new URL('/staff', req.nextUrl))
      }
      return NextResponse.redirect(new URL('/', req.nextUrl))
    }
  }

  // Protect payroll routes
  if (pathname.startsWith('/payroll')) {
    if (!isLoggedIn) return NextResponse.redirect(new URL('/login', req.nextUrl))

    if (userRole === 'ADMIN') return NextResponse.redirect(new URL('/admin', req.nextUrl))
    if (userRole === 'HOME_ADMIN') return NextResponse.redirect(new URL('/dashboard', req.nextUrl))
    if (userRole === 'FACILITATOR') {
      return NextResponse.redirect(new URL('/staff', req.nextUrl))
    }

    if (userRole !== 'PAYROLL') {
       return NextResponse.redirect(new URL('/', req.nextUrl))
    }
  }

  // Protect dashboard routes (HOME_ADMIN)
  if (pathname.startsWith('/dashboard')) {
    if (!isLoggedIn) return NextResponse.redirect(new URL('/login', req.nextUrl))
    if (userRole !== 'HOME_ADMIN') {
      if (userRole === 'ADMIN') return NextResponse.redirect(new URL('/admin', req.nextUrl))
      if (userRole === 'PAYROLL') return NextResponse.redirect(new URL('/payroll', req.nextUrl))
      if (userRole === 'FACILITATOR') {
        return NextResponse.redirect(new URL('/staff', req.nextUrl))
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
    if (userRole === 'HOME_ADMIN') return NextResponse.redirect(new URL('/dashboard', req.nextUrl))
    if (userRole === 'VOLUNTEER') return NextResponse.redirect(new URL('/volunteers', req.nextUrl))
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
    if (!allowedStaffRoles.includes(userRole || '')) {
      if (userRole === 'ADMIN') return NextResponse.redirect(new URL('/admin', req.nextUrl))
      if (userRole === 'PAYROLL') return NextResponse.redirect(new URL('/payroll', req.nextUrl))
      if (userRole === 'HOME_ADMIN') return NextResponse.redirect(new URL('/dashboard', req.nextUrl))
      return NextResponse.redirect(new URL('/', req.nextUrl))
    }
  }

  // Protect volunteers routes (VOLUNTEER only - must be approved)
  if (pathname.startsWith('/volunteers')) {
    if (!isLoggedIn) return NextResponse.redirect(new URL('/login', req.nextUrl))
    if (userRole !== 'VOLUNTEER') {
      if (userRole === 'ADMIN') return NextResponse.redirect(new URL('/admin', req.nextUrl))
      if (userRole === 'PAYROLL') return NextResponse.redirect(new URL('/payroll', req.nextUrl))
      if (userRole === 'HOME_ADMIN') return NextResponse.redirect(new URL('/dashboard', req.nextUrl))
      if (userRole === 'FACILITATOR' || userRole === 'BOARD' || userRole === 'PARTNER') {
        return NextResponse.redirect(new URL('/staff', req.nextUrl))
      }
      return NextResponse.redirect(new URL('/', req.nextUrl))
    }
    // Check volunteer approval status - must be APPROVED to access volunteer portal
    const volunteerStatus = authUser?.volunteerReviewStatus
    if (volunteerStatus !== 'APPROVED') {
      return NextResponse.redirect(new URL('/staff/onboarding', req.nextUrl))
    }
  }

  // Redirect logged-in users away from login page
  if (pathname.startsWith('/login') && isLoggedIn) {
    if (userRole === 'ADMIN') return NextResponse.redirect(new URL('/admin', req.nextUrl))
    if (userRole === 'PAYROLL') return NextResponse.redirect(new URL('/payroll', req.nextUrl))
    if (userRole === 'HOME_ADMIN') return NextResponse.redirect(new URL('/dashboard', req.nextUrl))
    if (userRole === 'VOLUNTEER') return NextResponse.redirect(new URL('/volunteers', req.nextUrl))
    if (userRole === 'FACILITATOR' || userRole === 'BOARD' || userRole === 'PARTNER') {
      return NextResponse.redirect(new URL('/staff', req.nextUrl))
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
    '/volunteers/:path*',
    '/events/:path*',
    '/notifications/:path*',
  ],
}
