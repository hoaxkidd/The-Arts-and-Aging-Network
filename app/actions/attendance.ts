'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { notifyAdminsAboutRSVP, notifyAdminsAboutCheckIn } from "@/lib/notifications"

export async function checkInToEvent(eventId: string) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized' }

  try {
    const event = await prisma.event.findUnique({
        where: { id: eventId }
    })
    
    if (!event) return { error: 'Event not found' }

    // Validation: Ensure check-in is within allowed window (2 hours before to end of event)
    const now = new Date()
    const windowStart = new Date(event.startDateTime)
    windowStart.setHours(windowStart.getHours() - 2) // Allow check-in 2 hours early

    if (now < windowStart) {
      return { error: 'Check-in not open yet. You can check in starting 2 hours before the event.' }
    }

    if (now > new Date(event.endDateTime)) {
      return { error: 'This event has ended. Check-in is no longer available.' }
    }

    await prisma.eventAttendance.update({
      where: {
        eventId_userId: {
          eventId,
          userId: session.user.id
        }
      },
      data: {
        checkInTime: new Date(),
        // Auto-confirm status if they check in
        status: 'YES'
      }
    })

    await prisma.auditLog.create({
        data: {
            action: 'EVENT_CHECK_IN',
            details: JSON.stringify({ eventId, title: event.title }),
            userId: session.user.id
        }
    })

    // Notify admins about the check-in
    try {
      await notifyAdminsAboutCheckIn({
        staffName: session.user.name || 'Staff member',
        staffId: session.user.id,
        eventId,
        eventTitle: event.title
      })
    } catch (notifyError) {
      console.error('Failed to send check-in notification:', notifyError)
    }

    revalidatePath(`/events/${eventId}`)
    return { success: true }
  } catch (e) {
    return { error: 'Failed to check in' }
  }
}

export async function rsvpToEvent(eventId: string, status: 'YES' | 'NO' | 'MAYBE') {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized' }

  try {
    // Use a transaction to prevent race conditions when checking capacity
    const result = await prisma.$transaction(async (tx) => {
      // Check event capacity if YES - within transaction for atomicity
      if (status === 'YES') {
        const event = await tx.event.findUnique({
          where: { id: eventId },
          include: { attendances: { where: { status: 'YES' } } }
        })

        if (!event) {
          throw new Error('Event not found')
        }

        // Check if user already has a YES status (don't count them twice)
        const existingAttendance = await tx.eventAttendance.findUnique({
          where: { eventId_userId: { eventId, userId: session.user.id } }
        })

        const currentYesCount = event.attendances.length
        const isAlreadyYes = existingAttendance?.status === 'YES'

        // Only check capacity if user isn't already marked as YES
        if (!isAlreadyYes && currentYesCount >= event.maxAttendees) {
          throw new Error('Event is full')
        }
      }

      // Perform the upsert within the same transaction
      await tx.eventAttendance.upsert({
        where: { eventId_userId: { eventId, userId: session.user.id } },
        update: { status },
        create: {
          eventId,
          userId: session.user.id,
          status,
          updatedAt: new Date()
        }
      })

      // Get event title for notification
      const event = await tx.event.findUnique({
        where: { id: eventId },
        select: { title: true }
      })

      return { eventTitle: event?.title }
    })

    // Notify admins about the RSVP (outside transaction - non-critical)
    if (result.eventTitle) {
      try {
        await notifyAdminsAboutRSVP({
          staffName: session.user.name || 'Staff member',
          staffId: session.user.id,
          eventId,
          eventTitle: result.eventTitle,
          rsvpStatus: status
        })
      } catch (notifyError) {
        console.error('Failed to send RSVP notification:', notifyError)
      }
    }

    revalidatePath('/events')
    revalidatePath(`/events/${eventId}`)
    return { success: true }
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : 'Failed to RSVP'
    return { error: errorMessage }
  }
}
