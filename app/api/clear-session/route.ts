import { NextResponse } from 'next/server'

/**
 * Clears the auth session cookie and redirects to login.
 * Use this when you see "no matching decryption secret" (e.g. after changing AUTH_SECRET or env).
 */
export function GET() {
  const res = NextResponse.redirect(new URL('/login', process.env.NEXTAUTH_URL || 'http://localhost:3000'))
  const cookieNames = ['authjs.session-token', '__Secure-authjs.session-token', 'next-auth.session-token', '__Secure-next-auth.session-token']
  for (const name of cookieNames) {
    res.cookies.set(name, '', { maxAge: 0, path: '/' })
  }
  return res
}
