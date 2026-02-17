'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import type { PrismaClient } from "@prisma/client"
import { scheduleEventReminders } from "./email-reminders"

// Type-safe prisma client reference
const db = prisma as PrismaClient & Record<string, unknown>

// ============================================
// HOME_ADMIN ACTIONS
// ============================================

// Request participation in an existing published event
export async function requestExistingEvent(
  eventId: string,
  data: { notes?: string; expectedAttendees?: number }
) {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }

  try {
    // Get home for this user
    const home = await db.geriatricHome.findUnique({
      where: { userId: session.user.id }
    })

    if (!home) return { error: "No home found for this user" }

    // Verify event exists and is published
    const event = await db.event.findUnique({
      where: { id: eventId }
    })

    if (!event) return { error: "Event not found" }
    if (event.status !== 'PUBLISHED') return { error: "Event is not available for requests" }

    // Check if already requested
    const existingRequest = await db.eventRequest.findFirst({
      where: {
        geriatricHomeId: home.id,
        existingEventId: eventId,
        status: { in: ['PENDING', 'APPROVED'] }
      }
    })

    if (existingRequest) {
      return { error: "You have already requested this event" }
    }

    // Create request
    const request = await db.eventRequest.create({
      data: {
        geriatricHomeId: home.id,
        type: 'REQUEST_EXISTING',
        existingEventId: eventId,
        requestedBy: session.user.id,
        notes: data.notes || null,
        expectedAttendees: data.expectedAttendees || null,
        updatedAt: new Date()
      }
    })

    // Create notification for admins
    const admins = await db.user.findMany({
      where: { role: 'ADMIN', status: 'ACTIVE' }
    })

    for (const admin of admins) {
      await db.notification.create({
        data: {
          userId: admin.id,
          type: 'EVENT_REQUEST_SUBMITTED',
          title: 'New Event Request',
          message: `${home.name} has requested to participate in "${event.title}"`,
          link: `/admin/event-requests/${request.id}`
        }
      })
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'EVENT_REQUEST_CREATED',
        details: JSON.stringify({ requestId: request.id, eventId, homeId: home.id }),
        userId: session.user.id
      }
    })

    revalidatePath('/dashboard/requests')
    revalidatePath('/dashboard/calendar')
    revalidatePath('/admin/event-requests')

    return { success: true, data: request }
  } catch (error) {
    console.error("Failed to request event:", error)
    const msg = error instanceof Error ? error.message : "Unknown error"
    return { error: process.env.NODE_ENV === "development" ? `Failed to submit event request: ${msg}` : "Failed to submit event request" }
  }
}

