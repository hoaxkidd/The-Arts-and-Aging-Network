'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { logger } from "@/lib/logger"
import { deleteFromR2, extractR2KeyFromUrl } from "@/lib/r2"
import { z } from "zod"

import { notifyAllStaffAboutEvent, notifyAllStaffAboutEventUpdate, notifyAllStaffAboutEventCancellation, notifyEventSignupsAboutNewEvent, notifyEventSignupsAboutEventUpdate } from "@/lib/notifications"
import { scheduleEventReminders, cancelEventReminders } from "./email-reminders"

const VALID_EVENT_STATUSES = ['DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED'] as const

async function notifyAdminsAboutNearbyEvents(event: { id: string; title: string; startDateTime: Date }) {
  const windowStart = new Date(event.startDateTime.getTime() - 60 * 60 * 1000)
  const windowEnd = new Date(event.startDateTime.getTime() + 60 * 60 * 1000)

  const nearbyEvents = await prisma.event.findMany({
    where: {
      id: { not: event.id },
      startDateTime: {
        gte: windowStart,
        lte: windowEnd,
      },
      status: { not: 'CANCELLED' },
    },
    select: {
      id: true,
      title: true,
      startDateTime: true,
    },
    orderBy: { startDateTime: 'asc' },
    take: 5,
  })

  if (nearbyEvents.length === 0) return { conflictCount: 0 }

  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN', status: 'ACTIVE' },
    select: { id: true },
  })

  const nearbySummary = nearbyEvents
    .slice(0, 3)
    .map((e) => `${e.title} (${new Date(e.startDateTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })})`)
    .join(', ')

  for (const admin of admins) {
    await prisma.notification.create({
      data: {
        userId: admin.id,
        type: 'EVENT_TIME_PROXIMITY',
        title: 'Potential Booking Time Conflict',
        message: `"${event.title}" starts within 1 hour of ${nearbyEvents.length} other booking(s): ${nearbySummary}`,
        link: '/admin/bookings?tab=list',
      },
    })
  }

  return { conflictCount: nearbyEvents.length }
}

const EventSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  startDateTime: z.string(),
  endDateTime: z.string(),
  locationId: z.string().optional(),
  newLocationName: z.string().optional(),
  newLocationAddress: z.string().optional(),
  isNewLocation: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  verified: z.string().optional(),
  maxAttendees: z.coerce.number().min(1),
  autoAcceptLimit: z.coerce.number().min(0),
  checkInWindowMinutes: z.coerce.number().min(0).optional().default(120),
  organizerName: z.string().optional(),
  organizerRole: z.string().optional(),
  organizerEmail: z.string().optional(),
  organizerPhone: z.string().optional(),
  requiredFormTemplateId: z.string().optional(),
  reminderMessage: z.string().optional(),
  homeAdminReminderDays: z.coerce.number().min(1).max(30).optional(),
  staffReminderDays: z.coerce.number().min(1).max(30).optional(),
})

