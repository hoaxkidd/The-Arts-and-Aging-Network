'use server'

import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'
import { randomBytes } from 'crypto'
import { hash } from 'bcryptjs'
import { createUserWithGeneratedCode } from '@/lib/user-code'

const MAILCHIMP_TRANSACTIONAL_API_KEY = process.env.MAILCHIMP_TRANSACTIONAL_API_KEY
const MAILCHIMP_FROM_EMAIL = process.env.MAILCHIMP_FROM_EMAIL
const MAILCHIMP_FROM_NAME = process.env.MAILCHIMP_FROM_NAME || 'Arts and Aging'
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'noreply@artsandaging.com'

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
    await prisma.invitation.create({
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

    revalidatePath('/admin/invitations')
    return { success: true, token } // Return token to display (since no email service)
  } catch (error) {
    console.error(error)
    return { error: 'Failed to create invitation' }
  }
}

async function sendInvitationViaMailchimpTransactional(params: {
  toEmail: string
  inviteUrl: string
  role: string
}) {
  if (!MAILCHIMP_TRANSACTIONAL_API_KEY || !MAILCHIMP_FROM_EMAIL) {
    return { success: false, error: 'Mailchimp Transactional not configured' }
  }

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
      <h2 style="margin: 0 0 12px;">You are invited to Arts and Aging</h2>
      <p style="margin: 0 0 12px;">You have been invited as <strong>${params.role}</strong>.</p>
      <p style="margin: 0 0 16px;">Click the button below to set your password and activate your account.</p>
      <p style="margin: 0 0 16px;">
        <a href="${params.inviteUrl}" style="display: inline-block; background: #2563eb; color: #fff; text-decoration: none; padding: 10px 16px; border-radius: 8px; font-weight: 600;">Accept Invitation</a>
      </p>
      <p style="margin: 0 0 8px; font-size: 13px; color: #4b5563;">If the button does not work, use this link:</p>
      <p style="margin: 0 0 16px; font-size: 13px;"><a href="${params.inviteUrl}">${params.inviteUrl}</a></p>
      <p style="margin: 0; font-size: 12px; color: #6b7280;">If you were not expecting this invitation, you can ignore this email.</p>
    </div>
  `

  const response = await fetch('https://mandrillapp.com/api/1.0/messages/send.json', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      key: MAILCHIMP_TRANSACTIONAL_API_KEY,
      message: {
        from_email: MAILCHIMP_FROM_EMAIL,
        from_name: MAILCHIMP_FROM_NAME,
        to: [{ email: params.toEmail, type: 'to' }],
        subject: 'Your invitation to Arts and Aging',
        html,
        headers: {
          'Reply-To': SUPPORT_EMAIL
        }
      }
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    return { success: false, error: `Mailchimp Transactional error: ${errorText}` }
  }

  const body = await response.json() as Array<{ status?: string; _id?: string; reject_reason?: string }>
  const first = Array.isArray(body) ? body[0] : null
  if (!first || (first.status !== 'sent' && first.status !== 'queued')) {
    return { success: false, error: `Mailchimp Transactional rejected message: ${first?.reject_reason || 'unknown'}` }
  }

  return { success: true, messageId: first._id }
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

    const base = (process.env.NEXTAUTH_URL ?? '').replace(/\/$/, '')
    const inviteUrl = base ? `${base}/invite/${token}` : `/invite/${token}`
    const sendResult = await sendInvitationViaMailchimpTransactional({
      toEmail: recipientEmail,
      inviteUrl,
      role: 'HOME_ADMIN'
    })

    if (!sendResult.success) {
      return { error: sendResult.error || 'Failed to send invitation email' }
    }

    await prisma.auditLog.create({
      data: {
        action: 'INVITATION_SENT',
        details: JSON.stringify({ homeId, email: recipientEmail, provider: 'mailchimp-transactional' }),
        userId: session.user.id,
      }
    })

    revalidatePath('/admin/homes')
    revalidatePath('/admin/invitations')

    return { success: true }
  } catch (error) {
    console.error('sendHomeInvitation error:', error)
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

    if (invitationUserId) {
      // Activate an existing placeholder user linked to this invitation
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
    } else {
      // Create a brand new user as before
      await prisma.$transaction(async (tx) => {
        await createUserWithGeneratedCode(tx, {
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
      })
    }

    return { success: true }
  } catch (error) {
    console.error('acceptInvitation error:', error)
    return { error: 'Failed to create or activate user' }
  }
}
