'use server'

import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'
import { randomBytes } from 'crypto'
import { hash } from 'bcryptjs'
import { createUserWithGeneratedCode } from '@/lib/user-code'
import { sendEmail, sendEmailWithRetry } from '@/lib/email/service'
import { logger } from '@/lib/logger'

const APP_URL = process.env.NEXTAUTH_URL || 'https://artsandaging.com'

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['ADMIN', 'PAYROLL', 'FACILITATOR', 'PARTNER', 'VOLUNTEER', 'BOARD', 'HOME_ADMIN']),
})

export async function createInvitation(formData: FormData) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    return { error: 'Unauthorized' }
  }

  const validatedFields = inviteSchema.safeParse({
    email: formData.get('email'),
    role: formData.get('role'),
  })

  if (!validatedFields.success) {
    return { error: 'Invalid fields' }
  }

  const { email, role } = validatedFields.data

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({ where: { email } })

  // If there's an ACTIVE user (or any user with a password set), do not allow a new invitation.
  // This prevents accidentally overwriting real accounts.
  if (existingUser && (existingUser.password || existingUser.status === 'ACTIVE')) {
    return { error: 'User already exists' }
  }

  // Check if pending invitation exists
  // We can just create a new one or error out. Let's create new.
  
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

  try {
    const invitation = await prisma.invitation.create({
      data: {
        email,
        role,
        token,
        expiresAt,
        createdById: session.user.id,
        // If an existing placeholder user exists (no password and non-ACTIVE),
        // link this invitation to that user so we can activate it on acceptance.
        userId: existingUser && !existingUser.password && existingUser.status !== 'ACTIVE'
          ? existingUser.id
          : undefined,
      },
    })

    // Log audit
    await prisma.auditLog.create({
      data: {
        action: 'INVITATION_CREATED',
        details: JSON.stringify({ email, role }),
        userId: session.user.id,
      }
    })

    // Send invitation email directly (bypass user preferences for invitations)
    const base = 'https://the-arts-and-aging-network.vercel.app'
    const inviteUrl = `${base}/invite/${token}`

    console.log('[Invitation] Attempting to send invitation email:', {
      to: email,
      inviteUrl,
      role,
      name: existingUser?.name || email
    })

    const emailResult = await sendEmail({
      to: email,
      templateType: 'INVITATION',
      variables: {
        inviteUrl,
        role,
        name: existingUser?.name || email,
      }
    })

    console.log('[Invitation] Email result:', emailResult)

    if (!emailResult.success) {
      logger.serverAction('Failed to send invitation email', emailResult.error)
      // Still return success for invitation creation, but note email failure
      revalidatePath('/admin/invitations')
      return { success: true, token, emailSent: false, emailError: emailResult.error }
    }

    revalidatePath('/admin/invitations')
    return { success: true, token, emailSent: true }
  } catch (error) {
    logger.serverAction('Failed to create invitation', error)
    return { error: 'Failed to create invitation' }
  }
}

export async function sendHomeInvitation(homeId: string) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    return { error: 'Unauthorized' }
  }

  const home = await prisma.geriatricHome.findUnique({
    where: { id: homeId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          password: true,
          status: true
        }
      }
    }
  })

  if (!home) return { error: 'Home not found' }

  const recipientEmail = home.user.email || home.contactEmail || ''
  if (!recipientEmail || !recipientEmail.includes('@')) {
    return { error: 'No valid linked email found for this home' }
  }

  if (home.user.password || home.user.status === 'ACTIVE') {
    return { error: 'Linked user is already active' }
  }

  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  try {
    await prisma.invitation.create({
      data: {
        email: recipientEmail,
        role: 'HOME_ADMIN',
        token,
        expiresAt,
        createdById: session.user.id,
        userId: home.userId,
      }
    })

    const base = APP_URL.replace(/\/$/, '')
    const inviteUrl = `${base}/invite/${token}`

    const sendResult = await sendEmail({
      to: recipientEmail,
      templateType: 'INVITATION',
      variables: {
        inviteUrl,
        role: 'HOME_ADMIN'
      }
    })

    if (!sendResult.success) {
      return { error: sendResult.error || 'Failed to send invitation email' }
    }

    await prisma.auditLog.create({
      data: {
        action: 'INVITATION_SENT',
        details: JSON.stringify({ homeId, email: recipientEmail, provider: 'unified-email-service' }),
        userId: session.user.id,
      }
    })

    revalidatePath('/admin/homes')
    revalidatePath('/admin/invitations')

    return { success: true }
  } catch (error) {
    logger.serverAction('sendHomeInvitation error', error)
    return { error: 'Failed to send invitation' }
  }
}

export async function cancelInvitation(id: string) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    return { error: 'Unauthorized' }
  }

  try {
    const invitation = await prisma.invitation.delete({
      where: { id },
    })

    await prisma.auditLog.create({
      data: {
        action: 'INVITATION_CANCELLED',
        details: JSON.stringify({ email: invitation.email, role: invitation.role }),
        userId: session.user.id,
      }
    })

    revalidatePath('/admin/invitations')
    return { success: true }
  } catch (error) {
    return { error: 'Failed to cancel invitation' }
  }
}

export async function acceptInvitation(token: string, formData: FormData) {
  const password = formData.get('password') as string
  const name = formData.get('name') as string

  if (!password || password.length < 6) return { error: 'Password too short' }
  if (!name) return { error: 'Name required' }

  const invitation = await prisma.invitation.findUnique({
    where: { token },
  })

  if (!invitation || invitation.status !== 'PENDING' || invitation.expiresAt < new Date()) {
    return { error: 'Invalid or expired invitation' }
  }

  const hashedPassword = await hash(password, 12)

  try {
    const invitationUserId = invitation.userId
    let userId: string | null = null

    if (invitationUserId) {
      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: invitationUserId },
          data: {
            email: invitation.email,
            name,
            password: hashedPassword,
            role: invitation.role,
            status: 'ACTIVE',
          },
        })
        await tx.invitation.update({
          where: { id: invitation.id },
          data: { status: 'ACCEPTED' },
        })
      })
      userId = invitationUserId
    } else {
      const newUser = await prisma.$transaction(async (tx) => {
        const user = await createUserWithGeneratedCode(tx, {
          email: invitation.email,
          name,
          password: hashedPassword,
          role: invitation.role,
          status: 'ACTIVE',
        })
        await tx.invitation.update({
          where: { id: invitation.id },
          data: { status: 'ACCEPTED' },
        })
        return user
      })
      userId = newUser.id
    }

    // Send welcome email
    if (userId && invitation.email) {
      await sendEmailWithRetry({
        to: invitation.email,
        templateType: 'WELCOME',
        variables: {
          name,
          message: 'Welcome to Arts and Aging! We\'re excited to have you join our community.'
        }
      }, { userId })
    }

    return { success: true }
  } catch (error) {
    logger.serverAction('acceptInvitation error', error)
    return { error: 'Failed to create or activate user' }
  }
}
