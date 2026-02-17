'use server'

import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'
import { randomBytes } from 'crypto'
import { hash } from 'bcryptjs'

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['ADMIN', 'PAYROLL', 'CONTRACTOR', 'FACILITATOR', 'PARTNER', 'VOLUNTEER', 'BOARD', 'HOME_ADMIN']),
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
  if (existingUser) {
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
    const user = await prisma.user.create({
      data: {
        email: invitation.email,
        name,
        password: hashedPassword,
        role: invitation.role,
        status: 'ACTIVE',
      },
    })

    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: 'ACCEPTED' },
    })

    return { success: true }
  } catch (error) {
    return { error: 'Failed to create user' }
  }
}
