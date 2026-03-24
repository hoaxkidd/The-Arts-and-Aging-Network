'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { VALID_ROLES } from "@/lib/roles"
import { randomBytes } from "crypto"
import { sendEmail } from "@/lib/email/service"
import { logger } from "@/lib/logger"

const PrefsSchema = z.object({
  email: z.boolean(),
  sms: z.boolean(),
  inApp: z.boolean(),
  emailFrequency: z.enum(['immediate', 'daily', 'weekly', 'never']).optional(),
})

const VALID_STATUSES = ['ACTIVE', 'PENDING', 'INACTIVE', 'SUSPENDED'] as const

const UpdateUserSchema = z.object({
  role: z.enum(VALID_ROLES),
  status: z.enum(VALID_STATUSES),
})

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
  confirmPassword: z.string().min(8, "Please confirm your new password"),
}).refine(
  (data) => data.newPassword === data.confirmPassword,
  {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  }
)

export async function updateNotificationPreferences(prefs: { email: boolean, sms: boolean, inApp: boolean, emailFrequency?: string }) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized' }

  const validated = PrefsSchema.safeParse(prefs)
  if (!validated.success) return { error: 'Invalid preferences' }

  try {
    const updateData: Record<string, unknown> = {
      notificationPreferences: JSON.stringify({
        email: validated.data.email,
        sms: validated.data.sms,
        inApp: validated.data.inApp,
        emailFrequency: validated.data.emailFrequency || 'immediate'
      })
    }

    if (prefs.emailFrequency === 'daily' || prefs.emailFrequency === 'weekly') {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { emailDigestTime: true }
      })
      updateData.emailDigestTime = user?.emailDigestTime || '08:00'
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: updateData
    })

    revalidatePath('/admin/settings')
    revalidatePath('/dashboard/settings')
    revalidatePath('/staff/settings')
    revalidatePath('/payroll/settings')
    return { success: true }
  } catch (error) {
    logger.serverAction('Failed to update preferences', error)
    return { error: 'Failed to update preferences' }
  }
}

export async function updateEmailDigestTime(digestTime: string): Promise<{ success?: boolean; error?: string }> {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized' }

  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
  if (!timeRegex.test(digestTime)) {
    return { error: 'Invalid time format. Use HH:MM format.' }
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { emailDigestTime: digestTime }
    })

    revalidatePath('/admin/settings')
    revalidatePath('/dashboard/settings')
    revalidatePath('/staff/settings')
    revalidatePath('/payroll/settings')
    return { success: true }
  } catch (error) {
    logger.serverAction('Failed to update digest time', error)
    return { error: 'Failed to update digest time' }
  }
}

export async function sendTestEmail(): Promise<{ success?: boolean; error?: string }> {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized' }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, name: true }
  })

  if (!user?.email) {
    return { error: 'No email on file' }
  }

  try {
    const result = await sendEmail({
      to: user.email,
      templateType: 'WELCOME',
      variables: {
        name: user.name || 'Test User',
        message: 'This is a test email to verify your notification settings. If you received this, your email notifications are working correctly!'
      }
    })

    if (result.success) {
      return { success: true }
    } else {
      return { error: result.error || 'Failed to send test email' }
    }
  } catch (error) {
    logger.serverAction('Failed to send test email', error)
    return { error: 'Failed to send test email' }
  }
}

export async function changePassword(formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }

  const rawCurrent = formData.get("currentPassword") as string | null
  const rawNew = formData.get("newPassword") as string | null
  const rawConfirm = formData.get("confirmPassword") as string | null

  const parsed = ChangePasswordSchema.safeParse({
    currentPassword: rawCurrent ?? "",
    newPassword: rawNew ?? "",
    confirmPassword: rawConfirm ?? "",
  })

  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return { error: issue?.message ?? "Invalid input" }
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { password: true },
    })

    if (!user?.password) {
      return { error: "Password authentication is not enabled for this account" }
    }

    const valid = await bcrypt.compare(parsed.data.currentPassword, user.password)
    if (!valid) {
      return { error: "Current password is incorrect" }
    }

    const hashed = await bcrypt.hash(parsed.data.newPassword, 10)

    await prisma.user.update({
      where: { id: session.user.id },
      data: { password: hashed },
    })

    // Revalidate settings/profile routes that might display account info
    revalidatePath("/settings")
    revalidatePath("/staff/settings")
    revalidatePath("/admin/settings")
    revalidatePath("/payroll/settings")
    revalidatePath("/dashboard/settings")

    return { success: true }
  } catch (error) {
    logger.serverAction("Failed to change password:", error)
    return { error: "Failed to change password" }
  }
}