// Submit event sign-up form and create event request (when event requires a form template)
export async function submitEventSignUpForm(
  eventId: string,
  formData: Record<string, unknown>,
  attachments?: string[]
) {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }
  if (session.user.role !== 'HOME_ADMIN') return { error: "Only home admins can use this form" }

  try {
    const home = await db.geriatricHome.findUnique({
      where: { userId: session.user.id }
    })
    if (!home) return { error: "No home found for this user" }

    const event = await db.event.findUnique({
      where: { id: eventId },
      include: { requiredFormTemplate: true }
    })
    if (!event) return { error: "Event not found" }
    if (event.status !== 'PUBLISHED') return { error: "Event is not available for requests" }
    if (!event.requiredFormTemplateId || !event.requiredFormTemplate) {
      return { error: "This event does not require a sign-up form" }
    }

    const existingRequest = await db.eventRequest.findFirst({
      where: {
        geriatricHomeId: home.id,
        existingEventId: eventId,
        status: { in: ['PENDING', 'APPROVED'] }
      }
    })
    if (existingRequest) return { error: "You have already requested this event" }

    const templateId = event.requiredFormTemplate.id

    const [submission, request] = await db.$transaction(async (tx) => {
      const sub = await tx.formSubmission.create({
        data: {
          templateId,
          submittedBy: session.user.id,
          formData: JSON.stringify(formData),
          eventId,
          attachments: attachments?.length ? JSON.stringify(attachments) : null
        }
      })
      const req = await tx.eventRequest.create({
        data: {
          geriatricHomeId: home.id,
          type: 'REQUEST_EXISTING',
          existingEventId: eventId,
          requestedBy: session.user.id
        }
      })
      await tx.formSubmission.update({
        where: { id: sub.id },
        data: { eventRequestId: req.id }
      })
      await tx.formTemplate.update({
        where: { id: templateId },
        data: { usageCount: { increment: 1 } }
      })
      return [sub, req]
    })

    const admins = await db.user.findMany({
      where: { role: 'ADMIN', status: 'ACTIVE' },
      select: { id: true }
    })
    for (const admin of admins) {
      await db.notification.create({
        data: {
          userId: admin.id,
          type: 'EVENT_REQUEST_SUBMITTED',
          title: 'New Event Request',
          message: `${home.name} has requested to participate in "${event.title}"`,
          link: `/admin/event-requests/${request.id}`
        }
      })
    }

    await db.auditLog.create({
      data: {
        action: 'EVENT_REQUEST_CREATED',
        details: JSON.stringify({ requestId: request.id, eventId, homeId: home.id, formSubmissionId: submission.id }),
        userId: session.user.id
      }
    })

    revalidatePath('/dashboard/requests')
    revalidatePath('/dashboard/calendar')
    revalidatePath('/admin/event-requests')

    return { success: true, data: { request, submission } }
  } catch (error) {
    console.error("Submit event sign-up form error:", error)
    const msg = error instanceof Error ? error.message : "Unknown error"
    return { error: process.env.NODE_ENV === "development" ? `Failed to submit event request: ${msg}` : "Failed to submit event request" }
  }
}

// Create a custom event request
export async function createCustomEventRequest(data: {
  title: string
  description?: string
  startDateTime: string
  endDateTime: string
  locationName?: string
  locationAddress?: string
  notes?: string
  expectedAttendees?: number
  programType?: string
  preferredDates?: Array<{ startDateTime: string, endDateTime: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }

  try {
    // Get home for this user
    const home = await db.geriatricHome.findUnique({
      where: { userId: session.user.id }
    })

    if (!home) return { error: "No home found for this user" }

    // Validate required fields
    if (!data.title?.trim()) return { error: "Title is required" }

    // Support either single date or multiple preferred dates
    let status = 'PENDING'
    let preferredDatesJson = null

    if (data.preferredDates && data.preferredDates.length > 0) {
      // Multiple dates - need staff availability
      status = 'GATHERING_AVAILABILITY'
      preferredDatesJson = JSON.stringify(data.preferredDates)

      // Use first date as default for schema fields
      if (!data.startDateTime) data.startDateTime = data.preferredDates[0].startDateTime
      if (!data.endDateTime) data.endDateTime = data.preferredDates[0].endDateTime
    } else {
      // Single date - traditional flow
      if (!data.startDateTime) return { error: "Start date/time is required" }
      if (!data.endDateTime) return { error: "End date/time is required" }
    }

    // Create request
    const request = await db.eventRequest.create({
      data: {
        geriatricHomeId: home.id,
        type: 'CREATE_CUSTOM',
        requestedBy: session.user.id,
        customTitle: data.title,
        customDescription: data.description || null,
        customStartDateTime: new Date(data.startDateTime),
        customEndDateTime: new Date(data.endDateTime),
        customLocationName: data.locationName || null,
        customLocationAddress: data.locationAddress || null,
        preferredDates: preferredDatesJson,
        programType: data.programType || null,
        notes: data.notes || null,
        expectedAttendees: data.expectedAttendees || null,
        status,
        updatedAt: new Date()
      }
    })

    // If gathering availability, notify staff
    if (status === 'GATHERING_AVAILABILITY') {
      const staff = await db.user.findMany({
        where: {
          role: { in: ['FACILITATOR', 'CONTRACTOR'] },
          status: 'ACTIVE'
        }
      })

      for (const member of staff) {
        await db.notification.create({
          data: {
            userId: member.id,
            type: 'EVENT_REQUEST_AVAILABILITY',
            title: 'Staff Availability Needed',
            message: `${home.name} is requesting "${data.title}". Please indicate your availability.`,
            link: `/staff/event-requests/${request.id}`
          }
        })
      }
    } else {
      // Traditional single-date request - notify admins
      const admins = await db.user.findMany({
        where: { role: 'ADMIN', status: 'ACTIVE' }
      })

      for (const admin of admins) {
        await db.notification.create({
          data: {
            userId: admin.id,
            type: 'EVENT_REQUEST_SUBMITTED',
            title: 'New Custom Event Request',
            message: `${home.name} has submitted a custom event request: "${data.title}"`,
            link: `/admin/event-requests/${request.id}`
          }
        })
      }
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'CUSTOM_EVENT_REQUEST_CREATED',
        details: JSON.stringify({ requestId: request.id, homeId: home.id, title: data.title }),
        userId: session.user.id
      }
    })

    revalidatePath('/dashboard/requests')
    revalidatePath('/dashboard/calendar')
    revalidatePath('/admin/event-requests')
    revalidatePath('/staff/event-requests')

    return { success: true, data: request }
  } catch (error) {
    console.error("Failed to create custom event request:", error)
    return { error: "Failed to submit event request" }
  }
}

