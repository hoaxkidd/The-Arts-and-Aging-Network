'use server'

import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'
import { logger } from '@/lib/logger'
import { prisma } from '@/lib/prisma'

const DEFAULT_TARGET_ROLES = ['PAYROLL', 'HOME_ADMIN', 'FACILITATOR', 'VOLUNTEER', 'PARTNER']

async function canApproveBoardVisibility(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, position: true },
  })

  if (!user || user.role !== 'ADMIN') return false
  const position = (user.position || '').toLowerCase()
  return position.includes('executive director') || position.includes('chair') || position.includes('ed') || position === ''
}

export async function createBroadcast(data: {
  title: string
  content: string
  contentHtml?: string
  targetRoles?: string[]
}) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized' }
  if (session.user.role !== 'ADMIN') return { error: 'Only admins can create broadcasts' }

  try {
    const targetRoles = (data.targetRoles && data.targetRoles.length > 0 ? data.targetRoles : DEFAULT_TARGET_ROLES)
      .map((role) => role.toUpperCase())

    const users = await prisma.user.findMany({
      where: { role: { in: targetRoles } },
      select: { id: true, role: true },
    })

    if (users.length === 0) return { error: 'No recipients found for selected audience' }

    const hasBoardRecipients = users.some((user) => user.role === 'BOARD')

    const broadcast = await prisma.$transaction(async (tx) => {
      const created = await tx.broadcastMessage.create({
        data: {
          senderId: session.user.id,
          title: data.title,
          content: data.content,
          contentHtml: data.contentHtml || null,
          targetRoles: targetRoles.join(','),
          status: hasBoardRecipients ? 'PENDING_BOARD_APPROVAL' : 'PENDING',
        },
      })

      await tx.broadcastRecipient.createMany({
        data: users.map((user) => ({
          broadcastId: created.id,
          userId: user.id,
          status: user.role === 'BOARD' ? 'PENDING_BOARD_APPROVAL' : 'PENDING',
        })),
      })

      await tx.auditLog.create({
        data: {
          action: 'BROADCAST_CREATED',
          userId: session.user.id,
          details: JSON.stringify({
            broadcastId: created.id,
            recipients: users.length,
            targetRoles,
            requiresBoardApproval: hasBoardRecipients,
          }),
        },
      })

      return created
    })

    if (hasBoardRecipients) {
      const approvers = await prisma.user.findMany({
        where: { role: 'ADMIN', id: { not: session.user.id } },
        select: { id: true },
      })

      if (approvers.length > 0) {
        await prisma.notification.createMany({
          data: approvers.map((approver) => ({
            userId: approver.id,
            type: 'BROADCAST_BOARD_APPROVAL',
            title: 'Broadcast requires board approval',
            message: `"${data.title}" includes board recipients and needs approval before sending.`,
            link: '/admin/broadcasts',
            read: false,
          })),
        })
      }
    }

    revalidatePath('/admin')
    revalidatePath('/admin/broadcasts')
    revalidatePath('/notifications')
    return { success: true, data: broadcast, recipientCount: users.length }
  } catch (error) {
    logger.serverAction('Failed to create broadcast:', error)
    return { error: 'Failed to create broadcast' }
  }
}

