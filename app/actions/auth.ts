'use server'

import { signIn, signOut } from '@/auth'
import { AuthError } from 'next-auth'
import { rateLimit } from '@/lib/rate-limit'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'

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

  const email = formData.get('email') as string | null
  const password = formData.get('password') as string | null
  const callbackUrl = (formData.get('callbackUrl') as string) || ''

  try {
    const result = await signIn('credentials', {
      email: email ?? '',
      password: password ?? '',
      redirect: false,
    })

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
      
      const path = result.startsWith('http') ? new URL(result).pathname : result
      const isAuthCallback = path.includes('/api/auth/callback/') || path.includes('/api/auth/signin')
      
      // If callbackUrl was provided, prioritize it
      let destination = callbackUrl || '/'
      
      // If no callbackUrl, determine destination based on user role
      if (!callbackUrl && email) {
        const user = await prisma.user.findUnique({ 
          where: { email }, 
          select: { role: true } 
        })
        
        switch (user?.role) {
          case 'ADMIN':
            destination = '/admin'
            break
          case 'PAYROLL':
            destination = '/payroll'
            break
          case 'HOME_ADMIN':
            destination = '/dashboard'
            break
          case 'VOLUNTEER':
            destination = '/volunteers'
            break
          case 'FACILITATOR':
          case 'BOARD':
          case 'PARTNER':
            destination = '/staff'
            break
        }
      }
      
      const redirectUrl = isAuthCallback 
        ? `${baseUrl}${destination}`
        : destination.startsWith('http') 
          ? destination 
          : `${baseUrl}${destination.startsWith('/') ? '' : '/'}${destination}`
      
      return { redirect: redirectUrl }
    }

    if (result?.ok && result.url) {
      let destination = callbackUrl || '/'
      
      if (!callbackUrl && email) {
        const user = await prisma.user.findUnique({ 
          where: { email }, 
          select: { role: true } 
        })
        
        switch (user?.role) {
          case 'ADMIN':
            destination = '/admin'
            break
          case 'PAYROLL':
            destination = '/payroll'
            break
          case 'HOME_ADMIN':
            destination = '/dashboard'
            break
          case 'VOLUNTEER':
            destination = '/volunteers'
            break
          case 'FACILITATOR':
          case 'BOARD':
          case 'PARTNER':
            destination = '/staff'
            break
        }
      }
      
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
