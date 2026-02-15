'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const PrefsSchema = z.object({
  email: z.boolean(),
  sms: z.boolean(),
  inApp: z.boolean(),
})

// Valid roles and statuses for user updates
const VALID_ROLES = ['ADMIN', 'PAYROLL', 'VOLUNTEER', 'FACILITATOR', 'CONTRACTOR', 'HOME_ADMIN', 'BOARD', 'PARTNER'] as const
const VALID_STATUSES = ['ACTIVE', 'INACTIVE', 'SUSPENDED'] as const

const UpdateUserSchema = z.object({
  role: z.enum(VALID_ROLES),
  status: z.enum(VALID_STATUSES),
})

export async function updateNotificationPreferences(prefs: { email: boolean, sms: boolean, inApp: boolean }) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized' }

  const validated = PrefsSchema.safeParse(prefs)
  if (!validated.success) return { error: 'Invalid preferences' }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        notificationPreferences: JSON.stringify(validated.data)
      }
    })

    revalidatePath('/settings') // Assuming a settings page exists or will exist
    return { success: true }
  } catch (error) {
    console.error('Failed to update preferences:', error)
    return { error: 'Failed to update preferences' }
  }
}

export async function getNotificationPreferences() {
  const session = await auth()
  if (!session?.user?.id) return null

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { notificationPreferences: true }
  })

  if (!user?.notificationPreferences) {
    // Return defaults
    return { email: true, sms: false, inApp: true }
  }

  try {
    return JSON.parse(user.notificationPreferences)
  } catch {
    return { email: true, sms: false, inApp: true }
  }
}

export async function updateUser(id: string, formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized' }
  if (session.user.role !== 'ADMIN') return { error: 'Unauthorized' }

  const role = formData.get('role') as string
  const status = formData.get('status') as string

  // Validate input using schema
  const validation = UpdateUserSchema.safeParse({ role, status })
  if (!validation.success) {
    const errorMessage = validation.error.issues[0]?.message || 'Invalid input'
    return { error: errorMessage }
  }

  try {
    // Verify target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true }
    })

    if (!targetUser) {
      return { error: 'User not found' }
    }

    // Prevent admins from demoting themselves (safety check)
    if (id === session.user.id && targetUser.role === 'ADMIN' && validation.data.role !== 'ADMIN') {
      return { error: 'You cannot change your own admin role' }
    }

    await prisma.user.update({
      where: { id },
      data: {
        role: validation.data.role,
        status: validation.data.status,
      }
    })

    // Create audit log for role/status changes
    await prisma.auditLog.create({
      data: {
        action: 'USER_UPDATED',
        details: JSON.stringify({
          targetUserId: id,
          changes: { role: validation.data.role, status: validation.data.status }
        }),
        userId: session.user.id
      }
    })

    revalidatePath('/admin/users')
    revalidatePath('/staff/directory')
    return { success: true }
  } catch (error) {
    console.error('Failed to update user:', error)
    return { error: 'Failed to update user' }
  }
}