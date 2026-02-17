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
    const callbackUrl = (formData.get('callbackUrl') as string) || '/admin'
    const result = await signIn('credentials', {
      email: email ?? '',
      password: password ?? '',
      callbackUrl,
      redirect: false,
    })
    if (result?.ok && result.url) {
      return { redirect: result.url }
    }
    // Log so you can see the real reason in the server terminal
    if (!result) {
      console.error('[Auth] signIn returned no result (check NextAuth config / redirect: false support)')
      return { error: 'Sign-in failed. Check the server terminal for errors.' }
    }
    if (!result.ok) {
      console.error('[Auth] signIn result:', JSON.stringify({ ok: result.ok, error: result.error, status: result.status, url: result.url }))
    }
    const isInvalidCredentials = result.error === 'CredentialsSignin' || result.status === 401
    if (result.error) {
      return { error: isInvalidCredentials ? 'Invalid credentials.' : (result.error === 'Callback' ? 'Sign-in failed. Try again.' : 'Something went wrong.') }
    }
    return { error: isInvalidCredentials ? 'Invalid credentials.' : 'Something went wrong.' }
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
