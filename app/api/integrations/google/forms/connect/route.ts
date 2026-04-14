import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { randomUUID } from 'crypto'
import { GOOGLE_FORMS_SCOPES, createGoogleFormsOAuthClient } from '@/lib/google-forms'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/dashboard', process.env.NEXTAUTH_URL || 'http://localhost:3000'))
  }

  const oauth2 = createGoogleFormsOAuthClient()
  const state = randomUUID()

  const authUrl = oauth2.generateAuthUrl({
    access_type: 'offline',
    include_granted_scopes: true,
    prompt: 'consent',
    scope: GOOGLE_FORMS_SCOPES,
    state,
  })

  const response = NextResponse.redirect(authUrl)
  response.cookies.set('google_forms_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10,
    path: '/',
  })

  return response
}
