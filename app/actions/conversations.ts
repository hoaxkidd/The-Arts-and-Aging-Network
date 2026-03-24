'use server'

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { canMessageUser } from './conversation-requests'
import { logger } from '@/lib/logger'

// Get all conversations for current user
export async function getConversations() {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Unauthorized' }
  }

  try {
    // Get all messages where user is sender or recipient
    const messages = await prisma.directMessage.findMany({
      where: {
        OR: [
          { senderId: session.user.id },
          { recipientId: session.user.id }
        ]
      },
      include: {
        sender: {
          select: {
            id: true,
            userCode: true,
            name: true,
            preferredName: true,
            image: true,
            role: true
          }
        },
        recipient: {
          select: {
            id: true,
            userCode: true,
            name: true,
            preferredName: true,
            image: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Group messages by conversation partner
    const conversationsMap = new Map()

    messages.forEach(message => {
      const partner = message.senderId === session.user.id
        ? message.recipient
        : message.sender

      const partnerId = partner.userCode || partner.id

      if (!conversationsMap.has(partnerId)) {
        conversationsMap.set(partnerId, {
          partnerId,
          partner,
          lastMessage: message,
          unreadCount: 0,
          messages: []
        })
      }

      const conversation = conversationsMap.get(partnerId)
      conversation.messages.push(message)

      // Count unread messages (received by current user)
      if (message.recipientId === session.user.id && !message.read) {
        conversation.unreadCount++
      }
    })

    const conversations = Array.from(conversationsMap.values())
      .sort((a, b) => b.lastMessage.createdAt.getTime() - a.lastMessage.createdAt.getTime())

    return { conversations }
  } catch (error) {
    logger.serverAction('Get conversations error:', error)
    return { error: 'Failed to get conversations' }
  }
}

// Get conversation with a specific user
export async function getConversation(partnerIdentifier: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Unauthorized' }
  }

  try {
    // Get partner info
    const partner = await prisma.user.findFirst({
      where: {
        OR: [{ id: partnerIdentifier }, { userCode: partnerIdentifier }],
      },
      select: {
        id: true,
        userCode: true,
        name: true,
        preferredName: true,
        image: true,
        role: true,
        status: true
      }
    })

    if (!partner) {
      return { error: 'User not found' }
    }

    // Get all messages between current user and partner
    const messages = await prisma.directMessage.findMany({
      where: {
        OR: [
          { senderId: session.user.id, recipientId: partner.id },
          { senderId: partner.id, recipientId: session.user.id }
        ]
      },
      include: {
        sender: {
          select: {
            id: true,
            userCode: true,
            name: true,
            preferredName: true,
            image: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    })

    // Mark all received messages as read
    await prisma.directMessage.updateMany({
      where: {
        senderId: partner.id,
        recipientId: session.user.id,
        read: false
      },
      data: { read: true }
    })

    return { partner, messages }
  } catch (error) {
    logger.serverAction('Get conversation error:', error)
    return { error: 'Failed to get conversation' }
  }
}

// Send message in a conversation
export async function sendMessage(
  recipientId: string, 
  content: string,
  contentHtml?: string,
  attachments?: Array<{ name: string; url: string; type: string; size: number }>,
  replyToId?: string
) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Unauthorized' }
  }

  const permission = await canMessageUser(recipientId)
  if (!permission.canMessage) {
    return { error: permission.reason ?? 'You do not have permission to message this user' }
  }

  try {
    const message = await prisma.directMessage.create({
      data: {
        senderId: session.user.id,
        recipientId,
        subject: 'Direct Message',
        content,
        contentHtml: contentHtml || null,
        attachments: attachments ? JSON.stringify(attachments) : null,
        replyToId: replyToId || null,
        read: false
      },
      include: {
        sender: {
          select: {
            id: true,
            userCode: true,
            name: true,
            preferredName: true,
            image: true
          }
        }
      }
    })

    // Notify recipient
    const senderName = message.sender.preferredName || message.sender.name || 'Someone'
    const preview = content.length > 50 ? content.slice(0, 50) + '...' : content
    await prisma.notification.create({
      data: {
        userId: recipientId,
        type: 'DIRECT_MESSAGE',
        title: `Message from ${senderName}`,
        message: preview,
        link: `/staff/inbox/${message.sender.userCode || message.sender.id}`
      }
    })

    const recipient = await prisma.user.findUnique({
      where: { id: recipientId },
      select: { id: true, userCode: true },
    })

    revalidatePath('/staff/inbox')
    revalidatePath(`/staff/inbox/${recipient?.userCode || recipientId}`)

    return { success: true, message }
  } catch (error) {
    logger.serverAction('Send message error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to send message'
    return { error: errorMessage }
  }
}
