'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

/**
 * Edit a direct message (only within 15 minutes of sending)
 */
export async function editDirectMessage(messageId: string, newContent: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Unauthorized' }
  }

  if (!newContent.trim()) {
    return { error: 'Message cannot be empty' }
  }

  try {
    const message = await prisma.directMessage.findUnique({
      where: { id: messageId },
      select: { senderId: true, createdAt: true }
    })

    if (!message) {
      return { error: 'Message not found' }
    }

    // Check if user is the sender
    if (message.senderId !== session.user.id) {
      return { error: 'You can only edit your own messages' }
    }

    // Check if message is within 15 minutes
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000)
    if (message.createdAt < fifteenMinutesAgo) {
      return { error: 'Can only edit messages within 15 minutes of sending' }
    }

    const updatedMessage = await prisma.directMessage.update({
      where: { id: messageId },
      data: {
        content: newContent,
        editedAt: new Date()
      }
    })

    revalidatePath('/staff/inbox')
    return { success: true, message: updatedMessage }
  } catch (error) {
    console.error('Edit message error:', error)
    return { error: 'Failed to edit message' }
  }
}

/**
 * Delete a direct message (only within 15 minutes of sending)
 */
export async function deleteDirectMessage(messageId: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Unauthorized' }
  }

  try {
    const message = await prisma.directMessage.findUnique({
      where: { id: messageId },
      select: { senderId: true, createdAt: true }
    })

    if (!message) {
      return { error: 'Message not found' }
    }

    // Check if user is the sender
    if (message.senderId !== session.user.id) {
      return { error: 'You can only delete your own messages' }
    }

    // Check if message is within 15 minutes
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000)
    if (message.createdAt < fifteenMinutesAgo) {
      return { error: 'Can only delete messages within 15 minutes of sending' }
    }

    await prisma.directMessage.delete({
      where: { id: messageId }
    })

    revalidatePath('/staff/inbox')
    return { success: true }
  } catch (error) {
    console.error('Delete message error:', error)
    return { error: 'Failed to delete message' }
  }
}

/**
 * Edit a group message (only within 15 minutes of sending)
 */
export async function editGroupMessage(messageId: string, newContent: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Unauthorized' }
  }

  if (!newContent.trim()) {
    return { error: 'Message cannot be empty' }
  }

  try {
    const message = await prisma.groupMessage.findUnique({
      where: { id: messageId },
      select: { senderId: true, createdAt: true }
    })

    if (!message) {
      return { error: 'Message not found' }
    }

    // Check if user is the sender
    if (message.senderId !== session.user.id) {
      return { error: 'You can only edit your own messages' }
    }

    // Check if message is within 15 minutes
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000)
    if (message.createdAt < fifteenMinutesAgo) {
      return { error: 'Can only edit messages within 15 minutes of sending' }
    }

    const updatedMessage = await prisma.groupMessage.update({
      where: { id: messageId },
      data: {
        content: newContent,
        editedAt: new Date()
      }
    })

    revalidatePath('/staff/inbox')
    revalidatePath('/admin/messaging')
    return { success: true, message: updatedMessage }
  } catch (error) {
    console.error('Edit group message error:', error)
    return { error: 'Failed to edit message' }
  }
}

/**
 * Delete a group message (only within 15 minutes of sending)
 */
export async function deleteGroupMessage(messageId: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Unauthorized' }
  }

  try {
    const message = await prisma.groupMessage.findUnique({
      where: { id: messageId },
      select: { senderId: true, createdAt: true }
    })

    if (!message) {
      return { error: 'Message not found' }
    }

    // Check if user is the sender
    if (message.senderId !== session.user.id) {
      return { error: 'You can only delete your own messages' }
    }

    // Check if message is within 15 minutes
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000)
    if (message.createdAt < fifteenMinutesAgo) {
      return { error: 'Can only delete messages within 15 minutes of sending' }
    }

    // Delete reactions first, then the message
    await prisma.$transaction([
      prisma.messageReaction.deleteMany({
        where: { messageId }
      }),
      prisma.groupMessage.delete({
        where: { id: messageId }
      })
    ])

    revalidatePath('/staff/inbox')
    revalidatePath('/admin/messaging')
    return { success: true }
  } catch (error) {
    console.error('Delete group message error:', error)
    return { error: 'Failed to delete message' }
  }
}

/**
 * Add emoji reaction to a group message
 */
export async function addMessageReaction(messageId: string, emoji: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Unauthorized' }
  }

  try {
    // Check if user already reacted with this emoji
    const existing = await prisma.messageReaction.findFirst({
      where: {
        messageId,
        userId: session.user.id,
        emoji
      }
    })

    if (existing) {
      // Remove the reaction (toggle off)
      await prisma.messageReaction.delete({
        where: { id: existing.id }
      })
      revalidatePath('/staff/inbox')
      revalidatePath('/admin/messaging')
      return { success: true, removed: true }
    }

    // Add the reaction
    const reaction = await prisma.messageReaction.create({
      data: {
        messageId,
        userId: session.user.id,
        emoji
      }
    })

    revalidatePath('/staff/inbox')
    revalidatePath('/admin/messaging')
    return { success: true, reaction, removed: false }
  } catch (error) {
    console.error('Add reaction error:', error)
    return { error: 'Failed to add reaction' }
  }
}

/**
 * Get reactions for a message
 */
export async function getMessageReactions(messageId: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Unauthorized' }
  }

  try {
    const reactions = await prisma.messageReaction.findMany({
      where: { messageId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            preferredName: true
          }
        }
      }
    })

    // Group by emoji
    const groupedReactions = reactions.reduce((acc, reaction) => {
      if (!acc[reaction.emoji]) {
        acc[reaction.emoji] = {
          emoji: reaction.emoji,
          count: 0,
          users: [],
          hasCurrentUser: false
        }
      }
      acc[reaction.emoji].count++
      acc[reaction.emoji].users.push(reaction.user)
      if (reaction.userId === session.user.id) {
        acc[reaction.emoji].hasCurrentUser = true
      }
      return acc
    }, {} as Record<string, any>)

    return { success: true, reactions: Object.values(groupedReactions) }
  } catch (error) {
    console.error('Get reactions error:', error)
    return { error: 'Failed to get reactions' }
  }
}

/**
 * Auto-join a group if it allows all staff
 */
export async function autoJoinGroup(groupId: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Unauthorized' }
  }

  try {
    const group = await prisma.messageGroup.findUnique({
      where: { id: groupId },
      select: { allowAllStaff: true, isActive: true }
    })

    if (!group) {
      return { error: 'Group not found' }
    }

    if (!group.isActive) {
      return { error: 'Group is not active' }
    }

    if (!group.allowAllStaff) {
      return { error: 'This group does not allow auto-joining' }
    }

    // Check if already a member
    const existing = await prisma.groupMember.findFirst({
      where: {
        groupId,
        userId: session.user.id
      }
    })

    if (existing) {
      // Already a member, just ensure it's active
      if (!existing.isActive) {
        await prisma.groupMember.update({
          where: { id: existing.id },
          data: { isActive: true }
        })
      }
      return { success: true, alreadyMember: true }
    }

    // Create membership
    await prisma.groupMember.create({
      data: {
        groupId,
        userId: session.user.id,
        role: 'MEMBER'
      }
    })

    revalidatePath('/staff/inbox')
    revalidatePath('/admin/messaging')
    return { success: true, alreadyMember: false }
  } catch (error) {
    console.error('Auto-join group error:', error)
    return { error: 'Failed to join group' }
  }
}
