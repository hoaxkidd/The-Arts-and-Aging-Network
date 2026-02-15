'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { notifyAllStaffAboutEvent, notifyAllStaffAboutEventUpdate, notifyAllStaffAboutEventCancellation } from "@/lib/notifications"
import { scheduleEventReminders, cancelEventReminders } from "./email-reminders"

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
  organizerName: z.string().optional(),
  organizerRole: z.string().optional(),
  organizerEmail: z.string().optional(),
  organizerPhone: z.string().optional(),
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

    if (id) {
        // Update Existing Event
        const updatedEvent = await prisma.event.update({
            where: { id },
            data: {
                title: validated.data.title,
                description: validated.data.description,
                startDateTime: new Date(validated.data.startDateTime),
                endDateTime: new Date(validated.data.endDateTime),
                locationId,
                maxAttendees: validated.data.maxAttendees,
                autoAcceptLimit: validated.data.autoAcceptLimit,
                organizerName: validated.data.organizerName || null,
                organizerRole: validated.data.organizerRole || null,
                organizerEmail: validated.data.organizerEmail || null,
                organizerPhone: validated.data.organizerPhone || null,
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
    } else {
        // Create New Event
        const event = await prisma.event.create({
            data: {
                title: validated.data.title,
                description: validated.data.description,
                startDateTime: new Date(validated.data.startDateTime),
                endDateTime: new Date(validated.data.endDateTime),
                locationId,
                maxAttendees: validated.data.maxAttendees,
                autoAcceptLimit: validated.data.autoAcceptLimit,
                organizerName: validated.data.organizerName || null,
                organizerRole: validated.data.organizerRole || null,
                organizerEmail: validated.data.organizerEmail || null,
                organizerPhone: validated.data.organizerPhone || null,
                status: 'PUBLISHED',
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
        console.log('🔔 Attempting to notify staff about event creation:', event.id)
        try {
            const result = await notifyAllStaffAboutEvent({
                id: event.id,
                title: event.title,
                startDateTime: event.startDateTime,
                location: event.location
            })
            console.log('✅ Notification result:', result)
        } catch (notifyError) {
            console.error('❌ Failed to send notifications:', notifyError)
            // Don't fail the event creation if notifications fail
        }

        // Schedule email reminders for the new event
        try {
            await scheduleEventReminders(event.id)
            console.log('✅ Email reminders scheduled for event:', event.id)
        } catch (reminderError) {
            console.error('❌ Failed to schedule reminders:', reminderError)
            // Don't fail the event creation if reminder scheduling fails
        }
    }

    revalidatePath('/admin/events')
    revalidatePath('/events')
    return { success: true }
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

    // Delete all related records first to avoid foreign key constraints
    // Delete reactions on comments first (nested dependency)
    await prisma.eventReaction.deleteMany({
      where: { comment: { eventId } }
    })
    await prisma.eventComment.deleteMany({ where: { eventId } })
    await prisma.eventReaction.deleteMany({ where: { photo: { eventId } } })
    await prisma.eventPhoto.deleteMany({ where: { eventId } })
    await prisma.eventAttendance.deleteMany({ where: { eventId } })

    // Now delete the event
    await prisma.event.delete({ where: { id: eventId } })

    await prisma.auditLog.create({
        data: {
            action: 'EVENT_DELETED',
            details: JSON.stringify({ eventId, title: eventTitle }),
            userId: session.user.id
        }
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
    return { success: true }
  } catch (e) {
    console.error('Delete event error:', e)
    return { error: 'Failed to delete event' }
  }
}

export async function updateEventStatus(eventId: string, status: string) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') return { error: 'Unauthorized' }

  await prisma.event.update({ where: { id: eventId }, data: { status } })
  revalidatePath('/admin/events')
}