export async function getNotificationPreferences() {
  const session = await auth()
  if (!session?.user?.id) return null

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      notificationPreferences: true,
      emailDigestTime: true
    }
  })

  const defaults = {
    email: true,
    sms: false,
    inApp: true,
    emailFrequency: 'immediate' as const
  }

  if (!user?.notificationPreferences) {
    return {
      ...defaults,
      emailDigestTime: user?.emailDigestTime || '08:00'
    }
  }

  try {
    const parsed = JSON.parse(user.notificationPreferences)
    return {
      ...defaults,
      ...parsed,
      emailFrequency: parsed.emailFrequency || 'immediate',
      emailDigestTime: user?.emailDigestTime || '08:00'
    }
  } catch {
    return {
      ...defaults,
      emailDigestTime: user?.emailDigestTime || '08:00'
    }
  }
}

export async function updateUser(id: string, formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized' }
  if (session.user.role !== 'ADMIN') return { error: 'Unauthorized' }

  const role = formData.get('role') as string
  const status = formData.get('status') as string
  const requestedEmailRaw = (formData.get('email') as string | null) || ''
  const requestedEmail = requestedEmailRaw.trim().toLowerCase()
  const expiryRaw = (formData.get('emailExpiryHours') as string | null) || ''

  // Validate input using schema
  const validation = UpdateUserSchema.safeParse({ role, status })
  if (!validation.success) {
    const errorMessage = validation.error.issues[0]?.message || 'Invalid input'
    return { error: errorMessage }
  }

  try {
    const now = new Date()
    const resolveExpiryHours = () => {
      const parsedCustom = Number.parseInt(expiryRaw, 10)
      if (expiryRaw.trim() !== '') {
        if (!Number.isFinite(parsedCustom) || parsedCustom < 1 || parsedCustom > 720) {
          return { error: 'Expiry hours must be a whole number between 1 and 720' }
        }
        return { value: parsedCustom }
      }

      const envRaw = process.env.EMAIL_CHANGE_REQUEST_TTL_HOURS
      const envHours = envRaw ? Number.parseInt(envRaw, 10) : NaN
      if (Number.isFinite(envHours) && envHours >= 1 && envHours <= 720) {
        return { value: envHours }
      }

      return { value: 72 }
    }

    // Verify target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, email: true }
    })

    if (!targetUser) {
      return { error: 'User not found' }
    }

    // Prevent admins from demoting themselves (safety check)
    if (id === session.user.id && targetUser.role === 'ADMIN' && validation.data.role !== 'ADMIN') {
      return { error: 'You cannot change your own admin role' }
    }

    let pendingEmailChange:
      | { requestedEmail: string; expiresAt: string; hours: number }
      | undefined

    if (requestedEmail && requestedEmail !== (targetUser.email || '').toLowerCase()) {
      const existingEmailUser = await prisma.user.findFirst({
        where: { email: requestedEmail, NOT: { id } },
        select: { id: true },
      })

      if (existingEmailUser) {
        return { error: 'Email already in use' }
      }

      const expiry = resolveExpiryHours()
      if (expiry.error) return { error: expiry.error }
      const expiryHours = expiry.value ?? 72

      const expiresAt = new Date(now.getTime() + expiryHours * 60 * 60 * 1000)

      await prisma.$transaction(async (tx) => {
        await tx.emailChangeRequest.updateMany({
          where: { userId: id, status: 'PENDING' },
          data: { status: 'CANCELLED', cancelledAt: now },
        })

        await tx.emailChangeRequest.create({
          data: {
            userId: id,
            requestedById: session.user.id,
            currentEmail: targetUser.email || '',
            requestedEmail,
            token: randomBytes(24).toString('hex'),
            status: 'PENDING',
            expiresAt,
          },
        })
      })

      pendingEmailChange = {
        requestedEmail,
        expiresAt: expiresAt.toISOString(),
        hours: expiryHours,
      }
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
    revalidatePath(`/admin/users/${id}`)
    revalidatePath('/staff/directory')
    return {
      success: true,
      pendingEmailChange,
      message: pendingEmailChange
        ? 'Email change request created. Confirmation integration is pending.'
        : undefined,
    }
  } catch (error) {
    logger.serverAction('Failed to update user', error)
    return { error: 'Failed to update user' }
  }
}

export async function cancelPendingEmailChange(userId: string) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'ADMIN') return { error: 'Unauthorized' }

  try {
    const now = new Date()
    const result = await prisma.emailChangeRequest.updateMany({
      where: { userId, status: 'PENDING' },
      data: { status: 'CANCELLED', cancelledAt: now },
    })

    revalidatePath('/admin/users')
    revalidatePath(`/admin/users/${userId}`)
    return { success: true, cancelled: result.count }
  } catch (error) {
    logger.serverAction('Failed to cancel pending email change', error)
    return { error: 'Failed to cancel pending email change' }
  }
}
