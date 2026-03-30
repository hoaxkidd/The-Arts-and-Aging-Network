'use server'

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import type { PrismaClient } from "@prisma/client"
import { logger } from "@/lib/logger"
import {
  deleteFromR2,
  extractR2KeyFromUrl,
  getFileExtension,
  getR2Diagnostics,
  R2ConfigurationError,
  uploadToR2,
} from "@/lib/r2"

// Type-safe prisma client reference
const db = prisma as PrismaClient & Record<string, unknown>

function revalidateEventPaths(eventId: string) {
  revalidatePath(`/events/${eventId}`)
  revalidatePath(`/dashboard/my-events/${eventId}`)
  revalidatePath(`/staff/events/${eventId}`)
}

async function canAccessEventCommunity(eventId: string, userId: string, role?: string | null): Promise<boolean> {
  if (role === 'ADMIN' || role === 'PAYROLL') return true

  const checkedInAttendance = await db.eventAttendance.findUnique({
    where: {
      eventId_userId: {
        eventId,
        userId,
      },
    },
    select: { checkInTime: true },
  })

  if (checkedInAttendance?.checkInTime) return true

  if (role === 'HOME_ADMIN') {
    const home = await db.geriatricHome.findUnique({
      where: { userId },
      select: { id: true },
    })

    if (!home) return false

    const approvedRequest = await db.eventRequest.findFirst({
      where: {
        geriatricHomeId: home.id,
        status: 'APPROVED',
        OR: [
          { existingEventId: eventId },
          { approvedEventId: eventId },
        ],
      },
      select: { id: true },
    })

    return !!approvedRequest
  }

  return false
}

// Helper to create notification
async function createNotification(
  userId: string,
  type: string,
  title: string,
  message: string,
  link?: string
) {
  try {
    await db.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        link,
        read: false
      }
    })
  } catch (error) {
    logger.serverAction('Error creating notification:', error)
  }
}

// ============ COMMENTS ============

export async function addComment(
  eventId: string,
  content: string,
  parentId?: string
) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Not authenticated' }
  }

  try {
    const canAccess = await canAccessEventCommunity(eventId, session.user.id, session.user.role)
    if (!canAccess) {
      return { error: 'Not authorized to participate in event discussion' }
    }

    const comment = await db.eventComment.create({
      data: {
        eventId,
        userId: session.user.id,
        content,
        parentId: parentId || null
      },
      include: {
        user: { select: { id: true, name: true, image: true, role: true } },
        reactions: true,
        replies: {
          include: {
            user: { select: { id: true, name: true, image: true, role: true } },
            reactions: true
          }
        }
      }
    })

    // Send notification if this is a reply
    if (parentId) {
      const parentComment = await db.eventComment.findUnique({
        where: { id: parentId },
        include: {
          user: { select: { id: true, name: true } },
          event: { select: { id: true, title: true } }
        }
      })

      if (parentComment && parentComment.userId !== session.user.id) {
        const commenterName = comment.user.name || 'Someone'
        await createNotification(
          parentComment.userId,
          'COMMENT_REPLY',
          'New Reply to Your Comment',
          `${commenterName} replied to your comment on "${parentComment.event.title}"`,
          `/events/${eventId}`
        )
      }
    }

    revalidateEventPaths(eventId)

    return { data: comment }
  } catch (error) {
    logger.serverAction('Error adding comment:', error)
    return { error: 'Failed to add comment' }
  }
}

export async function editComment(commentId: string, content: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Not authenticated' }
  }

  try {
    const comment = await db.eventComment.findUnique({
      where: { id: commentId },
      select: { userId: true, eventId: true }
    })

    if (!comment) {
      return { error: 'Comment not found' }
    }

    const canAccess = await canAccessEventCommunity(comment.eventId, session.user.id, session.user.role)
    if (!canAccess) {
      return { error: 'Not authorized to edit this comment' }
    }

    // Only owner can edit their comment
    if (comment.userId !== session.user.id) {
      return { error: 'Not authorized to edit this comment' }
    }

    const updated = await db.eventComment.update({
      where: { id: commentId },
      data: { content, updatedAt: new Date() },
      include: {
        user: { select: { id: true, name: true, image: true, role: true } },
        reactions: true
      }
    })

    revalidateEventPaths(comment.eventId)

    return { data: updated }
  } catch (error) {
    logger.serverAction('Error editing comment:', error)
    return { error: 'Failed to edit comment' }
  }
}

