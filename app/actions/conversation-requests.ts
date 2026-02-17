'use server'

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { createNotification } from './notifications'

// Request to start a conversation with someone
export async function requestConversation(requestedId: string, message?: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Unauthorized' }
  }

  try {
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
    console.error('Request conversation error:', error)
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
    console.error('Get requests error:', error)
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
            name: true,
            preferredName: true
          }
        },
        requested: {
          select: {
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
      actionUrl: `/staff/inbox/${request.requestedId}`,
      metadata: JSON.stringify({ requestId: request.id })
    })

    revalidatePath('/admin/conversation-requests')
    revalidatePath('/staff/inbox')

    return { success: true }
  } catch (error) {
    console.error('Approve request error:', error)
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
            id: true
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
      actionUrl: '/staff/inbox',
      metadata: JSON.stringify({ requestId: request.id })
    })

    revalidatePath('/admin/conversation-requests')

    return { success: true }
  } catch (error) {
    console.error('Deny request error:', error)
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
    select: { role: true }
  })
  if (!target) {
    return { canMessage: false, reason: 'User not found' }
  }

  const myRole = session.user.role as string
  const targetRole = target.role

  // Admins can message anyone
  if (myRole === 'ADMIN') {
    return { canMessage: true }
  }

  // Anyone can message an admin (no approval required)
  if (targetRole === 'ADMIN') {
    return { canMessage: true }
  }

  // HOME_ADMIN can only message admins (already handled above if target is ADMIN)
  if (myRole === 'HOME_ADMIN') {
    return { canMessage: false, reason: 'Home admins can only message administrators' }
  }

  // Same role can message each other (e.g. payroll ↔ payroll)
  if (myRole === targetRole) {
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

  return { canMessage: false, reason: 'Admin approval required to start a conversation' }
}
