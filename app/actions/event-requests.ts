'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import type { Prisma, PrismaClient } from "@prisma/client"
import { scheduleEventReminders } from "./email-reminders"
import { logger } from "@/lib/logger"
import { sendEmailWithRetry } from "@/lib/email/service"
import { generateCalendarLinks, formatEventDate, formatEventTime, getCalendarSectionHtml } from "@/lib/email/calendar"
import { resolveHomeNotificationRecipient } from "@/lib/home-notification-recipient"
import { parseDMYDate } from "@/lib/date-utils"

// Type-safe prisma client reference
const db = prisma as PrismaClient & Record<string, unknown>

function parseEventDateTime(value: unknown): Date | null {
  if (!value) return null
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value
  if (typeof value !== 'string') return null

  const trimmed = value.trim()
  if (!trimmed) return null

  const parsed = new Date(trimmed)
  if (!isNaN(parsed.getTime())) return parsed

  const dmy = parseDMYDate(trimmed)
  return dmy && !isNaN(dmy.getTime()) ? dmy : null
}

function getStringByKeyCandidates(obj: Record<string, unknown> | undefined, candidates: string[]): string | null {
  if (!obj) return null
  for (const key of candidates) {
    const value = obj[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return null
}

function extractDateFromTemplate(formFieldsJson: string | null, formData: Record<string, unknown>, mode: 'start' | 'end'): string | null {
  if (!formFieldsJson?.trim()) return null

  try {
    const fields = JSON.parse(formFieldsJson) as Array<{ id?: string; type?: string; label?: string }>
    const dateFields = fields.filter((f) => f?.type === 'date' && typeof f.id === 'string')
    if (dateFields.length === 0) return null

    const match = dateFields.find((field) => {
      const label = (field.label || '').toLowerCase()
      if (!label) return false
      if (label.includes('birth') || label.includes('dob')) return false
      if (mode === 'start') {
        return label.includes('event') || label.includes('start') || label === 'date'
      }
      return label.includes('end')
    })

    if (!match?.id) return null
    const value = formData[match.id]
    return typeof value === 'string' && value.trim() ? value.trim() : null
  } catch {
    return null
  }
}

function buildEventEmailVariables(params: {
  name: string
  eventTitle: string
  startDateTime: Date
  endDateTime: Date
  eventLocation: string
  eventLink: string
}) {
  const { name, eventTitle, startDateTime, endDateTime, eventLocation, eventLink } = params

  const eventDate = formatEventDate(startDateTime)
  const eventTime = formatEventTime(startDateTime, endDateTime)
  const eventDateISO = startDateTime.toISOString().slice(0, 10)
  const eventTimeISO = `${String(startDateTime.getHours()).padStart(2, '0')}:${String(startDateTime.getMinutes()).padStart(2, '0')}`
  const calendarLinks = generateCalendarLinks({
    title: eventTitle,
    startDateTime,
    endDateTime,
    location: eventLocation,
    url: eventLink,
  })

  return {
    name,
    eventTitle,
    eventDate,
    eventTime,
    eventDateISO,
    eventTimeISO,
    eventLocation,
    googleMapsUrl: calendarLinks.googleMaps || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(eventLocation)}`,
    eventLink,
    calendarLink: calendarLinks.webcal,
    googleCalendarLink: calendarLinks.google,
    calendarSection: getCalendarSectionHtml(calendarLinks),
  }
}

function parseJsonIds(value: string | null | undefined): string[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value) as unknown
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

function safeTemplateMin(min: number | null | undefined): number {
  if (typeof min !== 'number' || Number.isNaN(min)) return 0
  return Math.max(0, Math.floor(min))
}

function hasFacilitatorTargeting(request: {
  requiredGroupIds?: string | null
  requiredPersonIds?: string | null
  minFacilitatorsRequired?: number | null
}) {
  return parseJsonIds(request.requiredGroupIds).length > 0 || parseJsonIds(request.requiredPersonIds).length > 0 || safeTemplateMin(request.minFacilitatorsRequired) > 0
}

async function getEligibleFacilitatorUserIdsFromSnapshot(params: {
  requiredGroupIdsJson: string | null | undefined
  requiredPersonIdsJson: string | null | undefined
}) {
  const groupIds = parseJsonIds(params.requiredGroupIdsJson)
  const personIds = parseJsonIds(params.requiredPersonIdsJson)

  const groupMembers = groupIds.length > 0
    ? await db.groupMember.findMany({
        where: { groupId: { in: groupIds }, isActive: true },
        select: { userId: true }
      })
    : []

  const candidateIds = Array.from(new Set([...groupMembers.map((m) => m.userId), ...personIds]))
  if (candidateIds.length === 0) return [] as string[]

  const eligibleUsers = await db.user.findMany({
    where: {
      id: { in: candidateIds },
      status: 'ACTIVE',
      OR: [
        { role: 'FACILITATOR' },
        { roleAssignments: { some: { role: 'FACILITATOR', isActive: true } } }
      ]
    },
    select: { id: true }
  })

  return eligibleUsers.map((user) => user.id)
}

async function getFacilitatorRsvpSummary(requestId: string) {
  const request = await db.eventRequest.findUnique({
    where: { id: requestId },
    select: {
      id: true,
      minFacilitatorsRequired: true,
      autoFinalApproveWhenMinMet: true,
      rsvpDeadlineAt: true,
      workflowStage: true,
      facilitatorThresholdMetAt: true
    }
  })
  if (!request) return null

  const rsvps = await db.eventRequestFacilitatorRsvp.findMany({
    where: { requestId },
    include: {
      user: { select: { id: true, name: true, preferredName: true, role: true } }
    }
  })

  const yes = rsvps.filter((r) => r.status === 'YES')
  const no = rsvps.filter((r) => r.status === 'NO')
  const maybe = rsvps.filter((r) => r.status === 'MAYBE')
  const pending = rsvps.filter((r) => r.status === 'PENDING')
  const minRequired = safeTemplateMin(request.minFacilitatorsRequired)
  const minMet = minRequired > 0 ? yes.length >= minRequired : yes.length > 0
  const allResponded = pending.length === 0 && rsvps.length > 0
  const deadlineReached = !!request.rsvpDeadlineAt && new Date() >= new Date(request.rsvpDeadlineAt)

  return {
    request,
    totals: {
      totalTargets: rsvps.length,
      yes: yes.length,
      no: no.length,
      maybe: maybe.length,
      pending: pending.length,
      minRequired,
      minMet,
      allResponded,
      deadlineReached
    },
    participants: {
      yes: yes.map((item) => ({ id: item.user.id, name: item.user.preferredName || item.user.name || 'User' })),
      no: no.map((item) => ({ id: item.user.id, name: item.user.preferredName || item.user.name || 'User' })),
      maybe: maybe.map((item) => ({ id: item.user.id, name: item.user.preferredName || item.user.name || 'User' })),
      pending: pending.map((item) => ({ id: item.user.id, name: item.user.preferredName || item.user.name || 'User' }))
    }
  }
}

async function notifyAdminsFacilitatorSummary(requestId: string, summaryText: string) {
  const admins = await db.user.findMany({
    where: { role: 'ADMIN', status: 'ACTIVE' },
    select: { id: true }
  })
  if (admins.length === 0) return

  await db.notification.createMany({
    data: admins.map((admin) => ({
      userId: admin.id,
      type: 'EVENT_REQUEST_READY',
      title: 'Facilitator RSVP Summary Ready',
      message: summaryText,
      link: `/admin/event-requests/${requestId}`
    }))
  })
}

async function autoFinalizeEventRequest(requestId: string, reviewerUserId: string) {
  const request = await db.eventRequest.findUnique({
    where: { id: requestId },
    include: {
      geriatricHome: true,
      existingEvent: true
    }
  })

  if (!request) return { error: 'Request not found' }
  if (request.status !== 'PENDING') return { error: 'Request is no longer pending' }

  let approvedEventId = request.existingEventId
  const approvedEventIds: string[] = request.existingEventId ? [request.existingEventId] : []

  if (request.type === 'CREATE_CUSTOM') {
    let locationId: string
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

    const eventTitle = request.customTitle
    const eventStartDateTime = request.customStartDateTime
    const eventEndDateTime = request.customEndDateTime
    if (!eventTitle || !eventStartDateTime || !eventEndDateTime) {
      return { error: 'Missing custom event schedule for auto-approval' }
    }

    const parsedPreferredDates = (() => {
      if (!request.preferredDates) return [] as Array<{ startDateTime: Date; endDateTime: Date }>
      try {
        const slots = JSON.parse(request.preferredDates) as Array<{ startDateTime?: string; endDateTime?: string }>
        return slots
          .map((slot) => ({
            startDateTime: parseEventDateTime(slot.startDateTime),
            endDateTime: parseEventDateTime(slot.endDateTime),
          }))
          .filter((slot) => slot.startDateTime && slot.endDateTime && slot.endDateTime > slot.startDateTime)
          .map((slot) => ({ startDateTime: slot.startDateTime!, endDateTime: slot.endDateTime! }))
      } catch {
        return []
      }
    })()

    const eventSlots = parsedPreferredDates.length > 0
      ? parsedPreferredDates
      : [{ startDateTime: eventStartDateTime, endDateTime: eventEndDateTime }]

    for (const slot of eventSlots) {
      const event = await db.event.create({
        data: {
          title: eventTitle,
          description: request.customDescription || undefined,
          startDateTime: slot.startDateTime,
          endDateTime: slot.endDateTime,
          locationId,
          geriatricHomeId: request.geriatricHomeId,
          status: 'PUBLISHED',
          origin: 'HOME_REQUESTED',
          homeAdminReminderDays: request.homeAdminReminderDays || 5,
          staffReminderDays: request.staffReminderDays || 3,
          reminderMessage: request.reminderMessage || null,
          updatedAt: new Date()
        }
      })
      approvedEventIds.push(event.id)
    }

    approvedEventId = approvedEventIds[0] || null
  } else if (request.existingEventId) {
    await db.event.update({
      where: { id: request.existingEventId },
      data: { geriatricHomeId: request.geriatricHomeId }
    })
  }

  await db.eventRequest.update({
    where: { id: requestId },
    data: {
      status: 'APPROVED',
      workflowStage: 'FINAL_APPROVED',
      reviewedBy: reviewerUserId,
      reviewedAt: new Date(),
      approvedEventId: request.type === 'CREATE_CUSTOM' ? approvedEventId : null
    }
  })

  await db.notification.create({
    data: {
      userId: request.geriatricHome.userId,
      type: 'EVENT_REQUEST_APPROVED',
      title: 'Event Request Approved',
      message: `Your event request has been approved automatically after facilitator confirmations.`,
      link: '/dashboard/my-events'
    }
  })

  await prisma.auditLog.create({
    data: {
      action: 'EVENT_REQUEST_AUTO_APPROVED',
      details: JSON.stringify({ requestId, approvedEventId }),
      userId: reviewerUserId
    }
  })

  if (approvedEventIds.length > 0) {
    for (const eventId of approvedEventIds) {
      try {
        await scheduleEventReminders(eventId)
      } catch (error) {
        logger.error('Failed to schedule auto-approved event reminder', error)
      }
    }
  }

  revalidatePath('/admin/event-requests')
  revalidatePath('/staff/events')
  revalidatePath('/dashboard/requests')
  revalidatePath('/dashboard/my-events')

  return { success: true, approvedEventId }
}

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
    revalidatePath('/dashboard/events')
    revalidatePath('/admin/event-requests')

    return { success: true, data: request }
  } catch (error) {
    logger.serverAction("Failed to request event", error)
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
    const requiredTemplate = event.requiredFormTemplate

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
          requestedBy: session.user.id,
          workflowStage: 'PENDING_INITIAL_ADMIN_APPROVAL',
          requiredGroupIds: requiredTemplate.requiredGroupIds || null,
          requiredPersonIds: requiredTemplate.requiredPersonIds || null,
          minFacilitatorsRequired: safeTemplateMin(requiredTemplate.minFacilitatorsRequired),
          autoFinalApproveWhenMinMet: !!requiredTemplate.autoFinalApproveWhenMinMet
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
    revalidatePath('/dashboard/events')
    revalidatePath('/admin/event-requests')

    return { success: true, data: { request, submission } }
  } catch (error) {
    logger.serverAction("Submit event sign-up form error", error)
    const msg = error instanceof Error ? error.message : "Unknown error"
    return { error: process.env.NODE_ENV === "development" ? `Failed to submit event request: ${msg}` : "Failed to submit event request" }
  }
}

// Create a custom event request
export async function createCustomEventRequest(data: {
  title?: string
  description?: string
  startDateTime?: string
  endDateTime?: string
  locationName?: string
  locationAddress?: string
  notes?: string
  expectedAttendees?: number
  programType?: string
  preferredDates?: Array<{ startDateTime: string, endDateTime: string }>
  selectedEventId?: string
  formTemplateId?: string
  formData?: Record<string, unknown>
}) {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }

  try {
    // Get home for this user
    const home = await db.geriatricHome.findUnique({
      where: { userId: session.user.id }
    })

    if (!home) return { error: "No home found for this user" }

    // Handle form template submission
    if (data.formTemplateId && data.formData) {
      // Validate form template exists
      const formTemplate = await db.formTemplate.findUnique({
        where: { id: data.formTemplateId },
        select: {
          id: true,
          title: true,
          formFields: true,
          requiredGroupIds: true,
          requiredPersonIds: true,
          minFacilitatorsRequired: true,
          autoFinalApproveWhenMinMet: true,
          facilitatorRsvpDeadlineHours: true
        }
      })

      if (!formTemplate) return { error: "Form template not found" }

      // Extract event details from form data if available
      const formData = data.formData as Record<string, unknown>
      const eventTitle = getStringByKeyCandidates(formData, ['title', 'Title', 'eventTitle', 'EventTitle']) || formTemplate.title
      const eventDescription = getStringByKeyCandidates(formData, ['description', 'Description']) || data.description || null

      const startCandidate =
        data.startDateTime ||
        getStringByKeyCandidates(formData, ['startDateTime', 'StartDateTime', 'date', 'Date']) ||
        extractDateFromTemplate(formTemplate.formFields, formData, 'start') ||
        null

      const endCandidate =
        data.endDateTime ||
        getStringByKeyCandidates(formData, ['endDateTime', 'EndDateTime']) ||
        extractDateFromTemplate(formTemplate.formFields, formData, 'end') ||
        null

      const eventStartDateTime = parseEventDateTime(startCandidate)
      let eventEndDateTime = parseEventDateTime(endCandidate)

      if (eventStartDateTime && !eventEndDateTime) {
        eventEndDateTime = new Date(eventStartDateTime.getTime() + 60 * 60 * 1000)
      }

      if (!eventTitle || !eventStartDateTime || !eventEndDateTime) {
        return { error: "Missing event title or schedule. Please include an event date/time before submitting." }
      }

      const preferredDates = (data.preferredDates || [])
        .map((slot) => ({
          startDateTime: parseEventDateTime(slot.startDateTime),
          endDateTime: parseEventDateTime(slot.endDateTime),
        }))
        .filter((slot) => slot.startDateTime && slot.endDateTime && slot.endDateTime > slot.startDateTime)
        .map((slot) => ({
          startDateTime: slot.startDateTime!.toISOString(),
          endDateTime: slot.endDateTime!.toISOString(),
        }))

      const firstOccurrence = preferredDates.length > 0
        ? preferredDates[0]
        : { startDateTime: eventStartDateTime.toISOString(), endDateTime: eventEndDateTime.toISOString() }

      // Create the event request
      const request = await db.eventRequest.create({
        data: {
          geriatricHomeId: home.id,
          type: 'CREATE_CUSTOM',
          requestedBy: session.user.id,
          customTitle: eventTitle,
          customDescription: eventDescription,
          customStartDateTime: new Date(firstOccurrence.startDateTime),
          customEndDateTime: new Date(firstOccurrence.endDateTime),
          preferredDates: preferredDates.length > 0 ? JSON.stringify(preferredDates) : null,
          notes: (data.formData.notes as string) || (data.formData.Notes as string) || null,
          expectedAttendees: (data.formData.expectedAttendees as number) || (data.formData.ExpectedAttendees as number) || null,
          status: 'PENDING',
          workflowStage: 'PENDING_INITIAL_ADMIN_APPROVAL',
          requiredGroupIds: formTemplate.requiredGroupIds || null,
          requiredPersonIds: formTemplate.requiredPersonIds || null,
          minFacilitatorsRequired: safeTemplateMin(formTemplate.minFacilitatorsRequired),
          autoFinalApproveWhenMinMet: !!formTemplate.autoFinalApproveWhenMinMet,
          requestedAt: new Date(),
          updatedAt: new Date()
        }
      })

      // Create form submission
      const formSubmission = await db.formSubmission.create({
        data: {
          templateId: data.formTemplateId,
          formData: JSON.stringify(data.formData),
          submittedBy: session.user.id,
          eventRequestId: request.id
        }
      })

      // Update form template usage count
      await db.formTemplate.update({
        where: { id: data.formTemplateId },
        data: { usageCount: { increment: 1 } }
      })

      // Notify admins
      const admins = await db.user.findMany({
        where: { role: 'ADMIN', status: 'ACTIVE' }
      })

      for (const admin of admins) {
        await db.notification.create({
          data: {
            userId: admin.id,
            type: 'EVENT_REQUEST_SUBMITTED',
            title: 'New Event Request',
            message: `${home.name} has submitted an event request using form: "${formTemplate.title}"`,
            link: `/admin/event-requests/${request.id}`
          }
        })
      }

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: 'EVENT_REQUEST_WITH_FORM_SUBMITTED',
          details: JSON.stringify({ 
            requestId: request.id, 
            homeId: home.id, 
            formTemplateId: data.formTemplateId,
            formTitle: formTemplate.title
          }),
          userId: session.user.id
        }
      })

      revalidatePath('/dashboard/requests')
      revalidatePath('/admin/event-requests')

      return { success: true, data: request }
    }

    // Legacy handling - no form template
    if (!data.title?.trim()) return { error: "Title is required" }
    if (!data.startDateTime) return { error: "Start date/time is required" }
    if (!data.endDateTime) return { error: "End date/time is required" }

    // Support either single date or multiple preferred dates
    let status = 'PENDING'
    let preferredDatesJson = null

    if (data.preferredDates && data.preferredDates.length > 0) {
      status = 'GATHERING_AVAILABILITY'
      preferredDatesJson = JSON.stringify(data.preferredDates)
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
          role: { in: ['FACILITATOR'] },
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
            link: `/staff/events`
          }
        })
      }
    } else {
      // Notify admins
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
        details: JSON.stringify({ 
          requestId: request.id, 
          homeId: home.id, 
          title: data.title
        }),
        userId: session.user.id
      }
    })

    revalidatePath('/dashboard/requests')
    revalidatePath('/dashboard/events')
    revalidatePath('/admin/event-requests')
    revalidatePath('/staff/events')

    return { success: true, data: request }
  } catch (error) {
    logger.serverAction("Failed to create custom event request", error)
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
    logger.serverAction("Failed to cancel request", error)
    return { error: "Failed to cancel request" }
  }
}

export async function updateHomeEventRequest(
  requestId: string,
  updates: {
    title?: string
    description?: string
    startDateTime?: string
    endDateTime?: string
    locationName?: string
    locationAddress?: string
    notes?: string
    expectedAttendees?: number
    formData?: Record<string, unknown>
    preferredDates?: Array<{ startDateTime: string; endDateTime: string }>
  }
) {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }

  try {
    const home = await db.geriatricHome.findUnique({ where: { userId: session.user.id } })
    if (!home) return { error: "No home found" }

    const request = await db.eventRequest.findUnique({
      where: { id: requestId },
      include: { formSubmission: true }
    })

    if (!request) return { error: "Request not found" }
    if (request.geriatricHomeId !== home.id) return { error: "Unauthorized" }
    if (request.type !== 'CREATE_CUSTOM') return { error: "Only custom requests can be edited" }

    const canEditPending = request.status === 'PENDING'
    const canEditRejected = request.status === 'REJECTED' && request.editAccessGranted
    if (!canEditPending && !canEditRejected) {
      return { error: "This request cannot be edited" }
    }

    const nextTitle = updates.title?.trim() || request.customTitle

    const nextPreferredDates = (updates.preferredDates || [])
      .map((slot) => ({
        startDateTime: parseEventDateTime(slot.startDateTime),
        endDateTime: parseEventDateTime(slot.endDateTime),
      }))
      .filter((slot) => slot.startDateTime && slot.endDateTime && slot.endDateTime > slot.startDateTime)
      .map((slot) => ({
        startDateTime: slot.startDateTime!.toISOString(),
        endDateTime: slot.endDateTime!.toISOString(),
      }))

    const startDate = nextPreferredDates.length > 0
      ? new Date(nextPreferredDates[0].startDateTime)
      : (parseEventDateTime(updates.startDateTime) || request.customStartDateTime)

    let endDate = nextPreferredDates.length > 0
      ? new Date(nextPreferredDates[0].endDateTime)
      : (parseEventDateTime(updates.endDateTime) || request.customEndDateTime)

    if (startDate && !endDate) endDate = new Date(startDate.getTime() + 60 * 60 * 1000)

    if (!nextTitle || !startDate || !endDate) {
      return { error: "Title, start date/time, and end date/time are required" }
    }

    await db.$transaction(async (tx) => {
      await tx.eventRequest.update({
        where: { id: requestId },
        data: {
          customTitle: nextTitle,
          customDescription: updates.description ?? request.customDescription,
          customStartDateTime: startDate,
          customEndDateTime: endDate,
          preferredDates: nextPreferredDates.length > 0
            ? JSON.stringify(nextPreferredDates)
            : request.preferredDates,
          customLocationName: updates.locationName ?? request.customLocationName,
          customLocationAddress: updates.locationAddress ?? request.customLocationAddress,
          notes: updates.notes ?? request.notes,
          expectedAttendees: updates.expectedAttendees ?? request.expectedAttendees,
          status: canEditRejected ? 'PENDING' : request.status,
          reviewedBy: canEditRejected ? null : request.reviewedBy,
          reviewedAt: canEditRejected ? null : request.reviewedAt,
          rejectionReason: canEditRejected ? null : request.rejectionReason,
          editAccessGranted: canEditRejected ? false : request.editAccessGranted,
          editAccessGrantedBy: canEditRejected ? null : request.editAccessGrantedBy,
          editAccessGrantedAt: canEditRejected ? null : request.editAccessGrantedAt,
          editAccessNote: canEditRejected ? null : request.editAccessNote,
          updatedAt: new Date()
        }
      })

      if (request.formSubmission?.id && updates.formData) {
        await tx.formSubmission.update({
          where: { id: request.formSubmission.id },
          data: {
            formData: JSON.stringify(updates.formData)
          }
        })
      }
    })

    if (canEditRejected) {
      const admins = await db.user.findMany({ where: { role: 'ADMIN', status: 'ACTIVE' }, select: { id: true } })
      if (admins.length > 0) {
        await db.notification.createMany({
          data: admins.map((admin) => ({
            userId: admin.id,
            type: 'EVENT_REQUEST_SUBMITTED',
            title: 'Event Request Resubmitted',
            message: `${home.name} updated and resubmitted "${nextTitle}" for review`,
            link: `/admin/event-requests/${requestId}`
          }))
        })
      }
    }

    await prisma.auditLog.create({
      data: {
        action: canEditRejected ? 'EVENT_REQUEST_RESUBMITTED' : 'EVENT_REQUEST_UPDATED_BY_HOME',
        details: JSON.stringify({ requestId, statusAfter: canEditRejected ? 'PENDING' : request.status }),
        userId: session.user.id
      }
    })

    revalidatePath('/dashboard/requests')
    revalidatePath(`/dashboard/requests/${requestId}/edit`)
    revalidatePath('/admin/event-requests')
    revalidatePath(`/admin/event-requests/${requestId}`)

    return { success: true }
  } catch (error) {
    logger.serverAction("Failed to update event request", error)
    return { error: "Failed to update request" }
  }
}

export async function grantEventRequestEditAccess(requestId: string, note?: string) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') return { error: "Unauthorized" }

  try {
    const request = await db.eventRequest.findUnique({
      where: { id: requestId },
      include: { geriatricHome: true }
    })

    if (!request) return { error: "Request not found" }
    if (request.status !== 'REJECTED') return { error: "Edit access can only be granted for rejected requests" }

    await db.eventRequest.update({
      where: { id: requestId },
      data: {
        editAccessGranted: true,
        editAccessGrantedBy: session.user.id,
        editAccessGrantedAt: new Date(),
        editAccessNote: note?.trim() || null,
        updatedAt: new Date()
      }
    })

    await db.notification.create({
      data: {
        userId: request.geriatricHome.userId,
        type: 'EVENT_REQUEST_EDIT_GRANTED',
        title: 'Edit Access Granted',
        message: `You can now edit and resubmit your request "${request.customTitle || 'Event'}".`,
        link: `/dashboard/requests/${requestId}/edit`
      }
    })

    await prisma.auditLog.create({
      data: {
        action: 'EVENT_REQUEST_EDIT_ACCESS_GRANTED',
        details: JSON.stringify({ requestId, note: note || null }),
        userId: session.user.id
      }
    })

    revalidatePath('/admin/event-requests')
    revalidatePath(`/admin/event-requests/${requestId}`)
    revalidatePath('/dashboard/requests')

    return { success: true }
  } catch (error) {
    logger.serverAction("Failed to grant event request edit access", error)
    return { error: "Failed to grant edit access" }
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
    logger.serverAction("Failed to get requests", error)
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
    const where: Prisma.EventRequestWhereInput = {}

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
    logger.serverAction("Failed to get requests", error)
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
          include: { template: { select: { title: true, formFields: true } } }
        },
        facilitatorRsvps: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                preferredName: true,
                role: true
              }
            }
          },
          orderBy: { createdAt: 'asc' }
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
    logger.serverAction("Failed to get request detail", error)
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
    homeAdminReminderDays?: number
    staffReminderDays?: number
    reminderMessage?: string
  }
) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') return { error: "Unauthorized" }

  try {
    const request = await db.eventRequest.findUnique({
      where: { id: requestId },
      include: {
        geriatricHome: true,
        existingEvent: true,
        formSubmission: {
          include: {
            template: {
              select: {
                requiredGroupIds: true,
                requiredPersonIds: true,
                minFacilitatorsRequired: true,
                autoFinalApproveWhenMinMet: true,
                facilitatorRsvpDeadlineHours: true
              }
            }
          }
        }
      }
    })

    if (!request) return { error: "Request not found" }
    if (!['PENDING'].includes(request.status)) return { error: "Request is not pending" }

    const templateSnapshot = request.formSubmission?.template
    const requiredGroupIds = request.requiredGroupIds || templateSnapshot?.requiredGroupIds || null
    const requiredPersonIds = request.requiredPersonIds || templateSnapshot?.requiredPersonIds || null
    const minFacilitatorsRequired = safeTemplateMin(request.minFacilitatorsRequired ?? templateSnapshot?.minFacilitatorsRequired)
    const autoFinalApproveWhenMinMet = request.autoFinalApproveWhenMinMet ?? !!templateSnapshot?.autoFinalApproveWhenMinMet
    const deadlineHours = Math.max(1, templateSnapshot?.facilitatorRsvpDeadlineHours || 48)

    const hasTargeting = parseJsonIds(requiredGroupIds).length > 0 || parseJsonIds(requiredPersonIds).length > 0
    const needsFacilitatorPhase = hasTargeting && minFacilitatorsRequired > 0
    const workflowStage = request.workflowStage || 'PENDING_INITIAL_ADMIN_APPROVAL'

    if (needsFacilitatorPhase && workflowStage === 'PENDING_INITIAL_ADMIN_APPROVAL') {
      const targetUserIds = await getEligibleFacilitatorUserIdsFromSnapshot({
        requiredGroupIdsJson: requiredGroupIds,
        requiredPersonIdsJson: requiredPersonIds
      })

      if (targetUserIds.length === 0) {
        return { error: 'No active facilitators found in the required groups/personnel. Update the form targeting first.' }
      }

      const now = new Date()
      const deadline = new Date(now.getTime() + deadlineHours * 60 * 60 * 1000)

      await db.$transaction(async (tx) => {
        await tx.eventRequest.update({
          where: { id: requestId },
          data: {
            workflowStage: 'FACILITATOR_RSVP_OPEN',
            requiredGroupIds,
            requiredPersonIds,
            minFacilitatorsRequired,
            autoFinalApproveWhenMinMet,
            rsvpOpenedAt: now,
            rsvpDeadlineAt: deadline,
            updatedAt: now
          }
        })

        await tx.eventRequestFacilitatorRsvp.createMany({
          data: targetUserIds.map((userId) => ({
            requestId,
            userId,
            status: 'PENDING'
          })),
          skipDuplicates: true
        })

        await tx.notification.createMany({
          data: targetUserIds.map((userId) => ({
            userId,
            type: 'EVENT_REQUEST_AVAILABILITY',
            title: 'Facilitator RSVP Needed',
            message: `${request.geriatricHome.name} needs facilitator RSVP for "${request.customTitle || request.existingEvent?.title || 'Event request'}"`,
            link: '/staff/events'
          }))
        })
      })

      await prisma.auditLog.create({
        data: {
          action: 'EVENT_REQUEST_PREAPPROVED_FOR_FACILITATOR_RSVP',
          details: JSON.stringify({ requestId, targetCount: targetUserIds.length, minFacilitatorsRequired, deadlineHours }),
          userId: session.user.id
        }
      })

      revalidatePath('/admin/event-requests')
      revalidatePath(`/admin/event-requests/${requestId}`)
      revalidatePath('/staff/events')

      return { success: true, stage: 'FACILITATOR_RSVP_OPEN' }
    }

    if (needsFacilitatorPhase && workflowStage === 'FACILITATOR_RSVP_OPEN') {
      return { error: 'Facilitator RSVP phase is still open. Close RSVP or wait for threshold/deadline.' }
    }

    let approvedEventId = request.existingEventId
    let approvedEventIds: string[] = request.existingEventId ? [request.existingEventId] : []

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
        return { error: "Request is missing title or schedule. Ask the home admin to update and resubmit." }
      }

      const parsedPreferredDates = (() => {
        if (!request.preferredDates) return [] as Array<{ startDateTime: Date; endDateTime: Date }>
        try {
          const slots = JSON.parse(request.preferredDates) as Array<{ startDateTime?: string; endDateTime?: string }>
          return slots
            .map((slot) => ({
              startDateTime: parseEventDateTime(slot.startDateTime),
              endDateTime: parseEventDateTime(slot.endDateTime),
            }))
            .filter((slot) => slot.startDateTime && slot.endDateTime && slot.endDateTime > slot.startDateTime)
            .map((slot) => ({ startDateTime: slot.startDateTime!, endDateTime: slot.endDateTime! }))
        } catch {
          return []
        }
      })()

      const eventSlots = (modifications?.startDateTime || modifications?.endDateTime || parsedPreferredDates.length === 0)
        ? [{ startDateTime: eventStartDateTime, endDateTime: eventEndDateTime }]
        : parsedPreferredDates

      const createdEvents = [] as Array<{ id: string }>
      for (const slot of eventSlots) {
        const event = await db.event.create({
          data: {
            title: eventTitle,
            description: modifications?.description || request.customDescription || undefined,
            startDateTime: slot.startDateTime,
            endDateTime: slot.endDateTime,
            locationId,
            geriatricHomeId: request.geriatricHomeId,
            status: 'PUBLISHED',
            origin: 'HOME_REQUESTED',
            homeAdminReminderDays: modifications?.homeAdminReminderDays || request.homeAdminReminderDays || 5,
            staffReminderDays: modifications?.staffReminderDays || request.staffReminderDays || 3,
            reminderMessage: modifications?.reminderMessage || request.reminderMessage || null,
            updatedAt: new Date()
          }
        })
        createdEvents.push(event)
      }

      approvedEventId = createdEvents[0]?.id || null
      approvedEventIds = createdEvents.map((event) => event.id)
    } else {
      // For existing event requests, link the home to the event
      if (!request.existingEventId) {
        throw new Error('Existing event ID is required for REQUEST_EXISTING type')
      }
      await db.event.update({
        where: { id: request.existingEventId },
        data: { geriatricHomeId: request.geriatricHomeId }
      })
      approvedEventIds = [request.existingEventId]
    }

    // Update request status
    await db.eventRequest.update({
      where: { id: requestId },
      data: {
        status: 'APPROVED',
        workflowStage: 'FINAL_APPROVED',
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

    // Send approval email to home admin
    const homeUser = await db.user.findUnique({
      where: { id: request.geriatricHome.userId },
      select: { email: true, name: true, preferredName: true }
    })

    const resolvedApprovalRecipient = resolveHomeNotificationRecipient({
      contactEmail: request.geriatricHome.contactEmail,
      useCustomNotificationEmail: (request.geriatricHome as any).useCustomNotificationEmail,
      notificationEmail: (request.geriatricHome as any).notificationEmail,
      user: { email: homeUser?.email || null },
    })

    if (resolvedApprovalRecipient.email) {
      let event: { startDateTime: Date; endDateTime: Date; location: { name: string | null; address: string | null } | null } | null = null

      if (request.type === 'CREATE_CUSTOM' && approvedEventId) {
        event = await db.event.findUnique({ where: { id: approvedEventId }, include: { location: true } })
      } else if (request.existingEventId) {
        event = await db.event.findUnique({ where: { id: request.existingEventId }, include: { location: true } })
      }

      const eventTitle = (request.type === 'CREATE_CUSTOM' ? request.customTitle : request.existingEvent?.title) || 'Event'
      const startDateTime = event?.startDateTime || request.customStartDateTime
      const endDateTime = event?.endDateTime || request.customEndDateTime
      const eventLocation = event?.location?.name || event?.location?.address || request.customLocationName || request.customLocationAddress || request.geriatricHome.name || 'TBD'
      const eventLink = `${process.env.NEXTAUTH_URL || ''}/dashboard/my-events`

      if (startDateTime && endDateTime) {
        const emailVariables = buildEventEmailVariables({
          name: homeUser?.preferredName || homeUser?.name || 'User',
          eventTitle,
          startDateTime: new Date(startDateTime),
          endDateTime: new Date(endDateTime),
          eventLocation,
          eventLink,
        })

        await sendEmailWithRetry({
          to: resolvedApprovalRecipient.email,
          templateType: 'EVENT_REQUEST_APPROVED',
          variables: emailVariables
        }, { userId: request.geriatricHome.userId })
      } else {
        await sendEmailWithRetry({
          to: resolvedApprovalRecipient.email,
          templateType: 'EVENT_REQUEST_APPROVED',
          variables: {
            name: homeUser?.preferredName || homeUser?.name || 'User',
            eventTitle,
            eventDate: 'To be confirmed',
            eventTime: 'To be confirmed',
            eventDateISO: '',
            eventTimeISO: '',
            eventLocation,
            googleMapsUrl: '',
            eventLink,
            calendarLink: '',
            googleCalendarLink: '',
            calendarSection: '',
          }
        }, { userId: request.geriatricHome.userId })
      }
    }

    // Notify staff about new approved event
    const staff = await db.user.findMany({
      where: {
        role: { in: ['FACILITATOR'] },
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

    const finalRsvpSummary = hasTargeting ? await getFacilitatorRsvpSummary(requestId) : null

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'EVENT_REQUEST_APPROVED',
        details: JSON.stringify({ requestId, approvedEventId, facilitatorRsvpSummary: finalRsvpSummary?.totals || null }),
        userId: session.user.id
      }
    })

    // Schedule email reminders for the new event
    if (approvedEventIds.length > 0) {
      try {
        for (const eventId of approvedEventIds) {
          await scheduleEventReminders(eventId)
        }
        logger.log('Email reminders scheduled for approved event(s)', { eventIds: approvedEventIds }, 'server-action')
      } catch (reminderError) {
        logger.error('Failed to schedule reminders', reminderError)
      }
    }

    revalidatePath('/admin/event-requests')
    revalidatePath('/admin/events')
    revalidatePath('/dashboard/requests')
    revalidatePath('/dashboard/my-events')
    revalidatePath('/staff/events')

    return { success: true, approvedEventId }
  } catch (error) {
    logger.serverAction("Failed to approve request", error)
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
        workflowStage: 'FINAL_DENIED',
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

    // Send rejection email to home admin
    const homeUser = await db.user.findUnique({
      where: { id: request.geriatricHome.userId },
      select: { email: true, name: true, preferredName: true }
    })

    const resolvedRejectionRecipient = resolveHomeNotificationRecipient({
      contactEmail: request.geriatricHome.contactEmail,
      useCustomNotificationEmail: (request.geriatricHome as any).useCustomNotificationEmail,
      notificationEmail: (request.geriatricHome as any).notificationEmail,
      user: { email: homeUser?.email || null },
    })

    if (resolvedRejectionRecipient.email) {
      const startDateTime = request.customStartDateTime
      const endDateTime = request.customEndDateTime
      const eventLocation = request.customLocationName || request.customLocationAddress || request.geriatricHome.name || 'TBD'
      const eventLink = `${process.env.NEXTAUTH_URL || ''}/dashboard/requests`

      if (startDateTime && endDateTime) {
        const emailVariables = {
          ...buildEventEmailVariables({
            name: homeUser?.preferredName || homeUser?.name || 'User',
            eventTitle: eventTitle || 'Event',
            startDateTime: new Date(startDateTime),
            endDateTime: new Date(endDateTime),
            eventLocation,
            eventLink,
          }),
          message: reason,
        }

        await sendEmailWithRetry({
          to: resolvedRejectionRecipient.email,
          templateType: 'EVENT_REQUEST_REJECTED',
          variables: emailVariables
        }, { userId: request.geriatricHome.userId })
      } else {
        await sendEmailWithRetry({
          to: resolvedRejectionRecipient.email,
          templateType: 'EVENT_REQUEST_REJECTED',
          variables: {
            name: homeUser?.preferredName || homeUser?.name || 'User',
            eventTitle: eventTitle || 'Event',
            eventDate: 'To be confirmed',
            eventTime: 'To be confirmed',
            eventDateISO: '',
            eventTimeISO: '',
            eventLocation,
            googleMapsUrl: '',
            eventLink,
            calendarLink: '',
            googleCalendarLink: '',
            calendarSection: '',
            message: reason,
          }
        }, { userId: request.geriatricHome.userId })
      }
    }

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
    logger.serverAction("Failed to reject request", error)
    return { error: "Failed to reject request" }
  }
}

async function evaluateFacilitatorRsvpProgress(requestId: string, actorUserId: string, options?: { manualClose?: boolean; manualReason?: string }) {
  const summary = await getFacilitatorRsvpSummary(requestId)
  if (!summary) return { error: 'Request not found' as const }

  if (summary.request.workflowStage !== 'FACILITATOR_RSVP_OPEN') {
    return { success: true, summary }
  }

  const complete = summary.totals.minMet || summary.totals.allResponded || summary.totals.deadlineReached || !!options?.manualClose
  if (!complete) return { success: true, summary }

  const now = new Date()
  const updateData: Record<string, unknown> = {
    workflowStage: 'PENDING_FINAL_ADMIN_APPROVAL',
    updatedAt: now
  }

  if (summary.totals.minMet && !summary.request.facilitatorThresholdMetAt) {
    updateData.facilitatorThresholdMetAt = now
  }

  if (options?.manualClose) {
    updateData.rsvpClosedAt = now
    updateData.rsvpClosedById = actorUserId
    updateData.rsvpClosedReason = options.manualReason || 'Closed by admin'
  }

  await db.eventRequest.update({ where: { id: requestId }, data: updateData })

  const summaryText = `Request has YES ${summary.totals.yes}/${summary.totals.minRequired}, NO ${summary.totals.no}, MAYBE ${summary.totals.maybe}, pending ${summary.totals.pending}. Final admin decision required.`
  await notifyAdminsFacilitatorSummary(requestId, summaryText)

  await prisma.auditLog.create({
    data: {
      action: options?.manualClose ? 'EVENT_REQUEST_RSVP_CLOSED_MANUALLY' : 'EVENT_REQUEST_FACILITATOR_RSVP_COMPLETED',
      details: JSON.stringify({
        requestId,
        minMet: summary.totals.minMet,
        allResponded: summary.totals.allResponded,
        deadlineReached: summary.totals.deadlineReached,
        manualClose: !!options?.manualClose,
        reason: options?.manualReason || null,
        totals: summary.totals
      }),
      userId: actorUserId
    }
  })

  if (summary.request.autoFinalApproveWhenMinMet && summary.totals.minMet) {
    const adminReviewer = await db.user.findFirst({
      where: { role: 'ADMIN', status: 'ACTIVE' },
      select: { id: true }
    })
    const reviewerId = adminReviewer?.id || actorUserId
    await autoFinalizeEventRequest(requestId, reviewerId)
  }

  revalidatePath('/admin/event-requests')
  revalidatePath(`/admin/event-requests/${requestId}`)
  revalidatePath('/staff/events')

  return { success: true, summary }
}

export async function respondToFacilitatorRequestRsvp(data: {
  requestId: string
  status: 'YES' | 'NO' | 'MAYBE'
  notes?: string
}) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized' }

  if (!['YES', 'NO', 'MAYBE'].includes(data.status)) {
    return { error: 'Invalid RSVP status' }
  }

  try {
    const request = await db.eventRequest.findUnique({
      where: { id: data.requestId },
      select: { id: true, status: true, workflowStage: true, rsvpDeadlineAt: true }
    })
    if (!request) return { error: 'Request not found' }
    if (request.status !== 'PENDING' || request.workflowStage !== 'FACILITATOR_RSVP_OPEN') {
      return { error: 'This request is not accepting facilitator RSVPs' }
    }
    if (request.rsvpDeadlineAt && new Date() > new Date(request.rsvpDeadlineAt)) {
      return { error: 'RSVP deadline has passed' }
    }

    const row = await db.eventRequestFacilitatorRsvp.findUnique({
      where: { requestId_userId: { requestId: data.requestId, userId: session.user.id } }
    })
    if (!row) return { error: 'You are not a required facilitator for this request' }

    await db.eventRequestFacilitatorRsvp.update({
      where: { requestId_userId: { requestId: data.requestId, userId: session.user.id } },
      data: { status: data.status, notes: data.notes || null, respondedAt: new Date() }
    })

    await prisma.auditLog.create({
      data: {
        action: 'EVENT_REQUEST_FACILITATOR_RSVP',
        details: JSON.stringify({ requestId: data.requestId, status: data.status }),
        userId: session.user.id
      }
    })

    await evaluateFacilitatorRsvpProgress(data.requestId, session.user.id)

    revalidatePath('/staff/events')
    revalidatePath(`/admin/event-requests/${data.requestId}`)
    return { success: true }
  } catch (error) {
    logger.serverAction('Failed to submit facilitator RSVP', error)
    return { error: 'Failed to submit RSVP' }
  }
}

export async function closeFacilitatorRsvpPhase(requestId: string, reason: string) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN' || !session.user.id) return { error: 'Unauthorized' }
  if (!reason?.trim()) return { error: 'Reason is required to close RSVP early' }

  try {
    const request = await db.eventRequest.findUnique({
      where: { id: requestId },
      select: { id: true, workflowStage: true, status: true }
    })
    if (!request) return { error: 'Request not found' }
    if (request.status !== 'PENDING' || request.workflowStage !== 'FACILITATOR_RSVP_OPEN') {
      return { error: 'RSVP phase is not open' }
    }

    await evaluateFacilitatorRsvpProgress(requestId, session.user.id, {
      manualClose: true,
      manualReason: reason.trim()
    })

    return { success: true }
  } catch (error) {
    logger.serverAction('Failed to close facilitator RSVP phase', error)
    return { error: 'Failed to close RSVP phase' }
  }
}

export async function getPendingFacilitatorRsvpRequests() {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized' }

  try {
    const rows = await db.eventRequestFacilitatorRsvp.findMany({
      where: {
        userId: session.user.id,
        request: {
          status: 'PENDING',
          workflowStage: 'FACILITATOR_RSVP_OPEN'
        }
      },
      include: {
        request: {
          include: {
            geriatricHome: { select: { id: true, name: true } },
            existingEvent: { select: { id: true, title: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return { success: true, data: rows }
  } catch (error) {
    logger.serverAction('Failed to load facilitator RSVP queue', error)
    return { error: 'Failed to load facilitator RSVP queue' }
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
          (a) => a.status === 'YES' && a.user && ['FACILITATOR'].includes(a.user.role)
        )
        const checkedIn = event.attendances.filter((a) => a.checkInTime !== null)
        const feedbackRatings = event.attendances
          .filter((a) => a.feedbackRating !== null)
          .map((a) => a.feedbackRating as number)
        const avgRating = feedbackRatings.length > 0
          ? feedbackRatings.reduce((a, b) => a + b, 0) / feedbackRatings.length
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
          (a) => a.status === 'YES' && a.user && ['FACILITATOR'].includes(a.user.role)
        )
        const checkedIn = event.attendances.filter((a) => a.checkInTime !== null)
        const feedbackRatings = event.attendances
          .filter((a) => a.feedbackRating !== null)
          .map((a) => a.feedbackRating as number)
        const avgRating = feedbackRatings.length > 0
          ? feedbackRatings.reduce((a, b) => a + b, 0) / feedbackRatings.length
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
    logger.serverAction("Failed to get home event history", error)
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

    revalidatePath(`/admin/event-requests/${data.requestId}`)
    revalidatePath('/admin/event-requests')
    revalidatePath('/staff/events')
    return { success: true }
  } catch (error) {
    logger.serverAction("Failed to submit availability", error)
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
    logger.serverAction("Failed to get pending requests", error)
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
    const preferredDates = JSON.parse(request.preferredDates || '[]') as unknown[]
    const availabilitySummary = preferredDates.map((_, index: number) => {
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
    logger.serverAction("Failed to get request with responses", error)
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
    const confirmedStaffIds = request.responses
      .filter((response) => {
        const availability = JSON.parse(response.availability)
        return availability[data.selectedDateIndex] === true
      })
      .map((response) => response.staffId)

    const event = await prisma.$transaction(async (tx) => {
      let locationId = data.locationId
      if (!locationId) {
        const location = await tx.location.create({
          data: {
            name: request.customLocationName || request.geriatricHome.name,
            address: request.customLocationAddress || request.customLocationName || request.geriatricHome.address,
            type: 'HOME',
            updatedAt: new Date(),
          },
        })
        locationId = location.id
      }

      const createdEvent = await tx.event.create({
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
          updatedAt: new Date(),
        },
      })

      await tx.eventRequest.update({
        where: { id: data.requestId },
        data: {
          status: 'APPROVED',
          reviewedBy: session.user.id,
          reviewedAt: new Date(),
          selectedDateIndex: data.selectedDateIndex,
          approvedEventId: createdEvent.id,
        },
      })

      if (confirmedStaffIds.length > 0) {
        await tx.eventAttendance.createMany({
          data: confirmedStaffIds.map((staffId) => ({
            eventId: createdEvent.id,
            userId: staffId,
            status: 'YES',
            updatedAt: new Date(),
          })),
          skipDuplicates: true,
        })
      }

      return createdEvent
    })

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
      if (confirmedStaffIds.includes(response.staffId)) {
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
      logger.log('✅ Email reminders scheduled for approved event:', event.id)
    } catch (reminderError) {
      logger.error('❌ Failed to schedule reminders:', reminderError)
    }

    revalidatePath('/admin/event-requests')
    revalidatePath('/staff/events')
    revalidatePath('/dashboard/requests')
    revalidatePath(`/events/${event.id}`)

    return { success: true, eventId: event.id }
  } catch (error) {
    logger.serverAction("Failed to approve request", error)
    return { error: "Failed to approve request" }
  }
}
