'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { VALID_ROLES } from "@/lib/roles"
import { randomBytes } from "crypto"

const PrefsSchema = z.object({
  email: z.boolean(),
  sms: z.boolean(),
  inApp: z.boolean(),
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

    revalidatePath('/admin/settings')
    revalidatePath('/dashboard/settings')
    revalidatePath('/staff/settings')
    revalidatePath('/payroll/settings')
    return { success: true }
  } catch (error) {
    console.error('Failed to update preferences:', error)
    return { error: 'Failed to update preferences' }
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
    console.error("Failed to change password:", error)
    return { error: "Failed to change password" }
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
    console.error('Failed to update user:', error)
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
    console.error('Failed to cancel pending email change:', error)
    return { error: 'Failed to cancel pending email change' }
  }
}
