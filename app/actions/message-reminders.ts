'use server'

import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

export async function createMessageReminder(data: {
  messageId: string
  messageType: 'DIRECT' | 'GROUP'
  remindAt: Date
  note?: string
}) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Unauthorized" }
  }

  try {
    const reminder = await prisma.messageReminder.create({
      data: {
        userId: session.user.id,
        messageId: data.messageId,
        messageType: data.messageType,
        remindAt: data.remindAt,
        note: data.note || null
      }
    })

    revalidatePath('/staff/inbox')
    revalidatePath('/staff/inbox/reminders')

    return { success: true, data: reminder }
  } catch (error) {
    logger.serverAction("Failed to create reminder:", error)
    return { error: "Failed to create reminder" }
  }
}

export async function getMessageReminders() {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Unauthorized" }
  }

  try {
    const reminders = await prisma.messageReminder.findMany({
      where: {
        userId: session.user.id,
        isCompleted: false,
        remindAt: { gte: new Date() }
      },
      orderBy: { remindAt: 'asc' }
    })

    const results: Array<{
      id: string
      messageId: string
      messageType: string
      remindAt: Date
      note: string | null
      content?: string
      senderName?: string
      conversationName?: string
      groupName?: string
    }> = []

    for (const reminder of reminders) {
      if (reminder.messageType === 'DIRECT') {
        const message = await prisma.directMessage.findUnique({
          where: { id: reminder.messageId },
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
            id: reminder.id,
            messageId: reminder.messageId,
            messageType: reminder.messageType,
            remindAt: reminder.remindAt,
            note: reminder.note,
            content: message.content,
            senderName: message.sender.preferredName || message.sender.name || undefined,
            conversationName: otherUser.preferredName || otherUser.name || undefined
          })
        }
      } else {
        const message = await prisma.groupMessage.findUnique({
          where: { id: reminder.messageId },
          include: {
            sender: { select: { name: true, preferredName: true } },
            group: { select: { name: true } }
          }
        })
        if (message) {
          results.push({
            id: reminder.id,
            messageId: reminder.messageId,
            messageType: reminder.messageType,
            remindAt: reminder.remindAt,
            note: reminder.note,
            content: message.content,
            senderName: message.sender.preferredName || message.sender.name || undefined,
            groupName: message.group.name
          })
        }
      }
    }

    return { success: true, data: results }
  } catch (error) {
    logger.serverAction("Failed to get reminders:", error)
    return { error: "Failed to get reminders" }
  }
}

export async function completeReminder(id: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Unauthorized" }
  }

  try {
    await prisma.messageReminder.update({
      where: { id },
      data: { isCompleted: true }
    })

    revalidatePath('/staff/inbox')
    revalidatePath('/staff/inbox/reminders')

    return { success: true }
  } catch (error) {
    logger.serverAction("Failed to complete reminder:", error)
    return { error: "Failed to complete reminder" }
  }
}

export async function deleteReminder(id: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Unauthorized" }
  }

  try {
    await prisma.messageReminder.delete({
      where: { id }
    })

    revalidatePath('/staff/inbox')
    revalidatePath('/staff/inbox/reminders')

    return { success: true }
  } catch (error) {
    logger.serverAction("Failed to delete reminder:", error)
    return { error: "Failed to delete reminder" }
  }
}

export async function getUpcomingReminders() {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Unauthorized" }
  }

  try {
    const reminders = await prisma.messageReminder.findMany({
      where: {
        userId: session.user.id,
        isCompleted: false,
        remindAt: { gte: new Date() }
      },
      orderBy: { remindAt: 'asc' },
      take: 5
    })

    return { success: true, data: reminders }
  } catch (error) {
    logger.serverAction("Failed to get upcoming reminders:", error)
    return { error: "Failed to get reminders" }
  }
}
