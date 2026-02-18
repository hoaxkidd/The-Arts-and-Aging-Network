'use server'

import { signIn, signOut } from '@/auth'
import { AuthError } from 'next-auth'
import { rateLimit } from '@/lib/rate-limit'
import { headers } from 'next/headers'

export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for') || 'unknown'
  if (!rateLimit(ip, 5, 60000)) {
    return { error: 'Too many login attempts. Please try again later.' }
  }

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
      // Use absolute URL so the browser does a full navigation and sends the session cookie
      const base = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
      const path = result.startsWith('http') ? new URL(result).pathname : result
      const redirectUrl = path.startsWith('/') ? `${base}${path}` : `${base}/${path}`
      return { redirect: redirectUrl }
    }

    // Client-style response shape (some setups return { ok, url, error })
    if (result?.ok && result.url) {
      return { redirect: result.url }
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
