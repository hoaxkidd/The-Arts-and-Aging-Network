'use server'

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { sendEmailWithRetry } from '@/lib/email/service'
import { logger } from '@/lib/logger'
import { getDmDecision } from '@/lib/dm-permissions'
import { getInboxBasePathForRole } from '@/lib/role-routes'
import { getActiveAdminRecipientIds } from '@/lib/notification-recipients'

// Request to start a conversation with someone
export async function requestConversation(requestedId: string, message?: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Unauthorized' }
  }

  try {
    if (requestedId === session.user.id) {
      return { error: 'You cannot request a conversation with yourself' }
    }

    const eligibility = await canMessageUser(requestedId)
    if (eligibility.canMessage) {
      return { error: 'You can already message this user directly' }
    }
    if (eligibility.requestStatus === 'PENDING') {
      return { error: eligibility.reason || 'A request is already pending admin approval' }
    }

    // Check if request already exists
    const existing = await prisma.directMessageRequest.findUnique({
      where: {
        requesterId_requestedId: {
          requesterId: session.user.id,
          requestedId
        }
      }
    })

    if (existing) {
      if (existing.status === 'PENDING') {
        return { error: 'You already have a pending request with this user' }
      }
      if (existing.status === 'APPROVED') {
        return { error: 'You already have an approved conversation with this user' }
      }
      // If DENIED, allow creating a new request
      await prisma.directMessageRequest.delete({
        where: { id: existing.id }
      })
    }

    // Create the request
    const request = await prisma.directMessageRequest.create({
      data: {
        requesterId: session.user.id,
        requestedId,
        message,
        status: 'PENDING'
      },
      include: {
        requester: {
          select: {
            name: true,
            preferredName: true
          }
        }
      }
    })

    // Notify admins
    const adminIds = await getActiveAdminRecipientIds()

    if (adminIds.length > 0) {
      await prisma.notification.createMany({
        data: adminIds.map((adminId) => ({
          userId: adminId,
          type: 'CONVERSATION_REQUEST',
          title: 'New Conversation Request',
          message: `${request.requester.preferredName || request.requester.name} wants to start a conversation`,
          link: '/admin/conversation-requests',
          read: false
        }))
      })
    }

    await prisma.auditLog.create({
      data: {
        action: 'CONVERSATION_REQUEST_CREATED',
        details: JSON.stringify({
          requestId: request.id,
          requesterId: session.user.id,
          requestedId,
          hasMessage: Boolean(request.message?.trim())
        }),
        userId: session.user.id
      }
    })

    revalidatePath('/admin/conversation-requests')
    revalidatePath('/admin')
    revalidatePath('/notifications')

    return { success: true, request }
  } catch (error) {
    logger.serverAction('Request conversation error', error)
    return { error: 'Failed to send request' }
  }
}

// Get all pending conversation requests (for admins)
export async function getPendingConversationRequests() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return { error: 'Unauthorized' }
  }

  try {
    const requests = await prisma.directMessageRequest.findMany({
      where: { status: 'PENDING' },
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            preferredName: true,
            image: true,
            role: true
          }
        },
        requested: {
          select: {
            id: true,
            name: true,
            preferredName: true,
            image: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return { requests }
  } catch (error) {
    logger.serverAction('Get requests error', error)
    return { error: 'Failed to get requests' }
  }
}

// Approve a conversation request
export async function approveConversationRequest(requestId: string) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return { error: 'Unauthorized' }
  }

  try {
    const request = await prisma.directMessageRequest.update({
      where: { id: requestId },
      data: {
        status: 'APPROVED',
        reviewedById: session.user.id
      },
      include: {
        requester: {
          select: {
            id: true,
            userCode: true,
            role: true,
            name: true,
            preferredName: true
          }
        },
        requested: {
          select: {
            id: true,
            userCode: true,
            role: true,
            name: true,
            preferredName: true
          }
        }
      }
    })

    let materializedMessageId: string | null = null
    const initialMessage = request.message?.trim()
    if (initialMessage) {
      const existingMessages = await prisma.directMessage.findFirst({
        where: {
          OR: [
            { senderId: request.requesterId, recipientId: request.requestedId },
            { senderId: request.requestedId, recipientId: request.requesterId }
          ]
        },
        select: { id: true }
      })

      if (!existingMessages) {
        const seededMessage = await prisma.directMessage.create({
          data: {
            senderId: request.requesterId,
            recipientId: request.requestedId,
            subject: 'Direct Message',
            content: initialMessage,
            read: false
          }
        })
        materializedMessageId = seededMessage.id

        const requesterName = request.requester.preferredName || request.requester.name || 'Someone'
        const preview = initialMessage.length > 80 ? `${initialMessage.slice(0, 80)}...` : initialMessage
        const requestedInboxBase = getInboxBasePathForRole(request.requested.role)
        await prisma.notification.create({
          data: {
            userId: request.requestedId,
            type: 'DIRECT_MESSAGE',
            title: `Message from ${requesterName}`,
            message: preview,
            link: `${requestedInboxBase}/inbox/${request.requester.userCode || request.requester.id}`,
            read: false
          }
        })
      }
    }

    // Notify requester
    await prisma.notification.create({
      data: {
        userId: request.requesterId,
        type: 'CONVERSATION_APPROVED',
        title: 'Conversation Request Approved',
        message: `You can now message ${request.requested.preferredName || request.requested.name}`,
        link: `${getInboxBasePathForRole(request.requester.role)}/inbox/${request.requested.userCode || request.requested.id}`,
        read: false
      }
    })

    // Send approval email
    const requester = await prisma.user.findUnique({
      where: { id: request.requesterId },
      select: { email: true, name: true, preferredName: true }
    })

    if (requester?.email) {
      await sendEmailWithRetry({
        to: requester.email,
        templateType: 'GROUP_ACCESS_APPROVED',
        variables: {
          name: requester.preferredName || requester.name || 'User',
          groupName: request.requested.preferredName || request.requested.name || 'User'
        }
      }, { userId: request.requesterId })
    }

    await prisma.auditLog.create({
      data: {
        action: 'CONVERSATION_REQUEST_APPROVED',
        details: JSON.stringify({
          requestId,
          requesterId: request.requesterId,
          requestedId: request.requestedId,
          reviewedById: session.user.id,
          initialMessageMaterialized: Boolean(materializedMessageId),
          materializedMessageId
        }),
        userId: session.user.id
      }
    })

    revalidatePath('/admin/conversation-requests')
    revalidatePath('/admin')
    revalidatePath('/notifications')
    revalidatePath('/staff/inbox')
    revalidatePath('/facilitator/inbox')
    revalidatePath('/board/inbox')
    revalidatePath('/volunteer/inbox')
    revalidatePath('/partner/inbox')

    return { success: true }
  } catch (error) {
    logger.serverAction('Approve request error', error)
    return { error: 'Failed to approve request' }
  }
}

