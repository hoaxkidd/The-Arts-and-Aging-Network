'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

// Search users
export async function searchUsers(query: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Unauthorized" }
  }

  try {
    const andConditions: object[] = [
      { id: { not: session.user.id } },
      { status: 'ACTIVE' },
      {
        OR: [
          { name: { contains: query } },
          { preferredName: { contains: query } },
          { email: { contains: query } }
        ]
      }
    ]
    // HOME_ADMIN can only message administrators; restrict search to ADMIN role only
    if (session.user.role === 'HOME_ADMIN') {
      andConditions.push({ role: 'ADMIN' })
    }

    const users = await prisma.user.findMany({
      where: { AND: andConditions },
      select: {
        id: true,
        name: true,
        preferredName: true,
        email: true,
        role: true,
        image: true
      },
      take: 20,
      orderBy: { name: 'asc' }
    })

    return { success: true, data: users }
  } catch (error) {
    console.error("Failed to search users:", error)
    return { error: "Failed to search users" }
  }
}

// Send direct message (email relay)
export async function sendDirectMessage(data: {
  recipientId: string
  subject: string
  content: string
}) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Unauthorized" }
  }

  if (!data.subject?.trim() || !data.content?.trim()) {
    return { error: "Subject and message are required" }
  }

  try {
    // Create message
    const message = await prisma.directMessage.create({
      data: {
        senderId: session.user.id,
        recipientId: data.recipientId,
        subject: data.subject,
        content: data.content
      },
      include: {
        sender: {
          select: {
            name: true,
            preferredName: true,
            email: true
          }
        },
        recipient: {
          select: {
            name: true,
            preferredName: true,
            email: true
          }
        }
      }
    })

    // Create notification for recipient
    const senderName = message.sender.preferredName || message.sender.name || session.user.name
    await prisma.notification.create({
      data: {
        userId: data.recipientId,
        type: 'DIRECT_MESSAGE',
        title: `Message from ${senderName}`,
        message: data.subject,
        link: '/staff/inbox'
      }
    })

    // TODO: Send email notification (integrate with your email service)
    // For now, just mark as sent
    await prisma.directMessage.update({
      where: { id: message.id },
      data: { emailSent: true }
    })

    await prisma.auditLog.create({
      data: {
        action: 'DIRECT_MESSAGE_SENT',
        details: JSON.stringify({
          messageId: message.id,
          recipientId: data.recipientId,
          subject: data.subject
        }),
        userId: session.user.id
      }
    })

    revalidatePath('/staff/inbox')

    return { success: true, data: message }
  } catch (error) {
    console.error("Failed to send message:", error)
    return { error: "Failed to send message" }
  }
}

// Mark message as read
export async function markMessageAsRead(messageId: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Unauthorized" }
  }

  try {
    await prisma.directMessage.update({
      where: {
        id: messageId,
        recipientId: session.user.id
      },
      data: { read: true }
    })

    revalidatePath('/staff/inbox')

    return { success: true }
  } catch (error) {
    console.error("Failed to mark as read:", error)
    return { error: "Failed to mark as read" }
  }
}

// Delete message
export async function deleteMessage(messageId: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Unauthorized" }
  }

  try {
    // Can only delete if you're the recipient
    await prisma.directMessage.delete({
      where: {
        id: messageId,
        recipientId: session.user.id
      }
    })

    revalidatePath('/staff/inbox')

    return { success: true }
  } catch (error) {
    console.error("Failed to delete message:", error)
    return { error: "Failed to delete message" }
  }
}
