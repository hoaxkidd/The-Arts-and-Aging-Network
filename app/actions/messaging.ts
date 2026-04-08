'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { logger } from "@/lib/logger"
import { Prisma } from "@prisma/client"

async function canModerateGroup(userId: string, role: string | undefined, groupId: string) {
  if (role === 'ADMIN') return true
  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
    select: { role: true, isActive: true }
  })
  return Boolean(membership?.isActive && membership.role === 'ADMIN')
}

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
  isAttachableToForms?: boolean
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
        isAttachableToForms: data.isAttachableToForms || false,
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
    logger.serverAction("Failed to create group:", error)
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
    logger.serverAction("Failed to request access:", error)
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
    revalidatePath('/admin/communication')
    revalidatePath('/staff/groups')

    return { success: true }
  } catch (error) {
    logger.serverAction("Failed to approve access:", error)
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
    revalidatePath('/admin/communication')
    revalidatePath('/staff/inbox')

    return { success: true }
  } catch (error) {
    logger.serverAction("Failed to deny access:", error)
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
    logger.serverAction("Failed to get groups:", error)
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
    logger.serverAction("Failed to get groups:", error)
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
    logger.serverAction("Failed to get pending requests:", error)
    return { error: "Failed to load pending requests" }
  }
}

// ============================================
// MESSAGING
// ============================================

// Send message to group
export async function sendGroupMessage(
  groupId: string, 
  content: string, 
  attachments?: string[],
  contentHtml?: string
) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Unauthorized" }
  }

  if (!content?.trim()) {
    return { error: "Message content is required" }
  }

  // Explicit validation for groupId
  if (!groupId) {
    logger.serverAction("[sendGroupMessage] Missing groupId")
    return { error: "Group ID is required" }
  }

  // Parse @mentions from content
  const mentionRegex = /@(\w+(?:\s\w+)*)/g
  const mentionedUsernames: string[] = []
  let match
  while ((match = mentionRegex.exec(content)) !== null) {
    mentionedUsernames.push(match[1])
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
      logger.warn('[sendGroupMessage] Permission denied:', { 
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

    // Find mentioned users by username or preferredName
    let mentionedUserIds: string[] = []
    if (mentionedUsernames.length > 0) {
      const mentionedUsers = await prisma.user.findMany({
        where: {
          OR: mentionedUsernames.map(name => ({
            OR: [
              { name: { equals: name, mode: 'insensitive' } },
              { preferredName: { equals: name, mode: 'insensitive' } }
            ]
          }))
        },
        select: { id: true }
      })
      mentionedUserIds = mentionedUsers.map(u => u.id)
    }

    const message = await prisma.groupMessage.create({
      data: {
        group: { connect: { id: groupId } },
        sender: { connect: { id: session.user.id } },
        content,
        contentHtml: contentHtml || null,
        attachments: attachments && attachments.length > 0 ? JSON.stringify(attachments) : null,
        mentions: mentionedUserIds.length > 0 ? JSON.stringify(mentionedUserIds) : null
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
      
      // Create notifications for all group members
      const notifications = otherMembers.map(m => {
        // Check if this user was mentioned
        const isMentioned = mentionedUserIds.includes(m.userId)
        return {
          userId: m.userId,
          type: isMentioned ? 'GROUP_MENTION' : 'GROUP_MESSAGE',
          title: isMentioned 
            ? `${senderName} mentioned you in ${group.name}`
            : `New message in ${group.name}`,
          message: isMentioned 
            ? content.slice(0, 100) 
            : `${senderName}: ${preview}`,
          link: `/staff/groups/${groupId}`,
          read: false
        }
      })
      
      await prisma.notification.createMany({ data: notifications })
    }

    revalidatePath(`/staff/groups/${groupId}`)
    revalidatePath('/staff/groups')

    return { success: true, data: message }
  } catch (error) {
    logger.serverAction("Failed to send message:", error)
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
    logger.serverAction("Failed to get messages:", error)
    return { error: "Failed to load messages" }
  }
}

// ============================================
// MEMBER MANAGEMENT
// ============================================

// Add member to group (Admin)
export async function addGroupMember(groupId: string, userId: string, role: string = 'MEMBER') {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Unauthorized" }
  }

  const canModerate = await canModerateGroup(session.user.id, session.user.role, groupId)
  if (!canModerate) {
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
    logger.serverAction("Failed to add member:", error)
    return { error: "Failed to add member" }
  }
}

// Remove member from group (Admin)
export async function removeGroupMember(groupId: string, userId: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Unauthorized" }
  }

  const canModerate = await canModerateGroup(session.user.id, session.user.role, groupId)
  if (!canModerate) {
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
    logger.serverAction("Failed to remove member:", error)
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
    logger.serverAction("Failed to leave group:", error)
    return { error: "Failed to leave group" }
  }
}

// Update member role (Admin)
export async function updateMemberRole(groupId: string, userId: string, role: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Unauthorized" }
  }

  const canModerate = await canModerateGroup(session.user.id, session.user.role, groupId)
  if (!canModerate) {
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
    logger.serverAction("Failed to update role:", error)
    return { error: "Failed to update role" }
  }
}

// Update group settings (Admin)
export async function updateMessageGroup(groupId: string, data: {
  name?: string
  description?: string
  allowAllStaff?: boolean
  isAttachableToForms?: boolean
  isActive?: boolean
}) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Unauthorized" }
  }

  const canModerate = await canModerateGroup(session.user.id, session.user.role, groupId)
  if (!canModerate) {
    return { error: "Unauthorized" }
  }

  if (session.user.role !== 'ADMIN' && (data.isAttachableToForms !== undefined || data.isActive !== undefined)) {
    return { error: 'Only platform admins can change form-attachment or archive state' }
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
    logger.serverAction("Failed to update group:", error)
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
    logger.serverAction("Failed to delete group:", error)
    return { error: "Failed to delete group" }
  }
}