export async function updateBroadcast(data: {
  id: string
  title: string
  content: string
  contentHtml?: string
  targetRoles?: string[]
}) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized' }
  if (session.user.role !== 'ADMIN') return { error: 'Only admins can update broadcasts' }

  try {
    const existing = await prisma.broadcastMessage.findUnique({
      where: { id: data.id },
      select: { id: true, status: true },
    })

    if (!existing) return { error: 'Broadcast not found' }
    if (!['PENDING', 'PENDING_BOARD_APPROVAL'].includes(existing.status)) {
      return { error: 'Only pending broadcasts can be edited' }
    }

    const targetRoles = (data.targetRoles && data.targetRoles.length > 0 ? data.targetRoles : DEFAULT_TARGET_ROLES)
      .map((role) => role.toUpperCase())

    const users = await prisma.user.findMany({
      where: { role: { in: targetRoles } },
      select: { id: true, role: true },
    })

    if (users.length === 0) return { error: 'No recipients found for selected audience' }

    const hasBoardRecipients = users.some((user) => user.role === 'BOARD')

    await prisma.$transaction(async (tx) => {
      await tx.broadcastMessage.update({
        where: { id: data.id },
        data: {
          title: data.title,
          content: data.content,
          contentHtml: data.contentHtml || null,
          targetRoles: targetRoles.join(','),
          status: hasBoardRecipients ? 'PENDING_BOARD_APPROVAL' : 'PENDING',
        },
      })

      await tx.broadcastRecipient.deleteMany({ where: { broadcastId: data.id } })
      await tx.broadcastRecipient.createMany({
        data: users.map((user) => ({
          broadcastId: data.id,
          userId: user.id,
          status: user.role === 'BOARD' ? 'PENDING_BOARD_APPROVAL' : 'PENDING',
        })),
      })

      await tx.auditLog.create({
        data: {
          action: 'BROADCAST_UPDATED',
          userId: session.user.id,
          details: JSON.stringify({
            broadcastId: data.id,
            recipients: users.length,
            targetRoles,
            requiresBoardApproval: hasBoardRecipients,
          }),
        },
      })
    })

    revalidatePath('/admin')
    revalidatePath('/admin/broadcasts')
    revalidatePath('/notifications')
    return { success: true, recipientCount: users.length }
  } catch (error) {
    logger.serverAction('Failed to update broadcast:', error)
    return { error: 'Failed to update broadcast' }
  }
}

export async function getBroadcasts() {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized' }
  if (session.user.role !== 'ADMIN') return { error: 'Only admins can view broadcasts' }

  try {
    const [broadcasts, groupedCounts] = await Promise.all([
      prisma.broadcastMessage.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.broadcastRecipient.groupBy({ by: ['broadcastId'], _count: { broadcastId: true } }),
    ])

    const countByBroadcastId = new Map<string, number>(
      groupedCounts.map((entry) => [entry.broadcastId, entry._count.broadcastId])
    )

    const data = broadcasts.map((broadcast) => ({
      ...broadcast,
      _count: { recipients: countByBroadcastId.get(broadcast.id) ?? 0 },
    }))

    return { success: true, data }
  } catch (error) {
    logger.serverAction('Failed to get broadcasts:', error)
    return { error: 'Failed to get broadcasts' }
  }
}

export async function sendBroadcast(broadcastId: string) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized' }
  if (session.user.role !== 'ADMIN') return { error: 'Only admins can send broadcasts' }

  try {
    const broadcast = await prisma.broadcastMessage.findUnique({ where: { id: broadcastId } })
    if (!broadcast) return { error: 'Broadcast not found' }
    if (broadcast.status === 'SENT') return { error: 'Broadcast has already been sent' }
    if (broadcast.status === 'CANCELLED') return { error: 'Cancelled broadcasts cannot be sent' }

    const blockedBoardRecipients = await prisma.broadcastRecipient.count({
      where: { broadcastId, status: 'PENDING_BOARD_APPROVAL' },
    })
    if (blockedBoardRecipients > 0) {
      return { error: 'Board recipients require ED/Chair approval before sending' }
    }

    const pendingRecipients = await prisma.broadcastRecipient.findMany({
      where: { broadcastId, status: 'PENDING' },
      select: { userId: true },
    })
    if (pendingRecipients.length === 0) return { error: 'No pending recipients to send' }

    const sentAt = new Date()
    await prisma.$transaction(async (tx) => {
      await tx.broadcastMessage.update({
        where: { id: broadcastId },
        data: { status: 'SENT', sentAt },
      })

      await tx.broadcastRecipient.updateMany({
        where: { broadcastId, status: 'PENDING' },
        data: { status: 'SENT' },
      })

      await tx.notification.createMany({
        data: pendingRecipients.map((recipient) => ({
          userId: recipient.userId,
          type: 'BROADCAST',
          title: broadcast.title,
          message: broadcast.content.length > 280 ? `${broadcast.content.slice(0, 277)}...` : broadcast.content,
          link: '/notifications',
          read: false,
        })),
      })

      await tx.auditLog.create({
        data: {
          action: 'BROADCAST_SENT',
          userId: session.user.id,
          details: JSON.stringify({
            broadcastId,
            recipientCount: pendingRecipients.length,
            sentAt: sentAt.toISOString(),
          }),
        },
      })
    })

    revalidatePath('/admin')
    revalidatePath('/admin/broadcasts')
    revalidatePath('/notifications')
    return { success: true, recipientCount: pendingRecipients.length }
  } catch (error) {
    logger.serverAction('Failed to send broadcast:', error)
    return { error: 'Failed to send broadcast' }
  }
}