// Cancel a pending request
export async function cancelEventRequest(requestId: string) {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }

  try {
    const request = await db.eventRequest.findUnique({
      where: { id: requestId },
      include: { geriatricHome: true }
    })

    if (!request) return { error: "Request not found" }

    // Verify ownership
    if (request.geriatricHome.userId !== session.user.id && session.user.role !== 'ADMIN') {
      return { error: "Unauthorized" }
    }

    if (request.status !== 'PENDING') {
      return { error: "Only pending requests can be cancelled" }
    }

    await db.eventRequest.delete({
      where: { id: requestId }
    })

    await prisma.auditLog.create({
      data: {
        action: 'EVENT_REQUEST_CANCELLED',
        details: JSON.stringify({ requestId }),
        userId: session.user.id
      }
    })

    revalidatePath('/dashboard/requests')
    revalidatePath('/admin/event-requests')

    return { success: true }
  } catch (error) {
    console.error("Failed to cancel request:", error)
    return { error: "Failed to cancel request" }
  }
}

// Get all requests for a home
export async function getHomeEventRequests(homeId?: string) {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }

  try {
    let targetHomeId = homeId

    // If no homeId provided, get home for current user
    if (!targetHomeId) {
      const home = await db.geriatricHome.findUnique({
        where: { userId: session.user.id }
      })
      if (!home) return { error: "No home found" }
      targetHomeId = home.id
    }

    // Verify access
    const home = await db.geriatricHome.findUnique({
      where: { id: targetHomeId }
    })

    if (!home) return { error: "Home not found" }

    if (session.user.role !== 'ADMIN' && home.userId !== session.user.id) {
      return { error: "Unauthorized" }
    }

    const requests = await db.eventRequest.findMany({
      where: { geriatricHomeId: targetHomeId },
      include: {
        existingEvent: {
          include: { location: true }
        },
        approvedEvent: {
          include: { location: true }
        }
      },
      orderBy: { requestedAt: 'desc' }
    })

    return { success: true, data: requests }
  } catch (error) {
    console.error("Failed to get requests:", error)
    return { error: "Failed to load requests" }
  }
}

// ============================================
// ADMIN ACTIONS
// ============================================

// Get all event requests with optional filters
export async function getAllEventRequests(filters?: {
  status?: string
  homeId?: string
  type?: string
}) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') return { error: "Unauthorized" }

  try {
    const where: any = {}

    if (filters?.status && filters.status !== 'ALL') {
      where.status = filters.status
    }
    if (filters?.homeId) {
      where.geriatricHomeId = filters.homeId
    }
    if (filters?.type && filters.type !== 'ALL') {
      where.type = filters.type
    }

    const requests = await db.eventRequest.findMany({
      where,
      include: {
        geriatricHome: true,
        existingEvent: {
          include: { location: true }
        },
        approvedEvent: {
          include: { location: true }
        }
      },
      orderBy: { requestedAt: 'desc' }
    })

    type RequestWithSubmission = (typeof requests)[0] & { formSubmission: { id: string; formData: string; template: { title: string } } | null }
    let data: RequestWithSubmission[]
    try {
      const requestIds = requests.map((r) => r.id)
      const submissions = requestIds.length
        ? await db.formSubmission.findMany({
            where: { eventRequestId: { in: requestIds } },
            include: { template: { select: { title: true } } }
          })
        : []
      const submissionByRequestId = new Map(submissions.map((s) => [s.eventRequestId!, s]))
      data = requests.map((r) => ({
        ...r,
        formSubmission: submissionByRequestId.get(r.id) ?? null
      }))
    } catch {
      data = requests.map((r) => ({ ...r, formSubmission: null }))
    }

    return { success: true, data }
  } catch (error) {
    console.error("Failed to get requests:", error)
    return { error: "Failed to load requests" }
  }
}

