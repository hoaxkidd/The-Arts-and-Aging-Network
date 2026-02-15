'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

// ============================================
// GROUP MANAGEMENT
// ============================================

// Create a message group (Admin only)
export async function createMessageGroup(data: {
  name: string
  description?: string
  type?: string
  iconEmoji?: string
  color?: string
  eventId?: string
  allowAllStaff?: boolean
  initialMembers?: string[] // User IDs
}) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    return { error: "Only admins can create message groups" }
  }

  if (!data.name?.trim()) {
    return { error: "Group name is required" }
  }

  try {
    const group = await prisma.messageGroup.create({
      data: {
        name: data.name,
        description: data.description || null,
        type: data.type || 'CUSTOM',
        iconEmoji: data.iconEmoji || '💬',
        color: data.color || 'blue',
        eventId: data.eventId || null,
        allowAllStaff: data.allowAllStaff || false,
        createdBy: session.user.id
      }
    })

    // Add initial members
    if (data.initialMembers && data.initialMembers.length > 0) {
      await Promise.all(
        data.initialMembers.map(userId =>
          prisma.groupMember.create({
            data: {
              groupId: group.id,
              userId,
              role: 'MEMBER'
            }
          })
        )
      )
    }

    // Always add creator as admin
    await prisma.groupMember.create({
      data: {
        groupId: group.id,
        userId: session.user.id,
        role: 'ADMIN',
        isActive: true
      }
    })

    await prisma.auditLog.create({
      data: {
        action: 'MESSAGE_GROUP_CREATED',
        details: JSON.stringify({ groupId: group.id, name: data.name }),
        userId: session.user.id
      }
    })

    revalidatePath('/admin/messaging')
    revalidatePath('/staff/groups')

    return { success: true, data: group }
  } catch (error) {
    console.error("Failed to create group:", error)
    return { error: "Failed to create message group" }
  }
}

// Request to join a group (Staff)
export async function requestGroupAccess(groupId: string, message?: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Unauthorized" }
  }

  try {
    const group = await prisma.messageGroup.findUnique({
      where: { id: groupId }
    })

    if (!group) {
      return { error: "Group not found" }
    }

    // Check if already a member
    const existingMember = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId: session.user.id
        }
      }
    })

    if (existingMember) {
      return { error: "Already a member or request pending" }
    }

    // If allowAllStaff, auto-approve
    if (group.allowAllStaff) {
      await prisma.groupMember.create({
        data: {
          groupId,
          userId: session.user.id,
          role: 'MEMBER',
          isActive: true
        }
      })

      revalidatePath('/staff/groups')
      return { success: true, autoApproved: true }
    }

    // Otherwise, notify admins for approval
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN', status: 'ACTIVE' }
    })

    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          type: 'GROUP_ACCESS_REQUEST',
          title: 'Group Access Request',
          message: `${session.user.name} wants to join "${group.name}"${message ? `: ${message}` : ''}`,
          link: `/admin/messaging/requests`
        }
      })
    }

    // Create pending member record
    await prisma.groupMember.create({
      data: {
        groupId,
        userId: session.user.id,
        role: 'MEMBER',
        isActive: false // Pending approval
      }
    })

    return { success: true, pending: true }
  } catch (error) {
    console.error("Failed to request access:", error)
    return { error: "Failed to request access" }
  }
}

// Approve group access request (Admin)
export async function approveGroupAccess(groupId: string, userId: string) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    return { error: "Unauthorized" }
  }

  try {
    await prisma.groupMember.update({
      where: {
        groupId_userId: {
          groupId,
          userId
        }
      },
      data: {
        isActive: true
      }
    })

    // Notify user
    const group = await prisma.messageGroup.findUnique({
      where: { id: groupId }
    })

    await prisma.notification.create({
      data: {
        userId,
        type: 'GROUP_ACCESS_APPROVED',
        title: 'Group Access Approved',
        message: `You can now access "${group?.name}"`,
        link: `/staff/groups/${groupId}`
      }
    })

    revalidatePath('/admin/messaging/requests')
    revalidatePath('/staff/groups')

    return { success: true }
  } catch (error) {
    console.error("Failed to approve access:", error)
    return { error: "Failed to approve access" }
  }
}

// Deny group access request (Admin)
export async function denyGroupAccess(groupId: string, userId: string) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    return { error: "Unauthorized" }
  }

  try {
    const group = await prisma.messageGroup.findUnique({
      where: { id: groupId },
      select: { name: true }
    })

    await prisma.groupMember.delete({
      where: {
        groupId_userId: {
          groupId,
          userId
        }
      }
    })

    // Notify the user that their request was denied
    await prisma.notification.create({
      data: {
        userId,
        type: 'GROUP_ACCESS_DENIED',
        title: 'Group Access Denied',
        message: `Your request to join "${group?.name}" was not approved.`,
        link: '/staff/inbox'
      }
    })

    revalidatePath('/admin/messaging/requests')
    revalidatePath('/staff/inbox')

    return { success: true }
  } catch (error) {
    console.error("Failed to deny access:", error)
    return { error: "Failed to deny access" }
  }
}

