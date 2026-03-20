'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

export async function updateOnlineStatus(isOnline: boolean) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Unauthorized" }
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        isOnline,
        lastSeenAt: new Date()
      }
    })

    return { success: true }
  } catch (error) {
    console.error("Failed to update online status:", error)
    return { error: "Failed to update status" }
  }
}

export async function getOnlineStatus(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        isOnline: true,
        lastSeenAt: true
      }
    })

    return { success: true, data: user }
  } catch (error) {
    console.error("Failed to get online status:", error)
    return { error: "Failed to get status" }
  }
}

export async function getOnlineUsers(userIds: string[]) {
  try {
    const users = await prisma.user.findMany({
      where: {
        id: { in: userIds }
      },
      select: {
        id: true,
        isOnline: true,
        lastSeenAt: true
      }
    })

    return { success: true, data: users }
  } catch (error) {
    console.error("Failed to get online users:", error)
    return { error: "Failed to get users" }
  }
}

export async function setUserPrivacy(settings: {
  showOnlineStatus?: boolean
  showLastSeen?: boolean
}) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Unauthorized" }
  }

  try {
    await prisma.userPrivacy.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        showOnlineStatus: settings.showOnlineStatus ?? true,
        showLastSeen: settings.showLastSeen ?? true
      },
      update: {
        showOnlineStatus: settings.showOnlineStatus,
        showLastSeen: settings.showLastSeen
      }
    })

    return { success: true }
  } catch (error) {
    console.error("Failed to set privacy:", error)
    return { error: "Failed to update privacy" }
  }
}

export async function getUserPrivacy() {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Unauthorized" }
  }

  try {
    let privacy = await prisma.userPrivacy.findUnique({
      where: { userId: session.user.id }
    })

    if (!privacy) {
      privacy = await prisma.userPrivacy.create({
        data: {
          userId: session.user.id,
          showOnlineStatus: true,
          showLastSeen: true
        }
      })
    }

    return { success: true, data: privacy }
  } catch (error) {
    console.error("Failed to get privacy:", error)
    return { error: "Failed to get privacy" }
  }
}