// Get single request detail
export async function getEventRequestDetail(requestId: string) {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }

  try {
    const request = await db.eventRequest.findUnique({
      where: { id: requestId },
      include: {
        geriatricHome: {
          include: { user: { select: { name: true, email: true } } }
        },
        existingEvent: {
          include: {
            location: true,
            attendances: { include: { user: true } },
            _count: { select: { attendances: true, photos: true, comments: true } }
          }
        },
        approvedEvent: {
          include: {
            location: true,
            attendances: { include: { user: true } },
            _count: { select: { attendances: true, photos: true, comments: true } }
          }
        },
        formSubmission: {
          include: { template: { select: { title: true } } }
        }
      }
    })

    if (!request) return { error: "Request not found" }

    // Verify access
    if (session.user.role !== 'ADMIN') {
      const home = await db.geriatricHome.findUnique({
        where: { userId: session.user.id }
      })
      if (!home || home.id !== request.geriatricHomeId) {
        return { error: "Unauthorized" }
      }
    }

    return { success: true, data: request }
  } catch (error) {
    console.error("Failed to get request detail:", error)
    return { error: "Failed to load request" }
  }
}

// Approve an event request
export async function approveEventRequest(
  requestId: string,
  modifications?: {
    title?: string
    description?: string
    startDateTime?: string
    endDateTime?: string
    locationId?: string
  }
) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') return { error: "Unauthorized" }

  try {
    const request = await db.eventRequest.findUnique({
      where: { id: requestId },
      include: {
        geriatricHome: true,
        existingEvent: true
      }
    })

    if (!request) return { error: "Request not found" }
    if (request.status !== 'PENDING') return { error: "Request is not pending" }

    let approvedEventId = request.existingEventId

    // For custom events, create the actual event
    if (request.type === 'CREATE_CUSTOM') {
      // Create or get location
      let locationId: string

      if (modifications?.locationId) {
        locationId = modifications.locationId
      } else if (request.customLocationName) {
        const location = await db.location.create({
          data: {
            name: request.customLocationName,
            address: request.customLocationAddress || request.customLocationName,
            type: 'HOME',
            updatedAt: new Date()
          }
        })
        locationId = location.id
      } else {
        // Use home's address as location
        const location = await db.location.create({
          data: {
            name: request.geriatricHome.name,
            address: request.geriatricHome.address,
            type: 'HOME',
            updatedAt: new Date()
          }
        })
        locationId = location.id
      }

      // Validate required fields exist
      const eventTitle = modifications?.title || request.customTitle
      const eventStartDateTime = modifications?.startDateTime
        ? new Date(modifications.startDateTime)
        : request.customStartDateTime
      const eventEndDateTime = modifications?.endDateTime
        ? new Date(modifications.endDateTime)
        : request.customEndDateTime

      if (!eventTitle || !eventStartDateTime || !eventEndDateTime) {
        throw new Error('Missing required event fields')
      }

      // Create the event
      const event = await db.event.create({
        data: {
          title: eventTitle,
          description: modifications?.description || request.customDescription || undefined,
          startDateTime: eventStartDateTime,
          endDateTime: eventEndDateTime,
          locationId,
          geriatricHomeId: request.geriatricHomeId,
          status: 'PUBLISHED',
          origin: 'HOME_REQUESTED',
          updatedAt: new Date()
        }
      })

      approvedEventId = event.id
    } else {
      // For existing event requests, link the home to the event
      if (!request.existingEventId) {
        throw new Error('Existing event ID is required for REQUEST_EXISTING type')
      }
      await db.event.update({
        where: { id: request.existingEventId },
        data: { geriatricHomeId: request.geriatricHomeId }
      })
    }

    // Update request status
    await db.eventRequest.update({
      where: { id: requestId },
      data: {
        status: 'APPROVED',
        reviewedBy: session.user.id,
        reviewedAt: new Date(),
        approvedEventId: request.type === 'CREATE_CUSTOM' ? approvedEventId : null
      }
    })

    // Notify the home admin
    await db.notification.create({
      data: {
        userId: request.geriatricHome.userId,
        type: 'EVENT_REQUEST_APPROVED',
        title: 'Event Request Approved',
        message: `Your event request has been approved!`,
        link: `/dashboard/my-events`
      }
    })

    // Notify staff about new approved event
    const staff = await db.user.findMany({
      where: {
        role: { in: ['FACILITATOR', 'CONTRACTOR'] },
        status: 'ACTIVE'
      }
    })

    const eventTitle = request.type === 'CREATE_CUSTOM' ? request.customTitle : request.existingEvent?.title

    for (const member of staff) {
      await db.notification.create({
        data: {
          userId: member.id,
          type: 'EVENT_CREATED',
          title: 'New Event Available',
          message: `A new event "${eventTitle}" is now available for attendance`,
          link: `/staff/events/${approvedEventId}`
        }
      })
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'EVENT_REQUEST_APPROVED',
        details: JSON.stringify({ requestId, approvedEventId }),
        userId: session.user.id
      }
    })

    // Schedule email reminders for the new event
    if (approvedEventId) {
      try {
        await scheduleEventReminders(approvedEventId)
        console.log('✅ Email reminders scheduled for approved event:', approvedEventId)
      } catch (reminderError) {
        console.error('❌ Failed to schedule reminders:', reminderError)
      }
    }

    revalidatePath('/admin/event-requests')
    revalidatePath('/admin/events')
    revalidatePath('/dashboard/requests')
    revalidatePath('/dashboard/my-events')
    revalidatePath('/staff/events')

    return { success: true, approvedEventId }
  } catch (error) {
    console.error("Failed to approve request:", error)
    return { error: "Failed to approve request" }
  }
}

