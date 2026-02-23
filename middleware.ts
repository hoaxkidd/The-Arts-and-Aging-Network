import { auth } from "@/auth"
import { NextResponse } from "next/server"
import { needsOnboarding, getOnboardingPath } from "@/lib/onboarding"

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const { pathname } = req.nextUrl
  const userRole = req.auth?.user?.role
  const user = req.auth?.user

  // Onboarding: redirect staff/dashboard users who haven't completed profile
  if (isLoggedIn && user && needsOnboarding(user)) {
    const onboardingPath = getOnboardingPath(userRole ?? '')
    if (pathname !== onboardingPath && !pathname.startsWith('/login') && !pathname.startsWith('/invite')) {
      if (pathname.startsWith('/staff') || pathname.startsWith('/dashboard')) {
        return NextResponse.redirect(new URL(onboardingPath, req.nextUrl))
      }
    }
  }

  // Add pathname to headers so layout can access it
  const requestHeaders = new Headers(req.headers)
  requestHeaders.set('x-pathname', pathname)

  // Protect admin routes
  if (pathname.startsWith('/admin')) {
    if (!isLoggedIn) return NextResponse.redirect(new URL('/login', req.nextUrl))
    if (userRole !== 'ADMIN') {
      // Strict Segregation: Redirect users to their portals
      if (userRole === 'PAYROLL') return NextResponse.redirect(new URL('/payroll', req.nextUrl))
      if (userRole === 'HOME_ADMIN') return NextResponse.redirect(new URL('/dashboard', req.nextUrl))
      if (userRole === 'FACILITATOR' || userRole === 'CONTRACTOR') {
        return NextResponse.redirect(new URL('/staff', req.nextUrl))
      }
      return NextResponse.redirect(new URL('/', req.nextUrl))
    }
  }

  // Protect payroll routes
  if (pathname.startsWith('/payroll')) {
    if (!isLoggedIn) return NextResponse.redirect(new URL('/login', req.nextUrl))

    // Strict Segregation: Redirect other roles to their portals
    if (userRole === 'ADMIN') return NextResponse.redirect(new URL('/admin', req.nextUrl))
    if (userRole === 'HOME_ADMIN') return NextResponse.redirect(new URL('/dashboard', req.nextUrl))
    if (userRole === 'FACILITATOR' || userRole === 'CONTRACTOR') {
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
      if (userRole === 'FACILITATOR' || userRole === 'CONTRACTOR') {
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

  // HOME_ADMIN cannot access staff directory (redirect to dashboard)
  if (pathname.startsWith('/staff/directory')) {
    if (!isLoggedIn) return NextResponse.redirect(new URL('/login', req.nextUrl))
    if (userRole === 'HOME_ADMIN') return NextResponse.redirect(new URL('/dashboard', req.nextUrl))
    return NextResponse.next({
      request: {
        headers: requestHeaders
      }
    })
  }

  // Allow all logged-in users to access inbox and groups (MUST come before general /staff check)
  if (pathname.startsWith('/staff/inbox') || pathname.startsWith('/staff/groups')) {
    if (!isLoggedIn) return NextResponse.redirect(new URL('/login', req.nextUrl))
    return NextResponse.next({
      request: {
        headers: requestHeaders
      }
    })
  }

  // Protect staff routes (FACILITATOR/CONTRACTOR/VOLUNTEER/BOARD/PARTNER)
  if (pathname.startsWith('/staff')) {
    if (!isLoggedIn) return NextResponse.redirect(new URL('/login', req.nextUrl))
    const allowedStaffRoles = ['FACILITATOR', 'CONTRACTOR', 'VOLUNTEER', 'BOARD', 'PARTNER']
    if (!allowedStaffRoles.includes(userRole || '')) {
      if (userRole === 'ADMIN') return NextResponse.redirect(new URL('/admin', req.nextUrl))
      if (userRole === 'PAYROLL') return NextResponse.redirect(new URL('/payroll', req.nextUrl))
      if (userRole === 'HOME_ADMIN') return NextResponse.redirect(new URL('/dashboard', req.nextUrl))
      return NextResponse.redirect(new URL('/', req.nextUrl))
    }
  }

  // Redirect logged-in users away from login page
  if (pathname.startsWith('/login') && isLoggedIn) {
    if (userRole === 'ADMIN') return NextResponse.redirect(new URL('/admin', req.nextUrl))
    if (userRole === 'PAYROLL') return NextResponse.redirect(new URL('/payroll', req.nextUrl))
    if (userRole === 'HOME_ADMIN') return NextResponse.redirect(new URL('/dashboard', req.nextUrl))
    if (userRole === 'FACILITATOR' || userRole === 'CONTRACTOR' || userRole === 'VOLUNTEER' || userRole === 'BOARD' || userRole === 'PARTNER') {
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
  // Only run on protected paths; skip / and /login to avoid redirect loop
  matcher: [
    '/admin/:path*',
    '/dashboard/:path*',
    '/payroll/:path*',
    '/staff/:path*',
    '/events/:path*',
    '/notifications/:path*',
  ],
}
