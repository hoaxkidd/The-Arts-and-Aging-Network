'use server'

import { signIn, signOut } from '@/auth'
import { AuthError } from 'next-auth'
import { rateLimit } from '@/lib/rate-limit'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'
import { hash } from 'bcryptjs'
import { sendEmailWithRetry } from '@/lib/email/service'
import { logger } from '@/lib/logger'
import { getRoleHomePath } from '@/lib/role-routes'
import { normalizeRoleList } from '@/lib/roles'

export type AuthState = { error?: string; redirect?: string } | undefined

/** Base URL for redirects: prefer configured env URL; avoid host-header trust in production. */
function getBaseUrl(headersList: Headers): string {
  const envUrl = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL
  if (envUrl) return envUrl.replace(/\/$/, '')
  if (process.env.NODE_ENV === 'production') return 'https://the-arts-and-aging-network.vercel.app'
  const host = headersList.get('x-forwarded-host') ?? headersList.get('host')
  const proto = headersList.get('x-forwarded-proto') ?? 'https'
  if (host) return `${proto === 'https' ? 'https' : 'http'}://${host}`
  return 'http://localhost:3000'
}

function getRoleDestination(role: string | null | undefined): string {
  return getRoleHomePath(role)
}

/** Post-login path when no callbackUrl: multi-role users land on role picker. */
async function getPostLoginDestinationByEmail(email: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      roleAssignments: {
        where: { isActive: true },
        orderBy: [
          { isPrimary: 'desc' },
          { assignedAt: 'asc' },
        ],
      },
    },
  })
  if (!user) return '/'
  const assignedRoles = user.roleAssignments.map((a) => a.role)
  const roles = normalizeRoleList(assignedRoles.length > 0 ? assignedRoles : [user.role])
  const primary = user.roleAssignments.find((a) => a.isPrimary)?.role || user.role
  if (roles.length > 1) return '/choose-role'
  return getRoleDestination(primary)
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
        destination = await getPostLoginDestinationByEmail(email)
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
        destination = await getPostLoginDestinationByEmail(email)
      }
       
      const redirectUrl = `${baseUrl}${destination.startsWith('/') ? '' : '/'}${destination}`
      return { redirect: redirectUrl }
    }
    
    if (!result) {
      return { error: 'Sign-in failed. Check the server terminal for errors.' }
    }
    if (!result.ok) {
      logger.serverAction('[Auth] signIn result:', { ok: result.ok, error: result.error, status: result.status, url: result.url })
    }
    const isInvalidCredentials = result.error === 'CredentialsSignin' || result.status === 401
    return { error: isInvalidCredentials ? 'Invalid credentials.' : (result.error === 'Callback' ? 'Sign-in failed. Try again.' : 'Something went wrong.') }
  } catch (error) {
    logger.serverAction('[Auth] Exception:', error)
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

const APP_URL = process.env.NEXTAUTH_URL || 'https://artsandaging.com'

export async function forgotPassword(formData: FormData): Promise<{ success?: boolean; error?: string }> {
  const email = formData.get('email') as string | null
  
  if (!email || !email.includes('@')) {
    return { error: 'Please enter a valid email address.' }
  }

  const user = await prisma.user.findUnique({ where: { email } })
  
  if (!user || user.status !== 'ACTIVE') {
    return { success: true }
  }

  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

  try {
    await prisma.passwordResetToken.create({
      data: {
        email,
        token,
        expiresAt,
        userId: user.id,
      },
    })

    const base = APP_URL.replace(/\/$/, '')
    const resetUrl = `${base}/auth/reset-password?token=${token}`

    await sendEmailWithRetry({
      to: email,
      templateType: 'PASSWORD_RESET',
      variables: {
        name: user.name || 'User',
        inviteUrl: resetUrl,
      },
    }, { userId: user.id })

    return { success: true }
  } catch (error) {
    logger.serverAction('forgotPassword error', error)
    return { error: 'Failed to process request. Please try again.' }
  }
}

export type ResetPasswordState = { error?: string; success?: boolean } | undefined

export async function resetPassword(
  _prevState: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const token = formData.get('token') as string | null
  const password = formData.get('password') as string | null
  const confirmPassword = formData.get('confirmPassword') as string | null

  if (!token) {
    return { error: 'Invalid reset link.' }
  }

  if (!password || password.length < 6) {
    return { error: 'Password must be at least 6 characters.' }
  }

  if (password !== confirmPassword) {
    return { error: 'Passwords do not match.' }
  }

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token },
    include: { user: true },
  })

  if (!resetToken || resetToken.usedAt) {
    return { error: 'This reset link has expired or been used.' }
  }

  if (resetToken.expiresAt < new Date()) {
    return { error: 'This reset link has expired.' }
  }

  if (!resetToken.userId) {
    return { error: 'Invalid reset token.' }
  }

  try {
    const hashedPassword = await hash(password, 12)

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { password: hashedPassword },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
    ])

    return { success: true }
  } catch (error) {
    logger.serverAction('resetPassword error', error)
    return { error: 'Failed to reset password. Please try again.' }
  }
}

export async function validateResetToken(token: string): Promise<{ valid: boolean; email?: string }> {
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token },
  })

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    return { valid: false }
  }

  return { valid: true, email: resetToken.email }
}
