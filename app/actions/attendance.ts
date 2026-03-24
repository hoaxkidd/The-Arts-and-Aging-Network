'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { notifyAdminsAboutRSVP, notifyAdminsAboutCheckIn } from "@/lib/notifications"
import { checkInNotOpenMessage, getCheckInWindowStart } from "@/lib/event-checkin"
import { sendEmailWithRetry } from "@/lib/email/service"
import { generateCalendarLinks, formatEventTime } from "@/lib/email/calendar"
import { logger } from "@/lib/logger"

export async function checkInToEvent(eventId: string) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized' }

  try {
    const event = await prisma.event.findUnique({
        where: { id: eventId }
    })
    
    if (!event) return { error: 'Event not found' }

    // Validation: Ensure check-in is within allowed window
    const now = new Date()
    const windowStart = getCheckInWindowStart(new Date(event.startDateTime), event.checkInWindowMinutes)

    if (now < windowStart) {
      return { error: checkInNotOpenMessage(event.checkInWindowMinutes) }
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
      logger.email('Failed to send check-in notification', notifyError)
    }

    revalidatePath(`/events/${eventId}`)
    return { success: true }
  } catch (_e) {
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

      // Get event details for notification and email
      const event = await tx.event.findUnique({
        where: { id: eventId },
        include: { location: true }
      })

      return { 
        eventTitle: event?.title,
        eventStartDateTime: event?.startDateTime,
        eventEndDateTime: event?.endDateTime,
        eventLocation: event?.location?.name || event?.location?.address,
        eventLink: event ? `/events/${eventId}` : null
      }
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
        logger.email('Failed to send RSVP notification', notifyError)
      }
    }

    // Send RSVP confirmation/cancellation email (immediate for RSVP)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true, name: true, preferredName: true }
    })

    if (user?.email && result.eventTitle) {
      const templateType = status === 'YES' ? 'RSVP_CONFIRMATION' : 'RSVP_CANCELLED'
      const eventDate = result.eventStartDateTime 
        ? new Date(result.eventStartDateTime).toLocaleDateString('en-US', { 
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
          })
        : ''
      const eventTime = (result.eventStartDateTime && result.eventEndDateTime)
        ? formatEventTime(new Date(result.eventStartDateTime), new Date(result.eventEndDateTime))
        : ''

      const emailVariables: Record<string, string> = {
        name: user.preferredName || user.name || 'User',
        eventTitle: result.eventTitle,
        eventDate,
        eventTime,
        eventLocation: result.eventLocation || 'TBD',
        eventLink: result.eventLink || `/events/${eventId}`
      }

      // Add calendar links for confirmations
      if (status === 'YES' && result.eventStartDateTime && result.eventEndDateTime) {
        const calendarLinks = generateCalendarLinks({
          title: result.eventTitle,
          startDateTime: new Date(result.eventStartDateTime),
          endDateTime: new Date(result.eventEndDateTime),
          location: result.eventLocation,
          url: `${process.env.NEXTAUTH_URL || ''}${result.eventLink || `/events/${eventId}`}`
        })
        emailVariables.calendarLink = calendarLinks.webcal
        emailVariables.googleCalendarLink = calendarLinks.google
      }

      await sendEmailWithRetry({
        to: user.email,
        templateType,
        variables: emailVariables
      }, { userId: session.user.id })
    }

    revalidatePath('/events')
    revalidatePath(`/events/${eventId}`)
    return { success: true }
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : 'Failed to RSVP'
    return { error: errorMessage }
  }
}
