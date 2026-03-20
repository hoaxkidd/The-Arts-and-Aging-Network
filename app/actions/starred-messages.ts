'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

export async function starMessage(messageId: string, messageType: 'DIRECT' | 'GROUP') {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Unauthorized" }
  }

  try {
    // Check if already starred
    const existing = await prisma.starredMessage.findUnique({
      where: {
        userId_messageId: {
          userId: session.user.id,
          messageId
        }
      }
    })

    if (existing) {
      return { error: "Message already starred" }
    }

    await prisma.starredMessage.create({
      data: {
        userId: session.user.id,
        messageId,
        messageType
      }
    })

    revalidatePath('/staff/inbox')
    revalidatePath('/staff/inbox/starred')

    return { success: true }
  } catch (error) {
    console.error("Failed to star message:", error)
    return { error: "Failed to star message" }
  }
}

export async function unstarMessage(messageId: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Unauthorized" }
  }

  try {
    await prisma.starredMessage.deleteMany({
      where: {
        userId: session.user.id,
        messageId
      }
    })

    revalidatePath('/staff/inbox')
    revalidatePath('/staff/inbox/starred')

    return { success: true }
  } catch (error) {
    console.error("Failed to unstar message:", error)
    return { error: "Failed to unstar message" }
  }
}

export async function getStarredMessages() {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Unauthorized" }
  }

  try {
    const starred = await prisma.starredMessage.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' }
    })

    const results: Array<{
      id: string
      messageId: string
      messageType: string
      createdAt: Date
      content?: string
      senderName?: string
      conversationName?: string
      groupName?: string
    }> = []

    for (const star of starred) {
      if (star.messageType === 'DIRECT') {
        const message = await prisma.directMessage.findUnique({
          where: { id: star.messageId },
          include: {
            sender: { select: { name: true, preferredName: true } },
            recipient: { select: { name: true, preferredName: true } }
          }
        })
        if (message) {
          const otherUser = message.senderId === session.user.id 
            ? message.recipient 
            : message.sender
          results.push({
            id: star.id,
            messageId: star.messageId,
            messageType: star.messageType,
            createdAt: star.createdAt,
            content: message.content,
            senderName: message.sender.preferredName || message.sender.name || undefined,
            conversationName: otherUser.preferredName || otherUser.name || undefined
          })
        }
      } else {
        const message = await prisma.groupMessage.findUnique({
          where: { id: star.messageId },
          include: {
            sender: { select: { name: true, preferredName: true } },
            group: { select: { name: true } }
          }
        })
        if (message) {
          results.push({
            id: star.id,
            messageId: star.messageId,
            messageType: star.messageType,
            createdAt: star.createdAt,
            content: message.content,
            senderName: message.sender.preferredName || message.sender.name || undefined,
            groupName: message.group.name
          })
        }
      }
    }

    return { success: true, data: results }
  } catch (error) {
    console.error("Failed to get starred messages:", error)
    return { error: "Failed to get starred messages" }
  }
}

export async function isMessageStarred(messageId: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Unauthorized" }
  }

  try {
    const starred = await prisma.starredMessage.findUnique({
      where: {
        userId_messageId: {
          userId: session.user.id,
          messageId
        }
      }
    })

    return { success: true, isStarred: !!starred }
  } catch (error) {
    return { success: true, isStarred: false }
  }
}
