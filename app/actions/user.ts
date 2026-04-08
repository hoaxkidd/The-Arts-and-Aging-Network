'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { VALID_ROLES, canMergeRoles, isValidRole, normalizeRoleList } from "@/lib/roles"
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
  status: z.enum(VALID_STATUSES),
})

const EMPLOYMENT_STATUS_OPTIONS = ['ACTIVE', 'ON_LEAVE', 'CONTRACT', 'SEASONAL', 'TERMINATED'] as const
const EMPLOYMENT_TYPE_OPTIONS = ['FULL_TIME', 'PART_TIME', 'CASUAL', 'VOLUNTEER', 'CONTRACTOR'] as const

const UpdateEmploymentSchema = z.object({
  position: z.string().max(120).optional(),
  region: z.string().max(120).optional(),
  employmentStatus: z.enum(EMPLOYMENT_STATUS_OPTIONS).optional(),
  employmentType: z.enum(EMPLOYMENT_TYPE_OPTIONS).optional(),
  startDate: z.string().optional(),
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

async function ensureRoleAssignments(userId: string, fallbackRole: string, actorId?: string) {
  const existing = await prisma.userRoleAssignment.findMany({
    where: { userId, isActive: true },
    orderBy: [{ isPrimary: 'desc' }, { assignedAt: 'asc' }],
  })

  if (existing.length > 0) return existing

  await prisma.userRoleAssignment.create({
    data: {
      userId,
      role: fallbackRole,
      isPrimary: true,
      isActive: true,
      assignedById: actorId || null,
    },
  })

  return prisma.userRoleAssignment.findMany({
    where: { userId, isActive: true },
    orderBy: [{ isPrimary: 'desc' }, { assignedAt: 'asc' }],
  })
}

async function getActiveRolesForUser(userId: string, fallbackRole: string, actorId?: string): Promise<string[]> {
  const assignments = await ensureRoleAssignments(userId, fallbackRole, actorId)
  return normalizeRoleList(assignments.map((assignment) => assignment.role))
}

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

  const status = formData.get('status') as string
  const requestedEmailRaw = (formData.get('email') as string | null) || ''
  const requestedEmail = requestedEmailRaw.trim().toLowerCase()
  const expiryRaw = (formData.get('emailExpiryHours') as string | null) || ''

  // Validate input using schema
  const validation = UpdateUserSchema.safeParse({ status })
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

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: {
          status: validation.data.status,
        }
      })
    })

    // Create audit log for role/status changes
    await prisma.auditLog.create({
      data: {
        action: 'USER_UPDATED',
        details: JSON.stringify({
          targetUserId: id,
          changes: { status: validation.data.status }
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

export async function updateUserEmployment(id: string, formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized' }
  if (session.user.role !== 'ADMIN') return { error: 'Unauthorized' }

  const parsed = UpdateEmploymentSchema.safeParse({
    position: (formData.get('position') as string | null)?.trim() || undefined,
    region: (formData.get('region') as string | null)?.trim() || undefined,
    employmentStatus: ((formData.get('employmentStatus') as string | null) || '').trim().toUpperCase() || undefined,
    employmentType: ((formData.get('employmentType') as string | null) || '').trim().toUpperCase() || undefined,
    startDate: (formData.get('startDate') as string | null) || undefined,
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid employment fields' }
  }

  try {
    const startDateValue = parsed.data.startDate ? new Date(`${parsed.data.startDate}T00:00:00`) : null
    if (parsed.data.startDate && Number.isNaN(startDateValue?.getTime())) {
      return { error: 'Invalid start date' }
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        position: parsed.data.position || null,
        region: parsed.data.region || null,
        employmentStatus: parsed.data.employmentStatus || null,
        employmentType: parsed.data.employmentType || null,
        startDate: startDateValue,
      },
      select: { userCode: true },
    })

    await prisma.auditLog.create({
      data: {
        action: 'USER_EMPLOYMENT_UPDATED',
        details: JSON.stringify({
          targetUserId: id,
          changes: {
            position: parsed.data.position || null,
            region: parsed.data.region || null,
            employmentStatus: parsed.data.employmentStatus || null,
            employmentType: parsed.data.employmentType || null,
            startDate: parsed.data.startDate || null,
          },
        }),
        userId: session.user.id,
      },
    })

    revalidatePath('/admin/users')
    revalidatePath(`/admin/users/${id}`)
    revalidatePath(`/admin/users/${user.userCode || id}`)
    return { success: true }
  } catch (error) {
    logger.serverAction('Failed to update user employment', error)
    return { error: 'Failed to update employment details' }
  }
}

export async function getUserRoleAssignments(userId: string) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized' }
  if (session.user.role !== 'ADMIN') return { error: 'Unauthorized' }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  })
  if (!user) return { error: 'User not found' }

  const assignments = await ensureRoleAssignments(userId, user.role, session.user.id)
  return { success: true, roles: assignments }
}

export async function updateUserRoles(userId: string, formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized' }
  if (session.user.role !== 'ADMIN') return { error: 'Unauthorized' }

  const selectedRoleValues = formData
    .getAll('roles')
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter(Boolean)

  if (selectedRoleValues.length === 0) {
    return { error: 'Select at least one role' }
  }

  const invalidRoles = selectedRoleValues.filter((role) => !isValidRole(role))
  if (invalidRoles.length > 0) {
    return { error: 'One or more selected roles are invalid' }
  }

  const selectedRoles = normalizeRoleList(selectedRoleValues)
  const requestedPrimaryRoleRaw = formData.get('primaryRole')
  const requestedPrimaryRoleValue = typeof requestedPrimaryRoleRaw === 'string' ? requestedPrimaryRoleRaw.trim() : ''
  const requestedPrimaryRole = requestedPrimaryRoleValue && isValidRole(requestedPrimaryRoleValue) ? requestedPrimaryRoleValue : undefined

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      userCode: true,
      role: true,
      roleAssignments: {
        where: { isActive: true },
        orderBy: [{ isPrimary: 'desc' }, { assignedAt: 'asc' }],
      },
    },
  })

  if (!user) return { error: 'User not found' }

  // Preserve existing primary if still selected and caller did not provide one.
  const existingPrimaryRoleRaw = user.roleAssignments.find((assignment) => assignment.isPrimary)?.role
  const existingPrimaryRole = existingPrimaryRoleRaw && isValidRole(existingPrimaryRoleRaw) ? existingPrimaryRoleRaw : undefined
  const fallbackPrimaryRole = selectedRoles[0]
  const primaryRole = requestedPrimaryRole || (existingPrimaryRole && selectedRoles.includes(existingPrimaryRole) ? existingPrimaryRole : fallbackPrimaryRole)

  if (!primaryRole || !selectedRoles.includes(primaryRole)) {
    return { error: 'Primary role must be one of the selected roles' }
  }

  const mergeErrors: string[] = []
  const mergedSoFar: string[] = []
  for (const role of selectedRoles) {
    const mergeCheck = canMergeRoles(mergedSoFar, role)
    if (!mergeCheck.ok) {
      mergeErrors.push(mergeCheck.error || 'Invalid role combination')
      break
    }
    mergedSoFar.push(role)
  }
  if (mergeErrors.length > 0) {
    return { error: mergeErrors[0] }
  }

  if (userId === session.user.id && !selectedRoles.includes('ADMIN')) {
    return { error: 'You cannot remove your own ADMIN role' }
  }

  try {
    await prisma.$transaction(async (tx) => {
      const existingAssignments = await tx.userRoleAssignment.findMany({
        where: { userId },
      })

      const existingByRole = new Map(existingAssignments.map((assignment) => [assignment.role, assignment]))

      for (const role of selectedRoles) {
        const existing = existingByRole.get(role)
        if (existing) {
          await tx.userRoleAssignment.update({
            where: { id: existing.id },
            data: {
              isActive: true,
              isPrimary: role === primaryRole,
              assignedById: session.user.id,
            },
          })
        } else {
          await tx.userRoleAssignment.create({
            data: {
              userId,
              role,
              isActive: true,
              isPrimary: role === primaryRole,
              assignedById: session.user.id,
            },
          })
        }
      }

      const rolesToDeactivate = existingAssignments
        .map((assignment) => assignment.role)
        .filter((role) => !isValidRole(role) || !selectedRoles.includes(role))

      if (rolesToDeactivate.length > 0) {
        await tx.userRoleAssignment.updateMany({
          where: { userId, role: { in: rolesToDeactivate } },
          data: {
            isActive: false,
            isPrimary: false,
          },
        })
      }

      await tx.user.update({
        where: { id: userId },
        data: { role: primaryRole },
      })
    })

    await prisma.auditLog.create({
      data: {
        action: 'USER_ROLES_UPDATED',
        details: JSON.stringify({
          targetUserId: userId,
          roles: selectedRoles,
          primaryRole,
        }),
        userId: session.user.id,
      },
    })

    revalidatePath('/admin/users')
    revalidatePath(`/admin/users/${userId}`)
    revalidatePath(`/admin/users/${user.userCode || userId}`)
    revalidatePath('/staff/directory')
    return { success: true }
  } catch (error) {
    logger.serverAction('Failed to update user roles', error)
    return { error: 'Failed to update user roles' }
  }
}

