import { auth } from "@/auth"
import { NextRequest, NextResponse } from "next/server"
import { getRoleHomePath } from "@/lib/role-routes"
import { isValidRole } from "@/lib/roles"

function isSafeNextPath(nextPath: string): boolean {
  if (!nextPath) return false
  if (!nextPath.startsWith('/')) return false
  if (nextPath.startsWith('//')) return false
  return true
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.search = ''
    return NextResponse.redirect(url)
  }

  const roleParam = req.nextUrl.searchParams.get('role')?.trim() || ''
  const nextParam = req.nextUrl.searchParams.get('next')?.trim() || ''

  const roles = Array.isArray(session.user.roles)
    ? session.user.roles
    : (session.user.role ? [session.user.role] : [])

  const requestedRole = isValidRole(roleParam) ? roleParam : ''
  const allowed = requestedRole && roles.includes(requestedRole)

  const destination = allowed
    ? (isSafeNextPath(nextParam) ? nextParam : getRoleHomePath(requestedRole))
    : getRoleHomePath(session.user.primaryRole || session.user.role)

  const url = req.nextUrl.clone()
  url.pathname = destination
  url.search = ''

  const res = NextResponse.redirect(url)
  if (allowed) {
    res.cookies.set('active_role', requestedRole, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    })
  }
  return res
}

