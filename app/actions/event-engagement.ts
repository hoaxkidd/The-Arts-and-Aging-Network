'use server'

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import type { PrismaClient } from "@prisma/client"

// Type-safe prisma client reference
const db = prisma as PrismaClient & Record<string, unknown>

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
    console.error('Error creating notification:', error)
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

    revalidatePath(`/events/${eventId}`)
    revalidatePath(`/dashboard/my-events/${eventId}`)
    revalidatePath(`/staff/events/${eventId}`)

    return { data: comment }
  } catch (error) {
    console.error('Error adding comment:', error)
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

    revalidatePath(`/events/${comment.eventId}`)
    revalidatePath(`/dashboard/my-events/${comment.eventId}`)
    revalidatePath(`/staff/events/${comment.eventId}`)

    return { data: updated }
  } catch (error) {
    console.error('Error editing comment:', error)
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

    revalidatePath(`/events/${comment.eventId}`)
    revalidatePath(`/dashboard/my-events/${comment.eventId}`)
    revalidatePath(`/staff/events/${comment.eventId}`)

    return { success: true }
  } catch (error) {
    console.error('Error deleting comment:', error)
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
    console.error('Error getting comments:', error)
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
        revalidatePath(`/events/${eventId}`)
        revalidatePath(`/dashboard/my-events/${eventId}`)
        revalidatePath(`/staff/events/${eventId}`)
      }
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
    console.error('Error toggling reaction:', error)
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

    revalidatePath(`/events/${eventId}`)
    revalidatePath(`/dashboard/my-events/${eventId}`)
    revalidatePath(`/staff/events/${eventId}`)

    return { data: photo }
  } catch (error) {
    console.error('Error adding photo:', error)
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
      select: { uploaderId: true, eventId: true }
    })

    if (!photo) {
      return { error: 'Photo not found' }
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    // Only uploader or admin can delete
    if (photo.uploaderId !== session.user.id && user?.role !== 'ADMIN') {
      return { error: 'Not authorized to delete this photo' }
    }

    await db.eventPhoto.delete({
      where: { id: photoId }
    })

    revalidatePath(`/events/${photo.eventId}`)
    revalidatePath(`/dashboard/my-events/${photo.eventId}`)
    revalidatePath(`/staff/events/${photo.eventId}`)

    return { success: true }
  } catch (error) {
    console.error('Error deleting photo:', error)
    return { error: 'Failed to delete photo' }
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
    console.error('Error getting photos:', error)
    return { error: 'Failed to load photos' }
  }
}