export async function deleteComment(commentId: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Not authenticated' }
  }

  try {
    const comment = await db.eventComment.findUnique({
      where: { id: commentId },
      select: { userId: true, eventId: true }
    })

    if (!comment) {
      return { error: 'Comment not found' }
    }

    const canAccess = await canAccessEventCommunity(comment.eventId, session.user.id, session.user.role)
    if (!canAccess) {
      return { error: 'Not authorized to delete this comment' }
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    // Only owner or admin can delete
    if (comment.userId !== session.user.id && user?.role !== 'ADMIN') {
      return { error: 'Not authorized to delete this comment' }
    }

    // Delete all replies first
    await db.eventComment.deleteMany({
      where: { parentId: commentId }
    })

    // Delete the comment
    await db.eventComment.delete({
      where: { id: commentId }
    })

    revalidateEventPaths(comment.eventId)

    return { success: true }
  } catch (error) {
    logger.serverAction('Error deleting comment:', error)
    return { error: 'Failed to delete comment' }
  }
}

export async function getEventComments(eventId: string) {
  try {
    const comments = await db.eventComment.findMany({
      where: {
        eventId,
        parentId: null // Only top-level comments
      },
      include: {
        user: { select: { id: true, name: true, image: true, role: true } },
        reactions: {
          include: {
            user: { select: { id: true, name: true } }
          }
        },
        replies: {
          include: {
            user: { select: { id: true, name: true, image: true, role: true } },
            reactions: {
              include: {
                user: { select: { id: true, name: true } }
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return { data: comments }
  } catch (error) {
    logger.serverAction('Error getting comments:', error)
    return { error: 'Failed to load comments' }
  }
}

// ============ REACTIONS ============

export async function toggleReaction(
  type: 'LIKE' | 'HEART' | 'DOWNVOTE',
  commentId?: string,
  photoId?: string
) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Not authenticated' }
  }

  if (!commentId && !photoId) {
    return { error: 'Must provide commentId or photoId' }
  }

  try {
    // Check for existing reaction
    const existingReaction = await db.eventReaction.findFirst({
      where: {
        userId: session.user.id,
        ...(commentId ? { commentId } : { photoId })
      }
    })

    // Helper to get eventId for revalidation
    let eventId: string | null = null
    if (commentId) {
      const comment = await db.eventComment.findUnique({
        where: { id: commentId },
        select: { eventId: true }
      })
      eventId = comment?.eventId ?? null
    } else if (photoId) {
      const photo = await db.eventPhoto.findUnique({
        where: { id: photoId },
        select: { eventId: true }
      })
      eventId = photo?.eventId ?? null
    }

    const revalidate = () => {
      if (eventId) {
        revalidateEventPaths(eventId)
      }
    }

    if (!eventId) {
      return { error: 'Unable to locate event for reaction' }
    }

    const canAccess = await canAccessEventCommunity(eventId, session.user.id, session.user.role)
    if (!canAccess) {
      return { error: 'Not authorized to react in this event' }
    }

    if (existingReaction) {
      if (existingReaction.type === type) {
        // Same type - remove reaction
        await db.eventReaction.delete({
          where: { id: existingReaction.id }
        })
        revalidate()
        return { data: { action: 'removed', type } }
      } else {
        // Different type - update reaction
        await db.eventReaction.update({
          where: { id: existingReaction.id },
          data: { type }
        })
        revalidate()
        return { data: { action: 'changed', type, from: existingReaction.type } }
      }
    }

    // Create new reaction
    await db.eventReaction.create({
      data: {
        userId: session.user.id,
        type,
        commentId: commentId || null,
        photoId: photoId || null
      }
    })

    // Get current user's name for notification
    const currentUser = await db.user.findUnique({
      where: { id: session.user.id },
      select: { name: true }
    })
    const reactorName = currentUser?.name || 'Someone'

    // Send notification for comment reaction
    if (commentId) {
      const comment = await db.eventComment.findUnique({
        where: { id: commentId },
        include: {
          user: { select: { id: true } },
          event: { select: { id: true, title: true } }
        }
      })

      if (comment && comment.userId !== session.user.id) {
        const reactionEmoji = type === 'LIKE' ? '👍' : type === 'HEART' ? '❤️' : '👎'
        const reactionText = type === 'LIKE' ? 'liked' : type === 'HEART' ? 'loved' : 'reacted to'
        await createNotification(
          comment.userId,
          'COMMENT_REACTION',
          `${reactionEmoji} ${reactorName} ${reactionText} your comment`,
          `Your comment on "${comment.event.title}" received a reaction`,
          `/events/${comment.eventId}`
        )
      }
    }

    // Send notification for photo reaction
    if (photoId) {
      const photo = await db.eventPhoto.findUnique({
        where: { id: photoId },
        include: {
          uploader: { select: { id: true } },
          event: { select: { id: true, title: true } }
        }
      })

      if (photo && photo.uploaderId !== session.user.id) {
        const reactionEmoji = type === 'LIKE' ? '👍' : type === 'HEART' ? '❤️' : '👎'
        const reactionText = type === 'LIKE' ? 'liked' : type === 'HEART' ? 'loved' : 'reacted to'
        await createNotification(
          photo.uploaderId,
          'PHOTO_REACTION',
          `${reactionEmoji} ${reactorName} ${reactionText} your photo`,
          `Your photo on "${photo.event.title}" received a reaction`,
          `/events/${photo.eventId}`
        )
      }
    }

    revalidate()
    return { data: { action: 'added', type } }
  } catch (error) {
    logger.serverAction('Error toggling reaction:', error)
    return { error: 'Failed to update reaction' }
  }
}

// ============ PHOTOS ============

export async function addEventPhoto(
  eventId: string,
  url: string,
  caption?: string
) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Not authenticated' }
  }

  try {
    const canAccess = await canAccessEventCommunity(eventId, session.user.id, session.user.role)
    if (!canAccess) {
      return { error: 'Not authorized to upload photos for this event' }
    }

    const photo = await db.eventPhoto.create({
      data: {
        eventId,
        uploaderId: session.user.id,
        url,
        caption: caption || null
      },
      include: {
        uploader: { select: { id: true, name: true, image: true } },
        reactions: true
      }
    })

    revalidateEventPaths(eventId)

    return { data: photo }
  } catch (error) {
    logger.serverAction('Error adding photo:', error)
    return { error: 'Failed to add photo' }
  }
}

export async function deleteEventPhoto(photoId: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Not authenticated' }
  }

  try {
    const photo = await db.eventPhoto.findUnique({
      where: { id: photoId },
      select: { uploaderId: true, eventId: true, url: true }
    })

    if (!photo) {
      return { error: 'Photo not found' }
    }

    const userRole = session.user.role

    const canAccess = await canAccessEventCommunity(photo.eventId, session.user.id, userRole)
    if (!canAccess) {
      return { error: 'Not authorized to delete this photo' }
    }

    // Only uploader or admin can delete
    if (photo.uploaderId !== session.user.id && userRole !== 'ADMIN' && userRole !== 'PAYROLL') {
      return { error: 'Not authorized to delete this photo' }
    }

    await db.eventPhoto.delete({
      where: { id: photoId }
    })

    const key = extractR2KeyFromUrl(photo.url)
    if (key) {
      try {
        await deleteFromR2(key)
      } catch (error) {
        logger.upload('Failed to delete event photo from R2', { photoId, key, error })
      }
    }

    revalidateEventPaths(photo.eventId)

    return { success: true }
  } catch (error) {
    logger.serverAction('Error deleting photo:', error)
    return { error: 'Failed to delete photo' }
  }
}

export async function uploadEventPhoto(formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Not authenticated' }
  }

  const eventId = String(formData.get('eventId') || '')
  const file = formData.get('photo') as File | null
  const captionInput = String(formData.get('caption') || '').trim()

  if (!eventId) {
    return { error: 'Missing event ID' }
  }

  if (!file || file.size === 0) {
    return { error: 'No file selected' }
  }

  if (!file.type.startsWith('image/')) {
    return { error: 'Only image files are allowed' }
  }

  const maxBytes = 5 * 1024 * 1024
  if (file.size > maxBytes) {
    return { error: 'File too large (max 5MB)' }
  }

  const canAccess = await canAccessEventCommunity(eventId, session.user.id, session.user.role)
  if (!canAccess) {
    return { error: 'Not authorized to upload photos for this event' }
  }

  try {
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const extension = getFileExtension(file.name) || 'jpg'
    const uniqueName = `${eventId}/${Date.now()}.${extension}`
    const uploaded = await uploadToR2(buffer, uniqueName, file.type, 'event-photos')

    const photo = await db.eventPhoto.create({
      data: {
        eventId,
        uploaderId: session.user.id,
        url: uploaded.url,
        caption: captionInput || null,
      },
      include: {
        uploader: { select: { id: true, name: true, image: true } },
        reactions: true,
      },
    })

    revalidateEventPaths(eventId)
    return { success: true, data: photo }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.upload('Event photo upload failed', {
      error: message,
      diagnostics: getR2Diagnostics(),
    })

    if (error instanceof R2ConfigurationError) {
      return { error: 'Photo storage is not configured correctly. Please contact an administrator.' }
    }

    if (message.includes('EPROTO') || message.toLowerCase().includes('handshake')) {
      return { error: 'Photo storage connection failed. Please try again in a moment.' }
    }

    return { error: 'Failed to upload photo' }
  }
}

export async function getEventPhotos(eventId: string) {
  try {
    const photos = await db.eventPhoto.findMany({
      where: { eventId },
      include: {
        uploader: { select: { id: true, name: true, image: true } },
        reactions: {
          include: {
            user: { select: { id: true, name: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return { data: photos }
  } catch (error) {
    logger.serverAction('Error getting photos:', error)
    return { error: 'Failed to load photos' }
  }
}
