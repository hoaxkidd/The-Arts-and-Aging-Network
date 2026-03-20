'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

export async function setTyping(targetType: 'DIRECT' | 'GROUP', targetId: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Unauthorized" }
  }

  try {
    const existing = await prisma.userTyping.findUnique({
      where: {
        userId_targetType_targetId: {
          userId: session.user.id,
          targetType,
          targetId
        }
      }
    })

    if (existing) {
      await prisma.userTyping.update({
        where: { id: existing.id },
        data: { lastActive: new Date() }
      })
    } else {
      await prisma.userTyping.create({
        data: {
          userId: session.user.id,
          targetType,
          targetId,
          lastActive: new Date()
        }
      })
    }

    return { success: true }
  } catch (error) {
    console.error("Failed to set typing:", error)
    return { error: "Failed to set typing" }
  }
}

export async function clearTyping(targetType: 'DIRECT' | 'GROUP', targetId: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Unauthorized" }
  }

  try {
    await prisma.userTyping.deleteMany({
      where: {
        userId: session.user.id,
        targetType,
        targetId
      }
    })

    return { success: true }
  } catch (error) {
    console.error("Failed to clear typing:", error)
    return { error: "Failed to clear typing" }
  }
}

export async function getTypingUsers(targetType: 'DIRECT' | 'GROUP', targetId: string, excludeUserId: string) {
  try {
    const fiveSecondsAgo = new Date(Date.now() - 5000)
    
    const typing = await prisma.userTyping.findMany({
      where: {
        targetType,
        targetId,
        userId: { not: excludeUserId },
        lastActive: { gte: fiveSecondsAgo }
      },
      select: {
        userId: true
      }
    })

    const userIds = typing.map(t => t.userId)
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        name: true,
        preferredName: true
      }
    })

    const result = users.map(user => ({ user }))

    return { success: true, data: result }
  } catch (error) {
    console.error("Failed to get typing users:", error)
    return { error: "Failed to get typing users" }
  }
}