// Reject an event request
export async function rejectEventRequest(requestId: string, reason: string) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') return { error: "Unauthorized" }

  if (!reason?.trim()) return { error: "Rejection reason is required" }

  try {
    const request = await db.eventRequest.findUnique({
      where: { id: requestId },
      include: { geriatricHome: true, existingEvent: true }
    })

    if (!request) return { error: "Request not found" }
    if (request.status !== 'PENDING') return { error: "Request is not pending" }

    // Update request status
    await db.eventRequest.update({
      where: { id: requestId },
      data: {
        status: 'REJECTED',
        reviewedBy: session.user.id,
        reviewedAt: new Date(),
        rejectionReason: reason
      }
    })

    // Notify the home admin
    const eventTitle = request.type === 'CREATE_CUSTOM' ? request.customTitle : request.existingEvent?.title

    await db.notification.create({
      data: {
        userId: request.geriatricHome.userId,
        type: 'EVENT_REQUEST_REJECTED',
        title: 'Event Request Declined',
        message: `Your request for "${eventTitle}" was declined. Reason: ${reason}`,
        link: `/dashboard/requests`
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'EVENT_REQUEST_REJECTED',
        details: JSON.stringify({ requestId, reason }),
        userId: session.user.id
      }
    })

    revalidatePath('/admin/event-requests')
    revalidatePath('/dashboard/requests')

    return { success: true }
  } catch (error) {
    console.error("Failed to reject request:", error)
    return { error: "Failed to reject request" }
  }
}

// ============================================
// HOME EVENT HISTORY
// ============================================

