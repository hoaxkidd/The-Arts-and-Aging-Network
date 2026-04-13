'use server'

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { uploadEventPhoto, deleteEventPhoto as deleteEventPhotoAction } from "@/app/actions/booking-engagement"

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
    
    revalidatePath(`/bookings/${validated.data.eventId}`)
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
    
    revalidatePath(`/bookings/${validated.data.eventId}`)
    return { success: true }
  } catch (e) {
    return { error: 'Failed to submit feedback' }
  }
}

export async function uploadPhoto(formData: FormData) {
  return uploadEventPhoto(formData)
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
    revalidatePath(`/bookings/${eventId}`)
    return { success: true }
}

export async function deletePhoto(photoId: string, eventId: string) {
    const result = await deleteEventPhotoAction(photoId)
    if (result?.error) return result
    revalidatePath(`/bookings/${eventId}`)
    return { success: true }
}
