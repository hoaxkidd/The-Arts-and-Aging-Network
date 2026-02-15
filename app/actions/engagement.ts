'use server'

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const CommentSchema = z.object({
  eventId: z.string(),
  content: z.string().min(1, "Comment cannot be empty"),
})

export async function postComment(formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized' }

  const validated = CommentSchema.safeParse({
    eventId: formData.get('eventId'),
    content: formData.get('content')
  })

  if (!validated.success) return { error: 'Invalid comment' }

  try {
    await prisma.eventComment.create({
      data: {
        eventId: validated.data.eventId,
        userId: session.user.id,
        content: validated.data.content
      }
    })
    
    revalidatePath(`/events/${validated.data.eventId}`)
    return { success: true }
  } catch (e) {
    return { error: 'Failed to post comment' }
  }
}

const FeedbackSchema = z.object({
  eventId: z.string(),
  rating: z.coerce.number().min(1).max(5),
  comment: z.string().optional(),
  isAnonymous: z.string().optional()
})

export async function submitFeedback(formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized' }

  const validated = FeedbackSchema.safeParse(Object.fromEntries(formData))
  if (!validated.success) return { error: 'Invalid feedback' }

  try {
    await prisma.eventAttendance.update({
      where: {
        eventId_userId: {
          eventId: validated.data.eventId,
          userId: session.user.id
        }
      },
      data: {
        feedbackRating: validated.data.rating,
        feedbackComment: validated.data.comment,
        isAnonymous: validated.data.isAnonymous === 'on'
      }
    })
    
    revalidatePath(`/events/${validated.data.eventId}`)
    return { success: true }
  } catch (e) {
    return { error: 'Failed to submit feedback' }
  }
}

export async function uploadPhoto(formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized' }

  const eventId = formData.get('eventId') as string
  const file = formData.get('photo') as File
  const caption = formData.get('caption') as string

  if (!file || file.size === 0) return { error: 'No file uploaded' }
  if (file.size > 5 * 1024 * 1024) return { error: 'File too large (max 5MB)' }
  if (!file.type.startsWith('image/')) return { error: 'Invalid file type' }

  try {
    // In a real app, upload to S3/Cloudinary here.
    // For this demo, we'll pretend we got a URL.
    const mockUrl = `https://placehold.co/600x400?text=${encodeURIComponent(file.name)}`

    await prisma.eventPhoto.create({
      data: {
        eventId,
        uploaderId: session.user.id,
        url: mockUrl,
        caption
      }
    })
    
    revalidatePath(`/events/${eventId}`)
    return { success: true }
  } catch (e) {
    return { error: 'Failed to upload photo' }
  }
}

export async function deleteComment(commentId: string, eventId: string) {
    const session = await auth()
    if (!session?.user?.id) return { error: 'Unauthorized' }

    const comment = await prisma.eventComment.findUnique({
      where: { id: commentId }
    })
  
    if (!comment) return { error: 'Comment not found' }
  
    // Allow deletion if user is owner OR admin/payroll
    const isOwner = comment.userId === session.user.id
    const isAdmin = session.user.role === 'ADMIN' || session.user.role === 'PAYROLL'
  
    if (!isOwner && !isAdmin) return { error: 'Unauthorized' }
    
    await prisma.eventComment.delete({ where: { id: commentId } })
    revalidatePath(`/events/${eventId}`)
    return { success: true }
}

export async function deletePhoto(photoId: string, eventId: string) {
    const session = await auth()
    if (!session?.user?.id) return { error: 'Unauthorized' }
    
    const photo = await prisma.eventPhoto.findUnique({
        where: { id: photoId }
    })

    if (!photo) return { error: 'Photo not found' }

    // Allow deletion if user is owner OR admin/payroll
    const isOwner = photo.uploaderId === session.user.id
    const isAdmin = session.user.role === 'ADMIN' || session.user.role === 'PAYROLL'

    if (!isOwner && !isAdmin) return { error: 'Unauthorized' }

    await prisma.eventPhoto.delete({ where: { id: photoId } })
    revalidatePath(`/events/${eventId}`)
    return { success: true }
}