// Get groups user has access to
export async function getMyGroups() {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Unauthorized" }
  }

  try {
    const memberships = await prisma.groupMember.findMany({
      where: {
        userId: session.user.id,
        isActive: true
      },
      include: {
        group: {
          include: {
            members: {
              where: { isActive: true },
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    preferredName: true,
                    image: true,
                    role: true
                  }
                }
              }
            },
            messages: {
              take: 1,
              orderBy: { createdAt: 'desc' },
              include: {
                sender: {
                  select: {
                    id: true,
                    name: true,
                    preferredName: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { joinedAt: 'desc' }
    })

    const groups = memberships.map(m => ({
      ...m.group,
      myRole: m.role,
      lastMessage: m.group.messages[0] || null
    }))

    return { success: true, data: groups }
  } catch (error) {
    console.error("Failed to get groups:", error)
    return { error: "Failed to load groups" }
  }
}

// Get all groups (Admin)
export async function getAllGroups() {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    return { error: "Unauthorized" }
  }

  try {
    const groups = await prisma.messageGroup.findMany({
      where: { isActive: true },
      include: {
        members: {
          where: { isActive: true },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                role: true
              }
            }
          }
        },
        _count: {
          select: {
            messages: true,
            members: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return { success: true, data: groups }
  } catch (error) {
    console.error("Failed to get groups:", error)
    return { error: "Failed to load groups" }
  }
}

// Get pending access requests (Admin)
export async function getPendingAccessRequests() {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    return { error: "Unauthorized" }
  }

  try {
    const pendingRequests = await prisma.groupMember.findMany({
      where: {
        isActive: false
      },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            iconEmoji: true,
            color: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            preferredName: true,
            email: true,
            role: true,
            image: true
          }
        }
      },
      orderBy: { joinedAt: 'desc' }
    })

    return { success: true, data: pendingRequests }
  } catch (error) {
    console.error("Failed to get pending requests:", error)
    return { error: "Failed to load pending requests" }
  }
}

// ============================================
// MESSAGING
// ============================================

// Send message to group
export async function sendGroupMessage(groupId: string, content: string, attachments?: string[]) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Unauthorized" }
  }

  if (!content?.trim()) {
    return { error: "Message content is required" }
  }

  // Explicit validation for groupId
  if (!groupId) {
    console.error("[sendGroupMessage] Missing groupId")
    return { error: "Group ID is required" }
  }

  try {
    // Check membership
    const member = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId: session.user.id
        }
      }
    })

    // Admins can bypass membership check, otherwise enforce it
    const isAdmin = session.user.role === 'ADMIN'

    // Debug logging
    if (!isAdmin && (!member || !member.isActive)) {
      console.log('[sendGroupMessage] Permission denied:', { 
        userId: session.user.id, 
        role: session.user.role, 
        groupId, 
        isMember: !!member, 
        isActive: member?.isActive 
      })
      return { error: "Not a member of this group" }
    }

    if (member?.isMuted) {
      return { error: "You are muted in this group" }
    }

    const message = await prisma.groupMessage.create({
      data: {
        group: { connect: { id: groupId } },
        sender: { connect: { id: session.user.id } },
        content,
        attachments: attachments && attachments.length > 0 ? JSON.stringify(attachments) : null
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            preferredName: true,
            image: true
          }
        }
      }
    })

    // Update group timestamp
    await prisma.messageGroup.update({
      where: { id: groupId },
      data: { updatedAt: new Date() }
    })

    // Notify other active group members about the new message
    const otherMembers = await prisma.groupMember.findMany({
      where: {
        groupId,
        isActive: true,
        userId: { not: session.user.id }
      },
      select: { userId: true }
    })

    const group = await prisma.messageGroup.findUnique({
      where: { id: groupId },
      select: { name: true }
    })

    if (otherMembers.length > 0 && group) {
      const senderName = message.sender.preferredName || message.sender.name || 'Someone'
      const preview = content.length > 50 ? content.slice(0, 50) + '...' : content
      await prisma.notification.createMany({
        data: otherMembers.map(m => ({
          userId: m.userId,
          type: 'GROUP_MESSAGE',
          title: `New message in ${group.name}`,
          message: `${senderName}: ${preview}`,
          link: `/staff/groups/${groupId}`,
          read: false
        }))
      })
    }

    revalidatePath(`/staff/groups/${groupId}`)
    revalidatePath('/staff/groups')

    return { success: true, data: message }
  } catch (error) {
    console.error("Failed to send message:", error)
    // Return specific error message if available, otherwise generic
    const errorMessage = error instanceof Error ? error.message : "Failed to send message"
    return { error: errorMessage }
  }
}

