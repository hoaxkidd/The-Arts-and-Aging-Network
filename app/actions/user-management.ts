'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"

/**
 * Delete a user (Admin only)
 */
export async function deleteUser(userId: string) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    return { error: 'Unauthorized' }
  }

  // Prevent admins from deleting themselves
  if (session.user.id === userId) {
    return { error: 'Cannot delete your own account' }
  }

  try {
    // Check if user exists
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      return { error: 'User not found' }
    }

    // Delete related records first (cascade delete)
    await prisma.$transaction([
      // Delete notifications
      prisma.notification.deleteMany({ where: { userId } }),
      // Delete direct messages sent/received
      prisma.directMessage.deleteMany({ where: { OR: [{ senderId: userId }, { recipientId: userId }] } }),
      // Delete conversation requests
      prisma.directMessageRequest.deleteMany({
        where: {
          OR: [
            { requesterId: userId },
            { requestedId: userId }
          ]
        }
      }),
      // Delete group messages sent
      prisma.groupMessage.deleteMany({ where: { senderId: userId } }),
      // Delete group memberships
      prisma.groupMember.deleteMany({ where: { userId } }),
      // Finally delete the user
      prisma.user.delete({ where: { id: userId } })
    ])

    revalidatePath('/admin/users')
    return { success: true, message: 'User deleted successfully' }
  } catch (error) {
    console.error('Delete user error:', error)
    return { error: 'Failed to delete user' }
  }
}

/**
 * Update user details (Admin only)
 */
export async function updateUser(userId: string, data: {
  name?: string
  email?: string
  role?: string
  status?: string
  password?: string
}) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    return { error: 'Unauthorized' }
  }

  try {
    const updateData: any = {}

    if (data.name) updateData.name = data.name
    if (data.email) {
      // Check if email is already taken
      const existing = await prisma.user.findFirst({
        where: {
          email: data.email,
          NOT: { id: userId }
        }
      })
      if (existing) {
        return { error: 'Email already in use' }
      }
      updateData.email = data.email
    }
    if (data.role) updateData.role = data.role
    if (data.status) updateData.status = data.status
    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10)
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData
    })

    revalidatePath('/admin/users')
    revalidatePath(`/admin/users/${userId}`)
    return { success: true, user }
  } catch (error) {
    console.error('Update user error:', error)
    return { error: 'Failed to update user' }
  }
}

/**
 * Toggle user status between ACTIVE and INACTIVE
 */
export async function toggleUserStatus(userId: string) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    return { error: 'Unauthorized' }
  }

  // Prevent admins from deactivating themselves
  if (session.user.id === userId) {
    return { error: 'Cannot deactivate your own account' }
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      return { error: 'User not found' }
    }

    const newStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { status: newStatus }
    })

    revalidatePath('/admin/users')
    return { success: true, user: updatedUser }
  } catch (error) {
    console.error('Toggle status error:', error)
    return { error: 'Failed to toggle user status' }
  }
}

/**
 * Search users by name or email
 */
export async function searchUsers(query: string) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    return { error: 'Unauthorized' }
  }

  try {
    const normalizedQuery = query.toLowerCase()
    const users = await prisma.user.findMany({
      where: {
        AND: [
          { email: { not: null } },
          {
            OR: [
              { name: { contains: normalizedQuery } },
              { email: { contains: normalizedQuery } }
            ]
          }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    })

    return { success: true, users }
  } catch (error) {
    console.error('Search users error:', error)
    return { error: 'Failed to search users' }
  }
}

/**
 * Get user statistics
 */
export async function getUserStats() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    return { error: 'Unauthorized' }
  }

  try {
    const [total, active, inactive, byRole] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: 'ACTIVE' } }),
      prisma.user.count({ where: { status: 'INACTIVE' } }),
      prisma.user.groupBy({
        by: ['role'],
        _count: { role: true }
      })
    ])

    return {
      success: true,
      stats: {
        total,
        active,
        inactive,
        byRole: byRole.reduce((acc, { role, _count }) => {
          acc[role] = _count.role
          return acc
        }, {} as Record<string, number>)
      }
    }
  } catch (error) {
    console.error('Get user stats error:', error)
    return { error: 'Failed to get user statistics' }
  }
}