export async function addSecondaryRole(userId: string, role: string) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized' }
  if (session.user.role !== 'ADMIN') return { error: 'Unauthorized' }
  if (!VALID_ROLES.includes(role as (typeof VALID_ROLES)[number])) return { error: 'Invalid role' }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  })
  if (!user) return { error: 'User not found' }

  const activeRoles = await getActiveRolesForUser(userId, user.role, session.user.id)
  if (activeRoles.includes(role)) {
    return { error: 'Role already assigned' }
  }

  const mergeCheck = canMergeRoles(activeRoles, role)
  if (!mergeCheck.ok) {
    return { error: mergeCheck.error }
  }

  await prisma.userRoleAssignment.create({
    data: {
      userId,
      role,
      isPrimary: false,
      isActive: true,
      assignedById: session.user.id,
    }
  })

  await prisma.auditLog.create({
    data: {
      action: 'USER_ROLE_ADDED',
      details: JSON.stringify({ targetUserId: userId, role }),
      userId: session.user.id,
    },
  })

  revalidatePath(`/admin/users/${userId}`)
  revalidatePath('/admin/users')
  return { success: true }
}

export async function removeSecondaryRole(userId: string, role: string) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized' }
  if (session.user.role !== 'ADMIN') return { error: 'Unauthorized' }

  const assignments = await prisma.userRoleAssignment.findMany({
    where: { userId, isActive: true },
    orderBy: [{ isPrimary: 'desc' }, { assignedAt: 'asc' }],
  })

  if (assignments.length <= 1) {
    return { error: 'A user must have at least one role' }
  }

  const target = assignments.find((assignment) => assignment.role === role)
  if (!target) return { error: 'Role not assigned' }
  if (target.isPrimary) return { error: 'Use "Set primary" first, then remove this role' }

  await prisma.userRoleAssignment.update({
    where: { id: target.id },
    data: { isActive: false, isPrimary: false },
  })

  await prisma.auditLog.create({
    data: {
      action: 'USER_ROLE_REMOVED',
      details: JSON.stringify({ targetUserId: userId, role }),
      userId: session.user.id,
    },
  })

  revalidatePath(`/admin/users/${userId}`)
  revalidatePath('/admin/users')
  return { success: true }
}

