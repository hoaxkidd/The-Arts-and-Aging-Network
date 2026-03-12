'use server'

import { signIn, signOut } from '@/auth'
import { AuthError } from 'next-auth'
import { rateLimit } from '@/lib/rate-limit'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'

export type AuthState = { error?: string; redirect?: string } | undefined

/** Base URL for redirects: prefer configured env URL; avoid host-header trust in production. */
function getBaseUrl(headersList: Headers): string {
  const envUrl = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL
  if (envUrl) return envUrl.replace(/\/$/, '')
  if (process.env.NODE_ENV === 'production') return 'http://localhost:3000'
  const host = headersList.get('x-forwarded-host') ?? headersList.get('host')
  const proto = headersList.get('x-forwarded-proto') ?? 'https'
  if (host) return `${proto === 'https' ? 'https' : 'http'}://${host}`
  return 'http://localhost:3000'
}

function getRoleDestination(role: string | null | undefined): string {
  switch (role) {
    case 'ADMIN':
      return '/admin'
    case 'PAYROLL':
      return '/payroll'
    case 'HOME_ADMIN':
      return '/dashboard'
    case 'VOLUNTEER':
      return '/volunteers'
    case 'FACILITATOR':
    case 'BOARD':
    case 'PARTNER':
      return '/staff'
    default:
      return '/'
  }
}

function sanitizeCallbackUrl(callbackUrl: string, baseUrl: string): string | null {
  const trimmed = callbackUrl.trim()
  if (!trimmed) return null
  if (trimmed.startsWith('/')) {
    if (trimmed.startsWith('//')) return null
    return trimmed
  }

  try {
    const parsed = new URL(trimmed)
    if (parsed.origin !== baseUrl) return null
    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    return null
  }
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
      
      const safeCallback = sanitizeCallbackUrl(callbackUrl, baseUrl)
      let destination = safeCallback || '/'

      if (!safeCallback && email) {
        const user = await prisma.user.findUnique({
          where: { email },
          select: { role: true }
        })
        destination = getRoleDestination(user?.role)
      }
      
      const redirectUrl = isAuthCallback 
        ? `${baseUrl}${destination}`
        : `${baseUrl}${destination.startsWith('/') ? '' : '/'}${destination}`
      
      return { redirect: redirectUrl }
    }

    if (result?.ok && result.url) {
      const safeCallback = sanitizeCallbackUrl(callbackUrl, baseUrl)
      let destination = safeCallback || '/'

      if (!safeCallback && email) {
        const user = await prisma.user.findUnique({ 
          where: { email }, 
          select: { role: true } 
        })

        destination = getRoleDestination(user?.role)
      }
       
      const redirectUrl = `${baseUrl}${destination.startsWith('/') ? '' : '/'}${destination}`
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
