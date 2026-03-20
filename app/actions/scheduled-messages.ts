'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

export async function createScheduledMessage(data: {
  content: string
  contentHtml?: string
  targetType: 'DIRECT' | 'GROUP'
  targetId: string
  scheduledAt: Date
}) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Unauthorized" }
  }

  if (new Date(data.scheduledAt) <= new Date()) {
    return { error: "Scheduled time must be in the future" }
  }

  try {
    const message = await prisma.scheduledMessage.create({
      data: {
        senderId: session.user.id,
        content: data.content,
        contentHtml: data.contentHtml || null,
        targetType: data.targetType,
        targetId: data.targetId,
        scheduledAt: data.scheduledAt
      }
    })

    revalidatePath('/staff/inbox')
    revalidatePath('/staff/inbox/scheduled')

    return { success: true, data: message }
  } catch (error) {
    console.error("Failed to schedule message:", error)
    return { error: "Failed to schedule message" }
  }
}

export async function getScheduledMessages() {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Unauthorized" }
  }

  try {
    const messages = await prisma.scheduledMessage.findMany({
      where: {
        senderId: session.user.id,
        scheduledAt: { gte: new Date() }
      },
      orderBy: { scheduledAt: 'asc' }
    })

    const results = []
    for (const msg of messages) {
      if (msg.targetType === 'DIRECT') {
        const user = await prisma.user.findUnique({
          where: { id: msg.targetId },
          select: { name: true, preferredName: true }
        })
        results.push({
          ...msg,
          targetName: user?.preferredName || user?.name || 'Unknown'
        })
      } else {
        const group = await prisma.messageGroup.findUnique({
          where: { id: msg.targetId },
          select: { name: true }
        })
        results.push({
          ...msg,
          targetName: group?.name || 'Unknown Group'
        })
      }
    }

    return { success: true, data: results }
  } catch (error) {
    console.error("Failed to get scheduled messages:", error)
    return { error: "Failed to get scheduled messages" }
  }
}

export async function cancelScheduledMessage(id: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Unauthorized" }
  }

  try {
    const message = await prisma.scheduledMessage.findUnique({
      where: { id }
    })

    if (!message) {
      return { error: "Message not found" }
    }

    if (message.senderId !== session.user.id) {
      return { error: "Unauthorized" }
    }

    await prisma.scheduledMessage.delete({
      where: { id }
    })

    revalidatePath('/staff/inbox')
    revalidatePath('/staff/inbox/scheduled')

    return { success: true }
  } catch (error) {
    console.error("Failed to cancel scheduled message:", error)
    return { error: "Failed to cancel scheduled message" }
  }
}
