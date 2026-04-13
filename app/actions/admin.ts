'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { notifyStaffAboutExpenseStatus } from "@/lib/notifications"
import { logger } from "@/lib/logger"
import { normalizePhone } from "@/lib/phone"
import { normalizeMultilineText, normalizeText } from "@/lib/input-normalize"

export async function updateRequestStatus(requestId: string, status: 'APPROVED' | 'REJECTED') {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    return { error: 'Unauthorized' }
  }

  try {
    const request = await prisma.expenseRequest.update({
      where: { id: requestId },
      data: { status },
    })

    // Log the action
    await prisma.auditLog.create({
      data: {
        action: `REQUEST_${status}`,
        details: JSON.stringify({ requestId, amount: request.amount, category: request.category }),
        userId: session.user.id,
      }
    })

    // Notify admin about the status update
    try {
      await notifyStaffAboutExpenseStatus({
        staffId: request.userId,
        expenseId: request.id,
        category: request.category,
        status
      })
    } catch (notifyError) {
      logger.serverAction('Failed to send expense status notification:', notifyError)
    }

    revalidatePath('/admin/requests')
    revalidatePath('/payroll/requests') // Update user view too
    return { success: true }
  } catch (_error) {
    return { error: 'Failed to update request status' }
  }
}

function pickHomeUpdates(payload: Record<string, unknown>) {
  const allowedKeys = [
    'name', 'address', 'residentCount', 'maxCapacity', 'contactName', 'contactEmail',
    'contactPhone', 'contactPosition', 'additionalContacts', 'useCustomNotificationEmail',
    'notificationEmail', 'type', 'region', 'isPartner', 'newsletterSub', 'accessibilityInfo',
    'triggerWarnings', 'specialNeeds', 'accommodations', 'emergencyProtocol', 'photoPermissions',
    'feedbackFormUrl',
  ]

  const data: Record<string, unknown> = {}
  for (const key of allowedKeys) {
    if (!(key in payload)) continue
    const value = payload[key]
    if (typeof value === 'string') {
      if (key === 'contactPhone') {
        data[key] = normalizePhone(value) || ''
      } else if (['triggerWarnings', 'specialNeeds', 'accommodations', 'emergencyProtocol'].includes(key)) {
        data[key] = normalizeMultilineText(value) || null
      } else {
        data[key] = normalizeText(value) ?? null
      }
    } else {
      data[key] = value
    }
  }
  return data
}

function pickProfileUpdates(payload: Record<string, unknown>) {
  const allowedKeys = ['preferredName', 'pronouns', 'phone', 'address', 'birthDate', 'bio', 'region']
  const data: Record<string, unknown> = {}

  for (const key of allowedKeys) {
    if (!(key in payload)) continue
    const value = payload[key]
    if (typeof value === 'string') {
      if (key === 'phone') data[key] = normalizePhone(value) || null
      else if (key === 'bio') data[key] = normalizeMultilineText(value) || null
      else if (key === 'birthDate') data[key] = value ? new Date(value) : null
      else data[key] = normalizeText(value) || null
    } else {
      data[key] = value
    }
  }

  return data
}

export async function approveChangeRequest(requestAuditId: string) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN' || !session.user.id) {
    return { error: 'Unauthorized' }
  }

  try {
    const request = await prisma.auditLog.findUnique({ where: { id: requestAuditId } })
    if (!request) return { error: 'Request not found' }

    const alreadyReviewed = await prisma.auditLog.findFirst({
      where: {
        action: {
          in: [
            'HOME_CHANGE_APPROVED',
            'HOME_CHANGE_REJECTED',
            'PROGRAM_COORDINATOR_PROFILE_CHANGE_APPROVED',
            'PROGRAM_COORDINATOR_PROFILE_CHANGE_REJECTED',
          ],
        },
        details: { contains: requestAuditId },
      },
      select: { id: true },
    })

    if (alreadyReviewed) return { error: 'Request already reviewed' }

    const details = request.details ? JSON.parse(request.details) : {}

    await prisma.$transaction(async (tx) => {
      if (request.action === 'HOME_CHANGE_REQUESTED') {
        const homeId = details?.homeId as string | undefined
        const requestedUpdates = (details?.requestedUpdates || {}) as Record<string, unknown>
        if (!homeId) throw new Error('Invalid request payload')
        await tx.geriatricHome.update({ where: { id: homeId }, data: pickHomeUpdates(requestedUpdates) })

        await tx.auditLog.create({
          data: {
            action: 'HOME_CHANGE_APPROVED',
            details: JSON.stringify({ requestAuditId, homeId }),
            userId: session.user.id,
          },
        })
      } else if (request.action === 'PROGRAM_COORDINATOR_PROFILE_CHANGE_REQUESTED') {
        const targetUserId = (details?.userId as string | undefined) || request.userId || undefined
        const requestedUpdates = (details?.requestedUpdates || {}) as Record<string, unknown>
        if (!targetUserId) throw new Error('Invalid request payload')

        await tx.user.update({ where: { id: targetUserId }, data: pickProfileUpdates(requestedUpdates) })

        await tx.auditLog.create({
          data: {
            action: 'PROGRAM_COORDINATOR_PROFILE_CHANGE_APPROVED',
            details: JSON.stringify({ requestAuditId, targetUserId }),
            userId: session.user.id,
          },
        })
      } else {
        throw new Error('Unsupported request type')
      }
    })

    if (request.userId) {
      await prisma.notification.create({
        data: {
          userId: request.userId,
          type: 'PROFILE_UPDATE',
          title: 'Change Request Approved',
          message: 'Your submitted changes were approved by admin.',
          link: '/dashboard/profile',
        },
      })
    }

    revalidatePath('/admin/requests')
    revalidatePath('/admin/homes')
    revalidatePath('/admin/users')
    revalidatePath('/dashboard/profile')

    return { success: true }
  } catch (error) {
    logger.serverAction('Failed to approve change request', error)
    return { error: 'Failed to approve change request' }
  }
}

export async function rejectChangeRequest(requestAuditId: string, note?: string) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN' || !session.user.id) {
    return { error: 'Unauthorized' }
  }

  try {
    const request = await prisma.auditLog.findUnique({ where: { id: requestAuditId } })
    if (!request) return { error: 'Request not found' }

    const action = request.action === 'HOME_CHANGE_REQUESTED'
      ? 'HOME_CHANGE_REJECTED'
      : request.action === 'PROGRAM_COORDINATOR_PROFILE_CHANGE_REQUESTED'
        ? 'PROGRAM_COORDINATOR_PROFILE_CHANGE_REJECTED'
        : null

    if (!action) return { error: 'Unsupported request type' }

    await prisma.auditLog.create({
      data: {
        action,
        details: JSON.stringify({ requestAuditId, note: note || null }),
        userId: session.user.id,
      },
    })

    if (request.userId) {
      await prisma.notification.create({
        data: {
          userId: request.userId,
          type: 'PROFILE_UPDATE',
          title: 'Change Request Rejected',
          message: note ? `Admin rejected your change request: ${note}` : 'Admin rejected your change request.',
          link: '/dashboard/profile',
        },
      })
    }

    revalidatePath('/admin/requests')
    return { success: true }
  } catch (error) {
    logger.serverAction('Failed to reject change request', error)
    return { error: 'Failed to reject change request' }
  }
}