// Get all events a home has participated in with stats
export async function getHomeEventHistory(homeId?: string) {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }

  try {
    let targetHomeId = homeId

    // If no homeId provided, get home for current user
    if (!targetHomeId) {
      const home = await db.geriatricHome.findUnique({
        where: { userId: session.user.id }
      })
      if (!home) return { error: "No home found" }
      targetHomeId = home.id
    }

    // Verify access
    const home = await db.geriatricHome.findUnique({
      where: { id: targetHomeId }
    })

    if (!home) return { error: "Home not found" }

    if (session.user.role !== 'ADMIN' && home.userId !== session.user.id) {
      return { error: "Unauthorized" }
    }

    // Get all approved requests and their events
    const approvedRequests = await db.eventRequest.findMany({
      where: {
        geriatricHomeId: targetHomeId,
        status: 'APPROVED'
      },
      include: {
        existingEvent: {
          include: {
            location: true,
            attendances: {
              include: { user: { select: { id: true, name: true, role: true } } }
            },
            _count: { select: { photos: true, comments: true } }
          }
        },
        approvedEvent: {
          include: {
            location: true,
            attendances: {
              include: { user: { select: { id: true, name: true, role: true } } }
            },
            _count: { select: { photos: true, comments: true } }
          }
        }
      },
      orderBy: { requestedAt: 'desc' }
    })

    // Also get events directly linked to home
    const directEvents = await db.event.findMany({
      where: {
        geriatricHomeId: targetHomeId,
        status: { in: ['PUBLISHED', 'COMPLETED'] }
      },
      include: {
        location: true,
        attendances: {
          include: { user: { select: { id: true, name: true, role: true } } }
        },
        _count: { select: { photos: true, comments: true } }
      },
      orderBy: { startDateTime: 'desc' }
    })

    // Combine and dedupe events
    const eventsMap = new Map()

    // Add events from approved requests
    for (const req of approvedRequests) {
      const event = req.existingEvent || req.approvedEvent
      if (event && !eventsMap.has(event.id)) {
        // Calculate stats
        const confirmedStaff = event.attendances.filter(
          (a: any) => a.status === 'YES' && ['FACILITATOR', 'CONTRACTOR'].includes(a.user.role)
        )
        const checkedIn = event.attendances.filter((a: any) => a.checkInTime)
        const feedbackRatings = event.attendances
          .filter((a: any) => a.feedbackRating)
          .map((a: any) => a.feedbackRating)
        const avgRating = feedbackRatings.length > 0
          ? feedbackRatings.reduce((a: number, b: number) => a + b, 0) / feedbackRatings.length
          : null

        eventsMap.set(event.id, {
          ...event,
          requestId: req.id,
          requestedAt: req.requestedAt,
          stats: {
            confirmedStaffCount: confirmedStaff.length,
            checkedInCount: checkedIn.length,
            avgFeedbackRating: avgRating,
            photosCount: event._count.photos,
            commentsCount: event._count.comments
          }
        })
      }
    }

    // Add direct events
    for (const event of directEvents) {
      if (!eventsMap.has(event.id)) {
        const confirmedStaff = event.attendances.filter(
          (a: any) => a.status === 'YES' && ['FACILITATOR', 'CONTRACTOR'].includes(a.user.role)
        )
        const checkedIn = event.attendances.filter((a: any) => a.checkInTime)
        const feedbackRatings = event.attendances
          .filter((a: any) => a.feedbackRating)
          .map((a: any) => a.feedbackRating)
        const avgRating = feedbackRatings.length > 0
          ? feedbackRatings.reduce((a: number, b: number) => a + b, 0) / feedbackRatings.length
          : null

        eventsMap.set(event.id, {
          ...event,
          stats: {
            confirmedStaffCount: confirmedStaff.length,
            checkedInCount: checkedIn.length,
            avgFeedbackRating: avgRating,
            photosCount: event._count.photos,
            commentsCount: event._count.comments
          }
        })
      }
    }

    const events = Array.from(eventsMap.values()).sort(
      (a, b) => new Date(b.startDateTime).getTime() - new Date(a.startDateTime).getTime()
    )

    return { success: true, data: events }
  } catch (error) {
    console.error("Failed to get home event history:", error)
    return { error: "Failed to load event history" }
  }
}

