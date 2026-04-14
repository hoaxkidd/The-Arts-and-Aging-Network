import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { google } from 'googleapis'
import { createGoogleFormsOAuthClient, getGoogleApiErrorUserMessage, inspectGoogleApiError, withGoogleApiRetry } from '@/lib/google-forms'
import { logger } from '@/lib/logger'
import { prisma } from '@/lib/prisma'
import { encryptSecret } from '@/lib/secret-crypto'

function importRedirect(error?: string) {
  const base = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const url = new URL('/admin/import', base)
  if (error) url.searchParams.set('googleFormsError', error)
  return url
}

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return NextResponse.redirect(importRedirect('Unauthorized'))
  }

  const stateCookie = request.cookies.get('google_forms_oauth_state')?.value
  const stateParam = request.nextUrl.searchParams.get('state')
  const code = request.nextUrl.searchParams.get('code')
  const oauthError = request.nextUrl.searchParams.get('error')

  const response = NextResponse.redirect(importRedirect(oauthError ? `Google OAuth error: ${oauthError}` : undefined))
  response.cookies.set('google_forms_oauth_state', '', { maxAge: 0, path: '/' })

  if (oauthError) return response

  if (!code || !stateCookie || !stateParam || stateCookie !== stateParam) {
    response.headers.set('Location', importRedirect('Invalid OAuth state').toString())
    return response
  }

  try {
    const oauth2 = createGoogleFormsOAuthClient()
    const tokenResponse = await withGoogleApiRetry(() => oauth2.getToken(code), { retries: 1, baseDelayMs: 300 })
    const tokens = tokenResponse.tokens

    if (!tokens.access_token) {
      response.headers.set('Location', importRedirect('Missing Google access token').toString())
      return response
    }

    oauth2.setCredentials(tokens)

    let email: string | null = null
    try {
      const oauth2Api = google.oauth2({ version: 'v2', auth: oauth2 })
      const me = await oauth2Api.userinfo.get()
      email = me.data.email || null
    } catch {
      email = null
    }

    const existing = await prisma.googleFormsConnection.findUnique({
      where: { userId: session.user.id },
      select: { encryptedRefreshToken: true },
    })

    await prisma.googleFormsConnection.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        googleAccountEmail: email,
        encryptedAccessToken: encryptSecret(tokens.access_token),
        encryptedRefreshToken: tokens.refresh_token ? encryptSecret(tokens.refresh_token) : null,
        tokenExpiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        scopes: tokens.scope || null,
      },
      update: {
        googleAccountEmail: email || undefined,
        encryptedAccessToken: encryptSecret(tokens.access_token),
        encryptedRefreshToken: tokens.refresh_token
          ? encryptSecret(tokens.refresh_token)
          : existing?.encryptedRefreshToken || null,
        tokenExpiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        scopes: tokens.scope || undefined,
      },
    })

    await prisma.auditLog.create({
      data: {
        action: 'GOOGLE_FORMS_CONNECTED',
        details: JSON.stringify({ userId: session.user.id, email }),
        userId: session.user.id,
      },
    })

    response.headers.set('Location', importRedirect().toString())
    return response
  } catch (error) {
    const details = inspectGoogleApiError(error)
    logger.api('Failed Google Forms OAuth callback', {
      error: details.message,
      code: details.code,
      status: details.status,
      reasons: details.reasons,
    })

    let userError = getGoogleApiErrorUserMessage(error, 'Failed to connect Google Forms')
    if (details.message.includes('GoogleFormsConnection')) {
      userError = 'Database schema missing GoogleFormsConnection table'
    }

    response.headers.set('Location', importRedirect(userError).toString())
    return response
  }
}