// Deny a conversation request
export async function denyConversationRequest(requestId: string, note?: string) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return { error: 'Unauthorized' }
  }

  try {
    const request = await prisma.directMessageRequest.update({
      where: { id: requestId },
      data: {
        status: 'DENIED',
        reviewedById: session.user.id,
        reviewNote: note
      },
      include: {
        requester: {
          select: {
            id: true,
            role: true,
          }
        }
      }
    })

    // Notify requester
    await prisma.notification.create({
      data: {
        userId: request.requesterId,
        type: 'CONVERSATION_DENIED',
        title: 'Conversation Request Denied',
        message: note || 'Your conversation request was not approved',
        link: `${getInboxBasePathForRole(request.requester.role)}/inbox`,
        read: false
      }
    })

    // Send denial email
    const requester = await prisma.user.findUnique({
      where: { id: request.requesterId },
      select: { email: true, name: true, preferredName: true }
    })

    if (requester?.email) {
      await sendEmailWithRetry({
        to: requester.email,
        templateType: 'GROUP_ACCESS_DENIED',
        variables: {
          name: requester.preferredName || requester.name || 'User',
          groupName: 'this conversation',
          message: note || 'Your conversation request was not approved'
        }
      }, { userId: request.requesterId })
    }

    await prisma.auditLog.create({
      data: {
        action: 'CONVERSATION_REQUEST_DENIED',
        details: JSON.stringify({
          requestId,
          requesterId: request.requesterId,
          requestedId: request.requestedId,
          reviewedById: session.user.id,
          note: note?.trim() || null
        }),
        userId: session.user.id
      }
    })

    revalidatePath('/admin/conversation-requests')
    revalidatePath('/admin')
    revalidatePath('/notifications')

    return { success: true }
  } catch (error) {
    logger.serverAction('Deny request error', error)
    return { error: 'Failed to deny request' }
  }
}

// Check if user can message another user
export async function canMessageUser(userId: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { canMessage: false, reason: 'Not authenticated', requestStatus: 'NONE' as const }
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, status: true }
  })
  if (!target) {
    return { canMessage: false, reason: 'User not found', requestStatus: 'NONE' as const }
  }

  if (target.status !== 'ACTIVE') {
    return { canMessage: false, reason: 'User is not active', requestStatus: 'NONE' as const }
  }

  if (userId === session.user.id) {
    return { canMessage: false, reason: 'You cannot message yourself', requestStatus: 'NONE' as const }
  }

  const myRole = session.user.role as string
  const targetRole = target.role

  const decision = getDmDecision(myRole, targetRole)

  if (decision === 'allowed') {
    return { canMessage: true, requestStatus: 'NONE' as const }
  }

  const requests = await prisma.directMessageRequest.findMany({
    where: {
      OR: [
        { requesterId: session.user.id, requestedId: userId },
        { requesterId: userId, requestedId: session.user.id }
      ]
    },
    select: {
      id: true,
      requesterId: true,
      status: true,
      reviewNote: true,
      updatedAt: true
    },
    orderBy: { updatedAt: 'desc' }
  })

  if (requests.some((request) => request.status === 'APPROVED')) {
    return { canMessage: true, requestStatus: 'APPROVED' as const }
  }

  // Check if there's already a conversation (messages exist)
  const existingMessages = await prisma.directMessage.findFirst({
    where: {
      OR: [
        { senderId: session.user.id, recipientId: userId },
        { senderId: userId, recipientId: session.user.id }
      ]
    }
  })

  if (existingMessages) {
    return { canMessage: true, requestStatus: 'APPROVED' as const }
  }

  const pendingRequest = requests.find((request) => request.status === 'PENDING')
  if (pendingRequest) {
    const pendingReason =
      pendingRequest.requesterId === session.user.id
        ? 'Your request is pending admin approval'
        : 'A request is already pending admin approval'
    return { canMessage: false, reason: pendingReason, requestStatus: 'PENDING' as const }
  }

  const deniedRequest = requests.find((request) => request.status === 'DENIED' && request.requesterId === session.user.id)
  if (deniedRequest) {
    return {
      canMessage: false,
      reason: deniedRequest.reviewNote || 'A previous request was denied. You can submit a new request.',
      requestStatus: 'DENIED' as const
    }
  }

  return {
    canMessage: false,
    reason: 'Admin approval required before you can start this conversation',
    requestStatus: 'NONE' as const
  }
}