// ============================================
// STAFF AVAILABILITY RESPONSES
// ============================================

// Staff respond to event request with availability
export async function submitStaffAvailability(data: {
  requestId: string
  availability: boolean[]
  notes?: string
}) {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }

  try {
    const request = await db.eventRequest.findUnique({
      where: { id: data.requestId },
      include: { geriatricHome: true }
    })

    if (!request) return { error: "Request not found" }
    if (request.status !== 'GATHERING_AVAILABILITY') {
      return { error: "This request is no longer accepting responses" }
    }

    // Validate availability array matches preferred dates
    const preferredDates = JSON.parse(request.preferredDates || '[]')
    if (data.availability.length !== preferredDates.length) {
      return { error: "Invalid availability data" }
    }

    // Create or update response
    await db.eventRequestResponse.upsert({
      where: {
        requestId_staffId: {
          requestId: data.requestId,
          staffId: session.user.id
        }
      },
      create: {
        requestId: data.requestId,
        staffId: session.user.id,
        availability: JSON.stringify(data.availability),
        notes: data.notes
      },
      update: {
        availability: JSON.stringify(data.availability),
        notes: data.notes,
        respondedAt: new Date()
      }
    })

    // Check if we have enough responses - notify admin
    const responseCount = await db.eventRequestResponse.count({
      where: { requestId: data.requestId }
    })

    if (responseCount >= 3) {
      // Notify admins that we have responses
      const admins = await db.user.findMany({
        where: { role: 'ADMIN', status: 'ACTIVE' }
      })

      for (const admin of admins) {
        await db.notification.create({
          data: {
            userId: admin.id,
            type: 'EVENT_REQUEST_READY',
            title: 'Event Request Ready for Review',
            message: `"${request.customTitle}" at ${request.geriatricHome.name} has received ${responseCount} staff availability responses`,
            link: `/admin/event-requests/${data.requestId}`
          }
        })
      }
    }

    revalidatePath(`/staff/event-requests/${data.requestId}`)
    revalidatePath('/staff/event-requests')
    return { success: true }
  } catch (error) {
    console.error("Failed to submit availability:", error)
    return { error: "Failed to submit availability" }
  }
}

// Get pending requests needing staff response
export async function getPendingRequestsForStaff() {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }

  try {
    const requests = await db.eventRequest.findMany({
      where: {
        status: 'GATHERING_AVAILABILITY'
      },
      include: {
        geriatricHome: {
          select: {
            id: true,
            name: true,
            address: true
          }
        },
        responses: {
          where: { staffId: session.user.id }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return { success: true, data: requests }
  } catch (error) {
    console.error("Failed to get pending requests:", error)
    return { error: "Failed to load requests" }
  }
}

// Get request detail with all staff responses (for admin)
export async function getRequestWithResponses(requestId: string) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') return { error: "Unauthorized" }

  try {
    const request = await db.eventRequest.findUnique({
      where: { id: requestId },
      include: {
        geriatricHome: {
          select: {
            id: true,
            name: true,
            address: true,
            contactName: true,
            contactPhone: true
          }
        },
        responses: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                preferredName: true,
                image: true,
                role: true,
                phone: true
              }
            }
          }
        }
      }
    })

    if (!request) return { error: "Request not found" }

    // Calculate availability summary for each date option
    const preferredDates = JSON.parse(request.preferredDates || '[]')
    const availabilitySummary = preferredDates.map((_: any, index: number) => {
      const availableStaff = request.responses.filter(response => {
        const availability = JSON.parse(response.availability)
        return availability[index] === true
      })
      return {
        dateIndex: index,
        availableCount: availableStaff.length,
        availableStaff: availableStaff.map(r => ({
          id: r.user.id,
          name: r.user.preferredName || r.user.name,
          role: r.user.role
        }))
      }
    })

    return {
      success: true,
      data: {
        ...request,
        availabilitySummary
      }
    }
  } catch (error) {
    console.error("Failed to get request with responses:", error)
    return { error: "Failed to load request" }
  }
}