export async function createEvent(formData: FormData) {
  const session = await auth()
  // Allow ADMIN and PAYROLL roles to manage events
  if (session?.user?.role !== 'ADMIN' && session?.user?.role !== 'PAYROLL') return { error: 'Unauthorized' }

  const rawData = Object.fromEntries(formData)
  
  // Handle Update vs Create
  const id = rawData.id as string | undefined
  
  // Validation (reuse schema)
  // We need to omit id from schema or make it optional for parsing
  const validated = EventSchema.safeParse(rawData)
  if (!validated.success) return { error: 'Invalid fields' }

  try {
    // Convert datetime string to proper ISO-8601 format for Prisma
    // Prisma requires full ISO-8601 format: YYYY-MM-DDTHH:MM:SS.sssZ
    const startDateTime = new Date(validated.data.startDateTime).toISOString()
    const endDateTime = new Date(validated.data.endDateTime).toISOString()

    if (!startDateTime || !endDateTime || startDateTime === 'Invalid Date' || endDateTime === 'Invalid Date') {
      return { error: 'Invalid start or end date/time' }
    }

    // Parse for comparison (use Date objects for validation)
    const start = new Date(validated.data.startDateTime)
    const end = new Date(validated.data.endDateTime)

    if (end <= start) {
      return { error: 'End time must be after start time' }
    }

    let locationId = validated.data.locationId

    // Handle new location creation
    if (validated.data.isNewLocation === 'true' && validated.data.newLocationName && validated.data.newLocationAddress) {
       const newLoc = await prisma.location.create({
         data: {
           name: validated.data.newLocationName,
           address: validated.data.newLocationAddress,
           type: 'OTHER',
           latitude: validated.data.latitude ? parseFloat(validated.data.latitude) : null,
           longitude: validated.data.longitude ? parseFloat(validated.data.longitude) : null,
           verified: validated.data.verified === 'true',
           updatedAt: new Date()
         }
       })
       locationId = newLoc.id
    }

    if (!locationId) return { error: 'Location required' }

    // Validate optional form template exists and is active if provided
    let requiredFormTemplateId: string | null = validated.data.requiredFormTemplateId?.trim() || null
    if (requiredFormTemplateId) {
      const template = await prisma.formTemplate.findFirst({
        where: { id: requiredFormTemplateId, isActive: true, isFillable: true },
      })
      if (!template) requiredFormTemplateId = null
    }

    if (id) {
        // Update Existing Event - fetch original event first for comparison
        const oldEvent = await prisma.event.findUnique({
            where: { id },
            include: { location: true }
        })
        
        const updatedEvent = await prisma.event.update({
            where: { id },
            data: {
                title: validated.data.title,
                description: validated.data.description,
                startDateTime,
                endDateTime,
                locationId,
                maxAttendees: validated.data.maxAttendees,
                autoAcceptLimit: validated.data.autoAcceptLimit,
                checkInWindowMinutes: validated.data.checkInWindowMinutes || 120,
                organizerName: validated.data.organizerName || null,
                organizerRole: validated.data.organizerRole || null,
                organizerEmail: validated.data.organizerEmail || null,
                organizerPhone: validated.data.organizerPhone || null,
                requiredFormTemplateId,
                reminderMessage: validated.data.reminderMessage?.trim() || null,
                homeAdminReminderDays: validated.data.homeAdminReminderDays || null,
                staffReminderDays: validated.data.staffReminderDays || null,
            },
            include: { location: true }
        })
        
        // Generate list of specific field changes
        const changes: string[] = []
        const changeTimezone = 'America/St_Johns'

        const formatChangeDate = (date: Date) => date.toLocaleDateString('en-US', {
            timeZone: changeTimezone,
            month: 'long',
            day: 'numeric',
            year: 'numeric',
        })

        const formatChangeTime = (date: Date) => date.toLocaleTimeString('en-US', {
            timeZone: changeTimezone,
            hour: 'numeric',
            minute: '2-digit',
        })
        
        if (oldEvent && updatedEvent) {
            if (oldEvent.title !== updatedEvent.title) {
                changes.push(`Title updated from "${oldEvent.title}" to "${updatedEvent.title}"`)
            }
            if (oldEvent.description !== updatedEvent.description) {
                changes.push(`Description updated`)
            }

            const oldStartDate = formatChangeDate(oldEvent.startDateTime)
            const newStartDate = formatChangeDate(updatedEvent.startDateTime)
            if (oldStartDate !== newStartDate) {
                changes.push(`Date updated from ${oldStartDate} to ${newStartDate}`)
            }

            const oldStartTime = formatChangeTime(oldEvent.startDateTime)
            const newStartTime = formatChangeTime(updatedEvent.startDateTime)
            if (oldStartTime !== newStartTime) {
                changes.push(`Start time updated from ${oldStartTime} to ${newStartTime}`)
            }

            const oldEndDate = formatChangeDate(oldEvent.endDateTime)
            const newEndDate = formatChangeDate(updatedEvent.endDateTime)
            if (oldEndDate !== newEndDate) {
                changes.push(`End date updated from ${oldEndDate} to ${newEndDate}`)
            }

            const oldEndTime = formatChangeTime(oldEvent.endDateTime)
            const newEndTime = formatChangeTime(updatedEvent.endDateTime)
            if (oldEndTime !== newEndTime) {
                changes.push(`End time updated from ${oldEndTime} to ${newEndTime}`)
            }

            if (oldEvent.locationId !== updatedEvent.locationId) {
                const oldLoc = oldEvent.location?.name || 'Unknown'
                const newLoc = updatedEvent.location?.name || 'Unknown'
                changes.push(`Location updated from ${oldLoc} to ${newLoc}`)
            }
            if (oldEvent.maxAttendees !== updatedEvent.maxAttendees) {
                changes.push(`Max attendees updated from ${oldEvent.maxAttendees || 'None'} to ${updatedEvent.maxAttendees || 'None'}`)
            }
            if (oldEvent.autoAcceptLimit !== updatedEvent.autoAcceptLimit) {
                changes.push(`Auto-accept limit updated from ${oldEvent.autoAcceptLimit || 'None'} to ${updatedEvent.autoAcceptLimit || 'None'}`)
            }
            if (oldEvent.organizerName !== updatedEvent.organizerName) {
                changes.push(`Organizer updated from ${oldEvent.organizerName || 'None'} to ${updatedEvent.organizerName || 'None'}`)
            }
            if (oldEvent.status !== updatedEvent.status) {
                changes.push(`Status updated from ${oldEvent.status} to ${updatedEvent.status}`)
            }
        }
        
        const changesList = changes
        console.log('[Event] Changes detected:', changesList)
        
        await prisma.auditLog.create({
            data: {
                action: 'EVENT_UPDATED',
                details: JSON.stringify({ eventId: id, title: validated.data.title }),
                userId: session.user.id
            }
        })

        // Notify staff about update
        try {
            await notifyAllStaffAboutEventUpdate({
                id: updatedEvent.id,
                title: updatedEvent.title,
                startDateTime: updatedEvent.startDateTime,
                endDateTime: updatedEvent.endDateTime,
                location: updatedEvent.location?.name || 'TBD',
                changes: changesList,
                programId: updatedEvent.programId,
                geriatricHomeId: updatedEvent.geriatricHomeId,
            })
        } catch (e) {
            logger.email('Failed to send update notification', e)
        }

        // Notify volunteers about event update
        try {
            await notifyEventSignupsAboutEventUpdate({
                id: updatedEvent.id,
                title: updatedEvent.title,
                startDateTime: updatedEvent.startDateTime,
                endDateTime: updatedEvent.endDateTime,
                location: updatedEvent.location?.name || 'TBD',
                changes: changesList
            })
        } catch (e) {
            logger.email('Failed to notify volunteers about update', e)
        }

        await notifyAdminsAboutNearbyEvents({
          id: updatedEvent.id,
          title: updatedEvent.title,
          startDateTime: updatedEvent.startDateTime,
        })
    } else {
        // Create New Booking
        const event = await prisma.event.create({
            data: {
                title: validated.data.title,
                description: validated.data.description,
                startDateTime,
                endDateTime,
                locationId,
                maxAttendees: validated.data.maxAttendees,
                autoAcceptLimit: validated.data.autoAcceptLimit,
                checkInWindowMinutes: validated.data.checkInWindowMinutes || 120,
                organizerName: validated.data.organizerName || null,
                organizerRole: validated.data.organizerRole || null,
                organizerEmail: validated.data.organizerEmail || null,
                organizerPhone: validated.data.organizerPhone || null,
                status: 'PUBLISHED',
                requiredFormTemplateId,
                reminderMessage: validated.data.reminderMessage?.trim() || null,
                homeAdminReminderDays: validated.data.homeAdminReminderDays || null,
                staffReminderDays: validated.data.staffReminderDays || null,
                updatedAt: new Date()
            },
            include: { location: true }
        })

        await prisma.auditLog.create({
            data: {
                action: 'EVENT_CREATED',
                details: JSON.stringify({ eventId: event.id, title: validated.data.title }),
                userId: session.user.id
            }
        })

        // Notify all staff about the new booking
        logger.log('🔔 Attempting to notify staff about event creation:', event.id)
        try {
            const result = await notifyAllStaffAboutEvent({
                id: event.id,
                title: event.title,
                startDateTime: event.startDateTime,
                endDateTime: event.endDateTime,
                location: event.location,
                programId: event.programId,
                geriatricHomeId: event.geriatricHomeId,
            })
            logger.log('✅ Notification result:', result)
        } catch (notifyError) {
            logger.email('Failed to send notifications', notifyError)
            // Don't fail the event creation if notifications fail
        }

        // Notify volunteers who have signed up for events
        try {
            await notifyEventSignupsAboutNewEvent({
                id: event.id,
                title: event.title,
                startDateTime: event.startDateTime,
                endDateTime: event.endDateTime,
                location: event.location
            })
        } catch (notifyError) {
            logger.email('Failed to notify event signups', notifyError)
        }

        // Schedule email reminders for the new booking
        try {
            await scheduleEventReminders(event.id)
            logger.log('✅ Email reminders scheduled for event:', event.id)
        } catch (reminderError) {
            logger.serverAction('❌ Failed to schedule reminders:', reminderError)
            // Don't fail the event creation if reminder scheduling fails
        }

        const proximity = await notifyAdminsAboutNearbyEvents({
          id: event.id,
          title: event.title,
          startDateTime: event.startDateTime,
        })

        revalidatePath('/admin/bookings')
        revalidatePath('/bookings')
        revalidatePath('/dashboard/bookings')
        revalidatePath('/dashboard/calendar')
        revalidatePath('/staff/bookings')

        return { success: true, eventId: event.id, conflictCount: proximity.conflictCount }
    }

    revalidatePath('/admin/bookings')
    revalidatePath('/bookings')
    revalidatePath('/dashboard/bookings')
    revalidatePath('/dashboard/calendar')
    revalidatePath('/staff/bookings')
    return { success: true, eventId: id }
  } catch (e) {
    logger.serverAction('Failed to save event', e)
    return { error: 'Failed to save event' }
  }
}

