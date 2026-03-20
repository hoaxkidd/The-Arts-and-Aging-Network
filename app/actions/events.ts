'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { notifyAllStaffAboutEvent, notifyAllStaffAboutEventUpdate, notifyAllStaffAboutEventCancellation } from "@/lib/notifications"
import { scheduleEventReminders, cancelEventReminders } from "./email-reminders"
import { logger } from "@/lib/logger"

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
        title: 'Potential Event Time Conflict',
        message: `"${event.title}" starts within 1 hour of ${nearbyEvents.length} other event(s): ${nearbySummary}`,
        link: '/admin/events?tab=list',
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
    const startDateTime = new Date(validated.data.startDateTime)
    const endDateTime = new Date(validated.data.endDateTime)

    if (Number.isNaN(startDateTime.getTime()) || Number.isNaN(endDateTime.getTime())) {
      return { error: 'Invalid start or end date/time' }
    }

    if (endDateTime <= startDateTime) {
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
        // Update Existing Event
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
            }
        })
        
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
                changes: 'Details have been modified by an administrator.' // Could be more granular diff logic later
            })
        } catch (e) {
            console.error('Failed to send update notification', e)
        }

        await notifyAdminsAboutNearbyEvents({
          id: updatedEvent.id,
          title: updatedEvent.title,
          startDateTime: updatedEvent.startDateTime,
        })
    } else {
        // Create New Event
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

        // Notify all staff about the new event
        logger.log('🔔 Attempting to notify staff about event creation:', event.id)
        try {
            const result = await notifyAllStaffAboutEvent({
                id: event.id,
                title: event.title,
                startDateTime: event.startDateTime,
                location: event.location
            })
            logger.log('✅ Notification result:', result)
        } catch (notifyError) {
            console.error('❌ Failed to send notifications:', notifyError)
            // Don't fail the event creation if notifications fail
        }

        // Schedule email reminders for the new event
        try {
            await scheduleEventReminders(event.id)
            logger.log('✅ Email reminders scheduled for event:', event.id)
        } catch (reminderError) {
            console.error('❌ Failed to schedule reminders:', reminderError)
            // Don't fail the event creation if reminder scheduling fails
        }

        const proximity = await notifyAdminsAboutNearbyEvents({
          id: event.id,
          title: event.title,
          startDateTime: event.startDateTime,
        })

        revalidatePath('/admin/events')
        revalidatePath('/events')
        revalidatePath('/dashboard/events')
        revalidatePath('/dashboard/calendar')
        revalidatePath('/staff/events')

        return { success: true, eventId: event.id, conflictCount: proximity.conflictCount }
    }

    revalidatePath('/admin/events')
    revalidatePath('/events')
    revalidatePath('/dashboard/events')
    revalidatePath('/dashboard/calendar')
    revalidatePath('/staff/events')
    return { success: true, eventId: id }
  } catch (e) {
    console.error(e)
    return { error: 'Failed to save event' }
  }
}

export async function deleteEvent(eventId: string) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN' && session?.user?.role !== 'PAYROLL') return { error: 'Unauthorized' }

  try {
    // Get event details before deletion for notification
    const event = await prisma.event.findUnique({ where: { id: eventId } })

    // Verify event exists before attempting deletion
    if (!event) {
      return { error: 'Event not found' }
    }

    // Store event details for notification before deletion
    const eventTitle = event.title
    const eventDate = event.startDateTime

    // Cancel any pending email reminders
    try {
      await cancelEventReminders(eventId)
    } catch (e) {
      console.error('Failed to cancel reminders:', e)
    }

    await prisma.$transaction(async (tx) => {
      // Delete all related records first to avoid foreign key constraints
      // Delete reactions on comments first (nested dependency)
      await tx.eventReaction.deleteMany({
        where: { comment: { eventId } }
      })
      await tx.eventComment.deleteMany({ where: { eventId } })
      await tx.eventReaction.deleteMany({ where: { photo: { eventId } } })
      await tx.eventPhoto.deleteMany({ where: { eventId } })
      await tx.eventAttendance.deleteMany({ where: { eventId } })

      // Now delete the event
      await tx.event.delete({ where: { id: eventId } })

      await tx.auditLog.create({
          data: {
              action: 'EVENT_DELETED',
              details: JSON.stringify({ eventId, title: eventTitle }),
              userId: session.user.id
          }
      })
    })

    // Notify staff about cancellation
    try {
        await notifyAllStaffAboutEventCancellation({
            title: eventTitle,
            date: eventDate
        })
    } catch (e) {
        console.error('Failed to send cancellation notification', e)
    }

    revalidatePath('/admin/events')
    revalidatePath('/events')
    revalidatePath('/payroll')
    revalidatePath('/dashboard/events')
    revalidatePath('/dashboard/calendar')
    revalidatePath('/staff/events')
    return { success: true }
  } catch (e) {
    console.error('Delete event error:', e)
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
  revalidatePath('/admin/events')
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
    console.error('Error fetching published event types:', e)
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
    console.error('Error finding event by type and date:', e)
    return null
  }
}
