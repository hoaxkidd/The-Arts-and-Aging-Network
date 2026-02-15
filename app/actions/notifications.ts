'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

// Create a notification for a specific user
export async function createNotification(data: {
  userId: string
  type: string
  title: string
  message: string
  actionUrl?: string
  metadata?: string
}) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        link: data.actionUrl || null,
        read: false
      }
    })

    revalidatePath('/admin')
    revalidatePath('/staff')
    revalidatePath('/payroll')
    revalidatePath('/dashboard')

    return { success: true, notification }
  } catch (error) {
    console.error('Create notification error:', error)
    return { error: 'Failed to create notification' }
  }
}

// Get all notifications for current user (limited to latest 50)
export async function getMyNotifications() {
  const session = await auth()
  if (!session?.user?.id) return []

  return prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 50
  })
}

// Create a test notification (Development only)
export async function createTestNotification() {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized' }

  await prisma.notification.create({
    data: {
      userId: session.user.id,
      type: 'GENERAL',
      title: 'Test Notification',
      message: `This is a test notification generated at ${new Date().toLocaleTimeString()}`,
      read: false,
    }
  })
  
  revalidatePath('/payroll')
  revalidatePath('/admin')
  revalidatePath('/staff')
  revalidatePath('/dashboard')
  return { success: true }
}

// Get unread count for current user
export async function getMyUnreadCount() {
  const session = await auth()
  if (!session?.user?.id) return 0

  return prisma.notification.count({
    where: { userId: session.user.id, read: false }
  })
}

// Mark a notification as read
export async function markAsRead(notificationId: string) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized' }

  await prisma.notification.update({
    where: { id: notificationId },
    data: { read: true }
  })

  revalidatePath('/payroll')
  revalidatePath('/admin')
  revalidatePath('/staff')
  revalidatePath('/dashboard')
  return { success: true }
}

// Mark all notifications as read
export async function markAllAsRead() {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized' }

  await prisma.notification.updateMany({
    where: { userId: session.user.id, read: false },
    data: { read: true }
  })

  revalidatePath('/payroll')
  revalidatePath('/admin')
  revalidatePath('/staff')
  revalidatePath('/dashboard')
  return { success: true }
}

// Delete a notification
export async function deleteNotification(notificationId: string) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized' }

  await prisma.notification.delete({
    where: { id: notificationId }
  })

  revalidatePath('/payroll')
  revalidatePath('/admin')
  revalidatePath('/staff')
  revalidatePath('/dashboard')
  return { success: true }
}

// Clear all notifications for current user
export async function clearAllNotifications() {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized' }

  await prisma.notification.deleteMany({
    where: { userId: session.user.id }
  })

  revalidatePath('/payroll')
  revalidatePath('/admin')
  revalidatePath('/staff')
  revalidatePath('/dashboard')
  return { success: true }
}