// Get group messages
export async function getGroupMessages(groupId: string, limit = 50) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Unauthorized" }
  }

  try {
    // Check membership (admins can bypass)
    const isAdmin = session.user.role === 'ADMIN'
    const member = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId: session.user.id
        }
      }
    })

    if (!isAdmin && (!member || !member.isActive)) {
      return { error: "Not a member of this group" }
    }

    const messages = await prisma.groupMessage.findMany({
      where: { groupId },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            preferredName: true,
            image: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    })

    // Update last read timestamp (only if actual member)
    if (member) {
      await prisma.groupMember.update({
        where: {
          groupId_userId: {
            groupId,
            userId: session.user.id
          }
        },
        data: {
          lastReadAt: new Date()
        }
      })
    }

    return { success: true, data: messages.reverse() }
  } catch (error) {
    console.error("Failed to get messages:", error)
    return { error: "Failed to load messages" }
  }
}

// ============================================
// MEMBER MANAGEMENT
// ============================================

// Add member to group (Admin)
export async function addGroupMember(groupId: string, userId: string, role: string = 'MEMBER') {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    return { error: "Unauthorized" }
  }

  try {
    await prisma.groupMember.create({
      data: {
        groupId,
        userId,
        role,
        isActive: true
      }
    })

    // Notify user
    const group = await prisma.messageGroup.findUnique({ where: { id: groupId } })
    await prisma.notification.create({
      data: {
        userId,
        type: 'GROUP_ADDED',
        title: 'Added to Message Group',
        message: `You've been added to "${group?.name}"`,
        link: `/staff/groups/${groupId}`
      }
    })

    revalidatePath(`/admin/messaging/${groupId}`)
    revalidatePath('/staff/groups')

    return { success: true }
  } catch (error) {
    console.error("Failed to add member:", error)
    return { error: "Failed to add member" }
  }
}

// Remove member from group (Admin)
export async function removeGroupMember(groupId: string, userId: string) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    return { error: "Unauthorized" }
  }

  try {
    const group = await prisma.messageGroup.findUnique({
      where: { id: groupId },
      select: { name: true }
    })

    await prisma.groupMember.delete({
      where: {
        groupId_userId: { groupId, userId }
      }
    })

    // Notify the removed user
    await prisma.notification.create({
      data: {
        userId,
        type: 'GROUP_REMOVED',
        title: 'Removed from Group',
        message: `You have been removed from "${group?.name}".`,
        link: '/staff/inbox'
      }
    })

    revalidatePath(`/admin/messaging/${groupId}`)
    revalidatePath('/staff/groups')
    revalidatePath('/staff/inbox')

    return { success: true }
  } catch (error) {
    console.error("Failed to remove member:", error)
    return { error: "Failed to remove member" }
  }
}

// Leave group (any member)
export async function leaveGroup(groupId: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Unauthorized" }
  }

  try {
    const membership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: { groupId, userId: session.user.id }
      }
    })

    if (!membership) {
      return { error: "Not a member of this group" }
    }

    const group = await prisma.messageGroup.findUnique({
      where: { id: groupId },
      select: { name: true }
    })

    await prisma.groupMember.delete({
      where: {
        groupId_userId: { groupId, userId: session.user.id }
      }
    })

    // Notify admins that a member left
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN', status: 'ACTIVE' },
      select: { id: true }
    })

    if (admins.length > 0 && group) {
      await prisma.notification.createMany({
        data: admins.map(admin => ({
          userId: admin.id,
          type: 'GROUP_MEMBER_LEFT',
          title: 'Member Left Group',
          message: `${session.user.name} has left "${group.name}".`,
          link: `/admin/messaging/${groupId}`,
          read: false
        }))
      })
    }

    revalidatePath('/staff/inbox')
    revalidatePath('/staff/groups')

    return { success: true }
  } catch (error) {
    console.error("Failed to leave group:", error)
    return { error: "Failed to leave group" }
  }
}

// Update member role (Admin)
export async function updateMemberRole(groupId: string, userId: string, role: string) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    return { error: "Unauthorized" }
  }

  try {
    await prisma.groupMember.update({
      where: {
        groupId_userId: { groupId, userId }
      },
      data: { role }
    })

    revalidatePath(`/admin/messaging/${groupId}`)

    return { success: true }
  } catch (error) {
    console.error("Failed to update role:", error)
    return { error: "Failed to update role" }
  }
}

// Update group settings (Admin)
export async function updateMessageGroup(groupId: string, data: {
  name?: string
  description?: string
  allowAllStaff?: boolean
  isActive?: boolean
}) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    return { error: "Unauthorized" }
  }

  try {
    await prisma.messageGroup.update({
      where: { id: groupId },
      data
    })

    revalidatePath(`/admin/messaging/${groupId}`)
    revalidatePath('/admin/messaging')

    return { success: true }
  } catch (error) {
    console.error("Failed to update group:", error)
    return { error: "Failed to update group" }
  }
}

// Delete group (Admin)
export async function deleteMessageGroup(groupId: string) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    return { error: "Unauthorized" }
  }

  try {
    // Delete all messages
    await prisma.groupMessage.deleteMany({ where: { groupId } })
    
    // Delete all members
    await prisma.groupMember.deleteMany({ where: { groupId } })
    
    // Delete group
    await prisma.messageGroup.delete({ where: { id: groupId } })

    revalidatePath('/admin/messaging')

    return { success: true }
  } catch (error) {
    console.error("Failed to delete group:", error)
    return { error: "Failed to delete group" }
  }
}