export async function deleteEvent(eventId: string) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN' && session?.user?.role !== 'PAYROLL') return { error: 'Unauthorized' }

  try {
    // Get booking details before deletion for notification
    const event = await prisma.event.findUnique({ where: { id: eventId } })

    // Verify event exists before attempting deletion
    if (!event) {
      return { error: 'Booking not found' }
    }

    // Store booking details for notification before deletion
    const eventTitle = event.title
    const eventDate = event.startDateTime
    const eventPhotos = await prisma.eventPhoto.findMany({
      where: { eventId },
      select: { id: true, url: true },
    })

    // Cancel any pending email reminders
    try {
      await cancelEventReminders(eventId)
    } catch (e) {
      logger.serverAction('Failed to cancel reminders', e)
    }

    await prisma.$transaction(async (tx) => {
      // Delete all related records in correct dependency order
      // 1. EventRequest (cascades to EventRequestResponse, FormSubmission via eventRequestId)
      await tx.eventRequest.deleteMany({ where: { existingEventId: eventId } })
      await tx.eventRequest.updateMany({
        where: { approvedEventId: eventId },
        data: { approvedEventId: null }
      })
      
      // 2. FormSubmission with direct eventId
      await tx.formSubmission.deleteMany({ where: { eventId } })
      
      // 3. MessageGroup
      await tx.messageGroup.deleteMany({ where: { eventId } })
      
      // 4. Testimonial
      await tx.testimonial.deleteMany({ where: { eventId } })
      
      // 5. Reactions on comments (nested dependency)
      await tx.eventReaction.deleteMany({ where: { comment: { eventId } } })
      
      // 6. Comments
      await tx.eventComment.deleteMany({ where: { eventId } })
      
      // 7. Reactions on photos (nested dependency)
      await tx.eventReaction.deleteMany({ where: { photo: { eventId } } })
      
      // 8. Photos
      await tx.eventPhoto.deleteMany({ where: { eventId } })
      
      // 9. Attendance records
      await tx.eventAttendance.deleteMany({ where: { eventId } })
      
      // 10. Now delete the event (EmailReminder cascades automatically)
      await tx.event.delete({ where: { id: eventId } })

      await tx.auditLog.create({
          data: {
              action: 'EVENT_DELETED',
              details: JSON.stringify({ eventId, title: eventTitle }),
              userId: session.user.id
          }
      })
    })

    // Best-effort cleanup for photo objects in R2
    const photoCleanupResults = await Promise.allSettled(
      eventPhotos.map(async (photo) => {
        const key = extractR2KeyFromUrl(photo.url)
        if (!key) return
        await deleteFromR2(key)
      })
    )

    photoCleanupResults.forEach((result, index) => {
      if (result.status === 'rejected') {
        logger.upload('Failed to delete event photo from R2 during event deletion', {
          photoId: eventPhotos[index]?.id,
          error: result.reason,
        })
      }
    })

    // Notify staff about cancellation
    try {
        await notifyAllStaffAboutEventCancellation({
            title: eventTitle,
            date: eventDate,
            programId: event.programId,
            geriatricHomeId: event.geriatricHomeId,
        })
    } catch (e) {
        logger.email('Failed to send cancellation notification', e)
    }

    revalidatePath('/admin/bookings')
    revalidatePath('/bookings')
    revalidatePath('/payroll')
    revalidatePath('/dashboard/bookings')
    revalidatePath('/dashboard/calendar')
    revalidatePath('/staff/bookings')
    return { success: true }
  } catch (e) {
    logger.serverAction('Delete event error', e)
    return { error: 'Failed to delete event' }
  }
}

export async function updateEventStatus(eventId: string, status: string) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') return { error: 'Unauthorized' }

  if (!VALID_EVENT_STATUSES.includes(status as (typeof VALID_EVENT_STATUSES)[number])) {
    return { error: 'Invalid event status' }
  }

  await prisma.event.update({ where: { id: eventId }, data: { status } })
  revalidatePath('/admin/bookings')
}

export async function getPublishedEventTypes() {
  try {
    const events = await prisma.event.findMany({
      where: { status: 'PUBLISHED' },
      include: { 
        requiredFormTemplate: true, 
        location: true 
      },
      orderBy: { title: 'asc' }
    })
    return events
  } catch (e) {
    logger.serverAction('Error fetching published event types', e)
    return []
  }
}

export async function findEventByTypeAndDate(eventId: string, date: string) {
  try {
    const targetDate = new Date(date)
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0))
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999))

    const event = await prisma.event.findFirst({
      where: {
        id: eventId,
        status: 'PUBLISHED',
        startDateTime: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      include: {
        requiredFormTemplate: true,
        location: true
      }
    })
    return event
  } catch (e) {
    logger.serverAction('Error finding event by type and date', e)
    return null
  }
}
