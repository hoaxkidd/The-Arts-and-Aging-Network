'use server'

import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

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
  sendEmail?: boolean
}) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Unauthorized" }
  }

  if (session.user.role !== 'ADMIN') {
    return { error: "Only admins can send broadcast messages" }
  }

  try {
    const whereClause: any = {
      role: { in: ['PAYROLL', 'HOME_ADMIN', 'FACILITATOR', 'VOLUNTEER', 'PARTNER'] }
    }

    if (data.targetRoles && data.targetRoles.length > 0) {
      whereClause.role = { in: data.targetRoles }
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      select: { id: true, role: true }
    })

    const boardUsers = users.filter((u: any) => u.role === 'BOARD')
    const hasBoardRecipients = boardUsers.length > 0

    const broadcast = await prisma.broadcastMessage.create({
      data: {
        title: data.title,
        content: data.content,
        contentHtml: data.contentHtml || null,
        senderId: session.user.id,
        targetRoles: data.targetRoles?.join(',') || null,
        status: hasBoardRecipients ? 'PENDING_BOARD_APPROVAL' : 'PENDING'
      }
    })

    await prisma.broadcastRecipient.createMany({
      data: users.map(user => ({
        broadcastId: broadcast.id,
        userId: user.id,
        status: user.role === 'BOARD' ? 'PENDING_BOARD_APPROVAL' : 'PENDING'
      }))
    })

    revalidatePath('/admin')
    revalidatePath('/admin/broadcasts')

    return { success: true, data: broadcast, recipientCount: users.length }
  } catch (error) {
    logger.serverAction("Failed to create broadcast:", error)
    return { error: "Failed to create broadcast" }
  }
}

export async function getBroadcasts() {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Unauthorized" }
  }

  if (session.user.role !== 'ADMIN') {
    return { error: "Only admins can view broadcasts" }
  }

  try {
    const broadcasts = await prisma.broadcastMessage.findMany({
      orderBy: { createdAt: 'desc' }
    })

    const broadcastsWithCount = await Promise.all(
      broadcasts.map(async (broadcast) => {
        const recipientCount = await prisma.broadcastRecipient.count({
          where: { broadcastId: broadcast.id }
        })
        return {
          ...broadcast,
          _count: { recipients: recipientCount }
        }
      })
    )

    return { success: true, data: broadcastsWithCount }
  } catch (error) {
    logger.serverAction("Failed to get broadcasts:", error)
    return { error: "Failed to get broadcasts" }
  }
}

export async function sendBroadcast(broadcastId: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Unauthorized" }
  }

  if (session.user.role !== 'ADMIN') {
    return { error: "Only admins can send broadcasts" }
  }

  try {
    const broadcast = await prisma.broadcastMessage.findUnique({
      where: { id: broadcastId }
    })

    if (!broadcast) {
      return { error: "Broadcast not found" }
    }

    const blockedBoardRecipients = await prisma.broadcastRecipient.count({
      where: { broadcastId, status: 'PENDING_BOARD_APPROVAL' }
    })

    if (blockedBoardRecipients > 0) {
      return { error: 'Board recipients require ED/Chair approval before sending' }
    }

    const pendingRecipients = await prisma.broadcastRecipient.findMany({
      where: { broadcastId, status: 'PENDING' }
    })

    await prisma.broadcastMessage.update({
      where: { id: broadcastId },
      data: { 
        status: 'SENT',
        sentAt: new Date()
      }
    })

    await prisma.broadcastRecipient.updateMany({
      where: { broadcastId, status: 'PENDING' },
      data: { 
        status: 'SENT'
      }
    })

    revalidatePath('/admin')

    return { success: true }
  } catch (error) {
    logger.serverAction("Failed to send broadcast:", error)
    return { error: "Failed to send broadcast" }
  }
}

export async function deleteBroadcast(broadcastId: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Unauthorized" }
  }

  if (session.user.role !== 'ADMIN') {
    return { error: "Only admins can delete broadcasts" }
  }

  try {
    await prisma.broadcastRecipient.deleteMany({
      where: { broadcastId }
    })

    await prisma.broadcastMessage.delete({
      where: { id: broadcastId }
    })

    revalidatePath('/admin')

    return { success: true }
  } catch (error) {
    logger.serverAction("Failed to delete broadcast:", error)
    return { error: "Failed to delete broadcast" }
  }
}

export async function approveBoardVisibilityForBroadcast(broadcastId: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Unauthorized' }
  }

  const canApprove = await canApproveBoardVisibility(session.user.id)
  if (!canApprove) {
    return { error: 'Only ED/Chair approvers can approve board visibility' }
  }

  try {
    const boardRecipients = await prisma.broadcastRecipient.findMany({
      where: { broadcastId, status: 'PENDING_BOARD_APPROVAL' },
      select: { userId: true }
    })

    if (boardRecipients.length === 0) {
      return { error: 'No board approvals pending' }
    }

    await prisma.broadcastRecipient.updateMany({
      where: { broadcastId, status: 'PENDING_BOARD_APPROVAL' },
      data: { status: 'PENDING' }
    })

    await prisma.broadcastMessage.update({
      where: { id: broadcastId },
      data: { status: 'PENDING' }
    })

    await prisma.auditLog.create({
      data: {
        action: 'BROADCAST_BOARD_APPROVED',
        details: JSON.stringify({ broadcastId, approvedBy: session.user.id, boardRecipients: boardRecipients.length }),
        userId: session.user.id,
      }
    })

    revalidatePath('/admin/broadcasts')
    return { success: true }
  } catch (error) {
    logger.serverAction('Failed to approve board broadcast visibility:', error)
    return { error: 'Failed to approve board visibility' }
  }
}

export async function getUserBroadcasts() {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Unauthorized" }
  }

  try {
    const broadcasts = await prisma.broadcastRecipient.findMany({
      where: {
        userId: session.user.id,
        status: { in: ['SENT', 'READ'] }
      }
    })

    const results = []
    for (const recipient of broadcasts) {
      const broadcast = await prisma.broadcastMessage.findUnique({
        where: { id: recipient.broadcastId }
      })
      if (broadcast) {
        results.push(broadcast)
      }
    }

    return { success: true, data: results }
  } catch (error) {
    logger.serverAction("Failed to get user broadcasts:", error)
    return { error: "Failed to get broadcasts" }
  }
}