// Attach a form template to a group (Admin)
export async function attachFormToGroup(data: {
  groupId: string
  formTemplateId: string
  minFacilitatorsRequired?: number
  autoFinalApproveWhenMinMet?: boolean
  rsvpDeadlineHours?: number
}) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    return { error: "Unauthorized" }
  }

  try {
    const attachment = await prisma.messageGroupForm.create({
      data: {
        groupId: data.groupId,
        formTemplateId: data.formTemplateId,
        minFacilitatorsRequired: data.minFacilitatorsRequired ?? 1,
        autoFinalApproveWhenMinMet: data.autoFinalApproveWhenMinMet ?? false,
        rsvpDeadlineHours: data.rsvpDeadlineHours ?? 48,
      }
    })

    revalidatePath(`/admin/messaging/${data.groupId}`)
    revalidatePath(`/admin/form-templates/${data.formTemplateId}/edit`)
    return { success: true, data: attachment }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "This form is already attached to the group." }
    }
    logger.serverAction("Failed to attach form to group:", error)
    return { error: "Failed to attach form to group" }
  }
}

// Remove form attachment from group (Admin)
export async function removeFormFromGroup(groupId: string, formTemplateId: string) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    return { error: "Unauthorized" }
  }

  try {
    await prisma.messageGroupForm.delete({
      where: {
        groupId_formTemplateId: { groupId, formTemplateId }
      }
    })

    revalidatePath(`/admin/messaging/${groupId}`)
    revalidatePath(`/admin/form-templates/${formTemplateId}/edit`)
    return { success: true }
  } catch (error) {
    logger.serverAction("Failed to remove form from group:", error)
    return { error: "Failed to remove form from group" }
  }
}

// Update form attachment settings (Admin)
export async function updateFormAttachment(data: {
  groupId: string
  formTemplateId: string
  minFacilitatorsRequired?: number
  autoFinalApproveWhenMinMet?: boolean
  rsvpDeadlineHours?: number
}) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    return { error: "Unauthorized" }
  }

  try {
    const updates: Record<string, unknown> = {}
    if (data.minFacilitatorsRequired !== undefined) {
      updates.minFacilitatorsRequired = Math.max(0, data.minFacilitatorsRequired)
    }
    if (data.autoFinalApproveWhenMinMet !== undefined) {
      updates.autoFinalApproveWhenMinMet = data.autoFinalApproveWhenMinMet
    }
    if (data.rsvpDeadlineHours !== undefined) {
      updates.rsvpDeadlineHours = Math.max(1, data.rsvpDeadlineHours)
    }

    await prisma.messageGroupForm.update({
      where: {
        groupId_formTemplateId: { groupId: data.groupId, formTemplateId: data.formTemplateId }
      },
      data: updates
    })

    revalidatePath(`/admin/messaging/${data.groupId}`)
    revalidatePath(`/admin/form-templates/${data.formTemplateId}/edit`)
    return { success: true }
  } catch (error) {
    logger.serverAction("Failed to update form attachment:", error)
    return { error: "Failed to update form attachment" }
  }
}

// Get groups attached to a form template (admin only)
export async function getGroupsAttachedToForm(formTemplateId: string) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") {
    return { error: "Unauthorized" }
  }

  try {
    const attachments = await prisma.messageGroupForm.findMany({
      where: {
        formTemplateId,
        isActive: true,
      },
      include: {
        group: {
          select: { id: true, name: true, iconEmoji: true, isActive: true },
        },
      },
    })
    return { success: true, data: attachments }
  } catch (error) {
    logger.serverAction("Failed to get groups attached to form:", error)
    return { error: "Failed to get groups attached to form" }
  }
}

// Get forms attached to a message group (admin only)
export async function getFormsAttachedToGroup(groupId: string) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") {
    return { error: "Unauthorized" }
  }

  try {
    const attachments = await prisma.messageGroupForm.findMany({
      where: {
        groupId,
        isActive: true,
      },
      include: {
        formTemplate: {
          select: { id: true, title: true, category: true, isActive: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })
    return { success: true, data: attachments }
  } catch (error) {
    logger.serverAction("Failed to get forms attached to group:", error)
    return { error: "Failed to get forms attached to group" }
  }
}

/** One round-trip for FormTemplateGroupLinksPanel (e.g. Access Control modal). Admin only. */
export async function getFormTemplateGroupLinksEditorData(formTemplateId: string) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") {
    return { error: "Unauthorized" as const }
  }

  try {
    const [attachmentRows, groups] = await Promise.all([
      prisma.messageGroupForm.findMany({
        where: { formTemplateId, isActive: true },
        include: {
          group: {
            select: { id: true, name: true, iconEmoji: true, isActive: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.messageGroup.findMany({
        where: { isActive: true },
        select: { id: true, name: true, iconEmoji: true, isAttachableToForms: true },
        orderBy: { name: "asc" },
      }),
    ])

    const attachments = attachmentRows.map((a) => ({
      groupId: a.groupId,
      group: a.group,
    }))

    return { success: true as const, data: { attachments, groups } }
  } catch (error) {
    logger.serverAction("Failed to load form template group links:", error)
    return { error: "Failed to load group links" as const }
  }
}
