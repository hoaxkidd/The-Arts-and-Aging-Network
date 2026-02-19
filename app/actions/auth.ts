'use server'

import { signIn, signOut } from '@/auth'
import { AuthError } from 'next-auth'
import { rateLimit } from '@/lib/rate-limit'
import { headers } from 'next/headers'

export type AuthState = { error?: string; redirect?: string } | undefined

/** Base URL for redirects: prefer request host (Vercel) then NEXTAUTH_URL, then localhost. */
function getBaseUrl(headersList: Headers): string {
  const envUrl = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL
  if (envUrl) return envUrl.replace(/\/$/, '')
  const host = headersList.get('x-forwarded-host') ?? headersList.get('host')
  const proto = headersList.get('x-forwarded-proto') ?? 'https'
  if (host) return `${proto === 'https' ? 'https' : 'http'}://${host}`
  return 'http://localhost:3000'
}

export async function authenticate(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for') || 'unknown'
  if (!rateLimit(ip, 5, 60000)) {
    return { error: 'Too many login attempts. Please try again later.' }
  }

  const baseUrl = getBaseUrl(headersList)

  try {
    const email = formData.get('email') as string | null
    const password = formData.get('password') as string | null
    const redirectTo = (formData.get('callbackUrl') as string) || '/admin'
    const result = await signIn('credentials', {
      email: email ?? '',
      password: password ?? '',
      redirectTo, // NextAuth uses redirectTo (not callbackUrl) for the post-login redirect
      redirect: false,
    })

    // Server-side signIn with redirect: false returns the redirect URL as a string (not { ok, url })
    if (typeof result === 'string') {
      const isErrorUrl = result.includes('error=') || result.includes('/signin')
      if (isErrorUrl) {
        try {
          const err = new URL(result).searchParams.get('error')
          return { error: err === 'CredentialsSignin' ? 'Invalid credentials.' : 'Something went wrong.' }
        } catch {
          return { error: 'Invalid credentials.' }
        }
      }
      // Never send the client to the auth callback URL (credentials only accept POST; GET triggers InvalidProvider)
      const path = result.startsWith('http') ? new URL(result).pathname : result
      const isAuthCallback = path.includes('/api/auth/callback/') || path.includes('/api/auth/signin')
      const destination = isAuthCallback ? redirectTo : (path.startsWith('/') ? path : `/${path}`)
      // Use request-based base so Vercel never redirects to localhost
      const redirectUrl = destination.startsWith('http') ? destination : `${baseUrl}${destination.startsWith('/') ? '' : '/'}${destination}`
      return { redirect: redirectUrl }
    }

    // Client-style response shape (some setups return { ok, url, error })
    if (result?.ok && result.url) {
      const url = result.url
      const path = url.startsWith('http') ? new URL(url).pathname : url
      const isAuthCallback = path.includes('/api/auth/callback/') || path.includes('/api/auth/signin')
      const destination = isAuthCallback ? redirectTo : url
      const redirectUrl = destination.startsWith('http') ? destination : `${baseUrl}${destination.startsWith('/') ? '' : '/'}${destination}`
      return { redirect: redirectUrl }
    }
    if (!result) {
      return { error: 'Sign-in failed. Check the server terminal for errors.' }
    }
    if (!result.ok) {
      console.error('[Auth] signIn result:', { ok: result.ok, error: result.error, status: result.status, url: result.url })
    }
    const isInvalidCredentials = result.error === 'CredentialsSignin' || result.status === 401
    return { error: isInvalidCredentials ? 'Invalid credentials.' : (result.error === 'Callback' ? 'Sign-in failed. Try again.' : 'Something went wrong.') }
  } catch (error) {
    console.error('[Auth] Exception:', error)
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return { error: 'Invalid credentials.' }
        default:
          return { error: 'Something went wrong.' }
      }
    }
    throw error
  }
}

export async function logout() {
  await signOut({ redirectTo: '/login' })
}