// Admin approve with selected date
export async function approveRequestWithSelectedDate(data: {
  requestId: string
  selectedDateIndex: number
  locationId?: string
}) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') return { error: "Unauthorized" }

  try {
    const request = await db.eventRequest.findUnique({
      where: { id: data.requestId },
      include: {
        geriatricHome: true,
        responses: {
          include: { user: true }
        }
      }
    })

    if (!request) return { error: "Request not found" }
    if (request.status !== 'GATHERING_AVAILABILITY') {
      return { error: "Request is not in availability gathering phase" }
    }

    const preferredDates = JSON.parse(request.preferredDates || '[]')
    if (data.selectedDateIndex < 0 || data.selectedDateIndex >= preferredDates.length) {
      return { error: "Invalid date selection" }
    }

    const selectedDate = preferredDates[data.selectedDateIndex]

    // Create or find location
    let locationId = data.locationId
    if (!locationId) {
      if (request.customLocationName) {
        const location = await db.location.create({
          data: {
            name: request.customLocationName,
            address: request.customLocationAddress || request.customLocationName,
            type: 'HOME',
            updatedAt: new Date()
          }
        })
        locationId = location.id
      } else {
        const location = await db.location.create({
          data: {
            name: request.geriatricHome.name,
            address: request.geriatricHome.address,
            type: 'HOME',
            updatedAt: new Date()
          }
        })
        locationId = location.id
      }
    }

    // Create the event
    const event = await db.event.create({
      data: {
        title: request.customTitle!,
        description: request.customDescription,
        startDateTime: new Date(selectedDate.startDateTime),
        endDateTime: new Date(selectedDate.endDateTime),
        locationId,
        geriatricHomeId: request.geriatricHomeId,
        maxAttendees: request.expectedAttendees || 20,
        status: 'PUBLISHED',
        origin: 'HOME_REQUESTED',
        updatedAt: new Date()
      }
    })

    // Update request
    await db.eventRequest.update({
      where: { id: data.requestId },
      data: {
        status: 'APPROVED',
        reviewedBy: session.user.id,
        reviewedAt: new Date(),
        selectedDateIndex: data.selectedDateIndex,
        approvedEventId: event.id
      }
    })

    // Auto-confirm staff who said they were available
    for (const response of request.responses) {
      const availability = JSON.parse(response.availability)
      if (availability[data.selectedDateIndex] === true) {
        await db.eventAttendance.create({
          data: {
            eventId: event.id,
            userId: response.staffId,
            status: 'YES',
            updatedAt: new Date()
          }
        })
      }
    }

    // Notify facility
    await db.notification.create({
      data: {
        userId: request.requestedBy,
        type: 'EVENT_REQUEST_APPROVED',
        title: 'Event Request Approved',
        message: `Your request for "${request.customTitle}" has been approved and scheduled`,
        link: `/events/${event.id}`
      }
    })

    // Notify confirmed staff
    for (const response of request.responses) {
      const availability = JSON.parse(response.availability)
      if (availability[data.selectedDateIndex] === true) {
        await db.notification.create({
          data: {
            userId: response.staffId,
            type: 'EVENT_CONFIRMED',
            title: 'Event Confirmed',
            message: `"${request.customTitle}" at ${request.geriatricHome.name} has been confirmed for your selected date`,
            link: `/staff/events/${event.id}`
          }
        })
      }
    }

    await prisma.auditLog.create({
      data: {
        action: 'EVENT_REQUEST_APPROVED_WITH_DATE',
        details: JSON.stringify({ requestId: data.requestId, eventId: event.id, selectedDateIndex: data.selectedDateIndex }),
        userId: session.user.id
      }
    })

    // Schedule email reminders for the new event
    try {
      await scheduleEventReminders(event.id)
      console.log('✅ Email reminders scheduled for approved event:', event.id)
    } catch (reminderError) {
      console.error('❌ Failed to schedule reminders:', reminderError)
    }

    revalidatePath('/admin/event-requests')
    revalidatePath('/staff/event-requests')
    revalidatePath('/dashboard/requests')
    revalidatePath(`/events/${event.id}`)

    return { success: true, eventId: event.id }
  } catch (error) {
    console.error("Failed to approve request:", error)
    return { error: "Failed to approve request" }
  }
}
