'use server'

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { createNotification } from './notifications'
import { sendEmailWithRetry } from '@/lib/email/service'
import { logger } from '@/lib/logger'
import { getDmDecision } from '@/lib/dm-permissions'
import { getInboxBasePathForRole } from '@/lib/role-routes'

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
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN', status: 'ACTIVE' },
      select: { id: true }
    })

    for (const admin of admins) {
      await createNotification({
        userId: admin.id,
        type: 'CONVERSATION_REQUEST',
        title: 'New Conversation Request',
        message: `${request.requester.preferredName || request.requester.name} wants to start a conversation`,
        actionUrl: '/admin/conversation-requests',
        metadata: JSON.stringify({ requestId: request.id })
      })
    }

    revalidatePath('/admin/conversation-requests')

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
            role: true,
            name: true,
            preferredName: true
          }
        },
        requested: {
          select: {
            id: true,
            userCode: true,
            name: true,
            preferredName: true
          }
        }
      }
    })

    // Notify requester
    await createNotification({
      userId: request.requesterId,
      type: 'CONVERSATION_APPROVED',
      title: 'Conversation Request Approved',
      message: `You can now message ${request.requested.preferredName || request.requested.name}`,
      actionUrl: `${getInboxBasePathForRole(request.requester.role)}/inbox/${request.requested.userCode || request.requested.id}`,
      metadata: JSON.stringify({ requestId: request.id })
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

    revalidatePath('/admin/conversation-requests')
    revalidatePath('/staff/inbox')
    revalidatePath('/facilitator/inbox')
    revalidatePath('/board/inbox')
    revalidatePath('/volunteer/inbox')

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
    await createNotification({
      userId: request.requesterId,
      type: 'CONVERSATION_DENIED',
      title: 'Conversation Request Denied',
      message: note || 'Your conversation request was not approved',
      actionUrl: `${getInboxBasePathForRole(request.requester.role)}/inbox`,
      metadata: JSON.stringify({ requestId: request.id })
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

    revalidatePath('/admin/conversation-requests')

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
    return { canMessage: false, reason: 'Not authenticated' }
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, status: true }
  })
  if (!target) {
    return { canMessage: false, reason: 'User not found' }
  }

  if (target.status !== 'ACTIVE') {
    return { canMessage: false, reason: 'User is not active' }
  }

  if (userId === session.user.id) {
    return { canMessage: false, reason: 'You cannot message yourself' }
  }

  const myRole = session.user.role as string
  const targetRole = target.role

  const decision = getDmDecision(myRole, targetRole)

  if (decision === 'allowed') {
    return { canMessage: true }
  }

  // Check if there's an approved request
  const approvedRequest = await prisma.directMessageRequest.findFirst({
    where: {
      OR: [
        { requesterId: session.user.id, requestedId: userId, status: 'APPROVED' },
        { requesterId: userId, requestedId: session.user.id, status: 'APPROVED' }
      ]
    }
  })

  if (approvedRequest) {
    return { canMessage: true }
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
    return { canMessage: true }
  }

  return { canMessage: false, reason: 'Admin approval required before you can start this conversation' }
}