export async function deleteBroadcast(broadcastId: string) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized' }
  if (session.user.role !== 'ADMIN') return { error: 'Only admins can delete broadcasts' }

  try {
    const broadcast = await prisma.broadcastMessage.findUnique({
      where: { id: broadcastId },
      select: { id: true, status: true },
    })

    if (!broadcast) return { error: 'Broadcast not found' }
    if (broadcast.status === 'SENT') {
      return { error: 'Sent broadcasts cannot be deleted for audit reasons' }
    }

    await prisma.$transaction(async (tx) => {
      await tx.broadcastRecipient.deleteMany({ where: { broadcastId } })
      await tx.broadcastMessage.delete({ where: { id: broadcastId } })
      await tx.auditLog.create({
        data: {
          action: 'BROADCAST_DELETED',
          userId: session.user.id,
          details: JSON.stringify({ broadcastId }),
        },
      })
    })

    revalidatePath('/admin')
    revalidatePath('/admin/broadcasts')
    return { success: true }
  } catch (error) {
    logger.serverAction('Failed to delete broadcast:', error)
    return { error: 'Failed to delete broadcast' }
  }
}

export async function approveBoardVisibilityForBroadcast(broadcastId: string) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized' }

  const canApprove = await canApproveBoardVisibility(session.user.id)
  if (!canApprove) return { error: 'Only ED/Chair approvers can approve board visibility' }

  try {
    const [broadcast, boardRecipients] = await Promise.all([
      prisma.broadcastMessage.findUnique({ where: { id: broadcastId }, select: { senderId: true, title: true } }),
      prisma.broadcastRecipient.findMany({
        where: { broadcastId, status: 'PENDING_BOARD_APPROVAL' },
        select: { userId: true },
      }),
    ])

    if (!broadcast) return { error: 'Broadcast not found' }
    if (boardRecipients.length === 0) return { error: 'No board approvals pending' }

    await prisma.$transaction(async (tx) => {
      await tx.broadcastRecipient.updateMany({
        where: { broadcastId, status: 'PENDING_BOARD_APPROVAL' },
        data: { status: 'PENDING' },
      })

      await tx.broadcastMessage.update({ where: { id: broadcastId }, data: { status: 'PENDING' } })

      await tx.auditLog.create({
        data: {
          action: 'BROADCAST_BOARD_APPROVED',
          userId: session.user.id,
          details: JSON.stringify({
            broadcastId,
            approvedBy: session.user.id,
            boardRecipients: boardRecipients.length,
          }),
        },
      })

      if (broadcast.senderId !== session.user.id) {
        await tx.notification.create({
          data: {
            userId: broadcast.senderId,
            type: 'BROADCAST_BOARD_APPROVED',
            title: 'Broadcast approved',
            message: `"${broadcast.title}" is approved for board recipients and ready to send.`,
            link: '/admin/broadcasts',
            read: false,
          },
        })
      }
    })

    revalidatePath('/admin/broadcasts')
    revalidatePath('/notifications')
    return { success: true }
  } catch (error) {
    logger.serverAction('Failed to approve board broadcast visibility:', error)
    return { error: 'Failed to approve board visibility' }
  }
}

export async function getUserBroadcasts() {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized' }

  try {
    const recipients = await prisma.broadcastRecipient.findMany({
      where: { userId: session.user.id, status: { in: ['SENT', 'READ'] } },
      select: { broadcastId: true },
    })

    const ids = Array.from(new Set(recipients.map((recipient) => recipient.broadcastId)))
    if (ids.length === 0) return { success: true, data: [] }

    const data = await prisma.broadcastMessage.findMany({
      where: { id: { in: ids } },
      orderBy: { createdAt: 'desc' },
    })

    return { success: true, data }
  } catch (error) {
    logger.serverAction('Failed to get user broadcasts:', error)
    return { error: 'Failed to get broadcasts' }
  }
}