export async function setPrimaryRole(userId: string, role: string) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized' }
  if (session.user.role !== 'ADMIN') return { error: 'Unauthorized' }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  })
  if (!user) return { error: 'User not found' }

  const assignments = await prisma.userRoleAssignment.findMany({
    where: { userId, isActive: true },
  })
  const target = assignments.find((assignment) => assignment.role === role)
  if (!target) return { error: 'Role not assigned' }

  await prisma.$transaction(async (tx) => {
    await tx.userRoleAssignment.updateMany({
      where: { userId, isActive: true },
      data: { isPrimary: false },
    })
    await tx.userRoleAssignment.update({
      where: { id: target.id },
      data: { isPrimary: true },
    })
    await tx.user.update({
      where: { id: userId },
      data: { role },
    })
  })

  await prisma.auditLog.create({
    data: {
      action: 'USER_PRIMARY_ROLE_SET',
      details: JSON.stringify({ targetUserId: userId, role }),
      userId: session.user.id,
    },
  })

  revalidatePath(`/admin/users/${userId}`)
  revalidatePath('/admin/users')
  return { success: true }
}

export async function setMyPrimaryRole(formData: FormData): Promise<void> {
  const session = await auth()
  if (!session?.user?.id) return

  const raw = formData.get('primaryRole')
  const requested = typeof raw === 'string' ? raw.trim() : ''
  if (!isValidRole(requested)) return

  const userId = session.user.id

  const assignments = await prisma.userRoleAssignment.findMany({
    where: { userId, isActive: true },
    orderBy: [{ isPrimary: 'desc' }, { assignedAt: 'asc' }],
  })

  const activeRoles = normalizeRoleList(assignments.map((a) => a.role))
  if (!activeRoles.includes(requested)) {
    return
  }

  // Enforce merge constraints when selecting a role to be primary (same constraints as admin role editor).
  const mergeErrors: string[] = []
  const mergedSoFar: string[] = []
  for (const role of activeRoles) {
    const mergeCheck = canMergeRoles(mergedSoFar, role)
    if (!mergeCheck.ok) {
      mergeErrors.push(mergeCheck.error || 'Invalid role combination')
      break
    }
    mergedSoFar.push(role)
  }
  if (mergeErrors.length > 0) return

  try {
    await prisma.$transaction(async (tx) => {
      await tx.userRoleAssignment.updateMany({
        where: { userId, isActive: true },
        data: { isPrimary: false },
      })
      await tx.userRoleAssignment.updateMany({
        where: { userId, role: requested, isActive: true },
        data: { isPrimary: true },
      })
      await tx.user.update({
        where: { id: userId },
        data: { role: requested },
      })
    })

    await prisma.auditLog.create({
      data: {
        action: 'USER_PRIMARY_ROLE_SET_SELF',
        details: JSON.stringify({ userId, role: requested }),
        userId,
      },
    })

    // Revalidate key entry points; layouts will pull the updated session on next navigation.
    revalidatePath('/staff/profile')
    revalidatePath('/facilitator/profile')
    revalidatePath('/board/profile')
    revalidatePath('/payroll/profile')
    revalidatePath('/volunteer/profile')
    revalidatePath('/partner/profile')
    revalidatePath('/dashboard/profile')
    revalidatePath('/admin/profile')
    return
  } catch (error) {
    logger.serverAction('Failed to set my primary role', error)
    // Swallow error to satisfy `<form action>` typing; callers can rely on revalidation + UI refresh.
    // If you want user-visible errors later, we can convert this to a client component with optimistic UI.
    return
  }
}

export async function updateVolunteerReviewStatus(userId: string, reviewStatus: 'PENDING_REVIEW' | 'APPROVED' | 'REQUEST_CORRECTIONS') {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized' }
  if (session.user.role !== 'ADMIN') return { error: 'Unauthorized' }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  })
  if (!user) return { error: 'User not found' }

  const roles = await getActiveRolesForUser(userId, user.role, session.user.id)
  if (!roles.includes('VOLUNTEER')) {
    return { error: 'User is not assigned the VOLUNTEER role' }
  }

  await prisma.user.update({
    where: { id: userId },
    data: { volunteerReviewStatus: reviewStatus },
  })

  await prisma.auditLog.create({
    data: {
      action: 'VOLUNTEER_REVIEW_STATUS_UPDATED',
      details: JSON.stringify({ targetUserId: userId, reviewStatus }),
      userId: session.user.id,
    },
  })

  revalidatePath(`/admin/users/${userId}`)
  revalidatePath('/admin/users')
  revalidatePath('/volunteers')
  return { success: true }
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
