'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import type { PrismaClient } from "@prisma/client"

// Type-safe prisma client reference
const db = prisma as PrismaClient & Record<string, unknown>

// ============================================
// STAFF ATTENDANCE ACTIONS (FACILITATOR/CONTRACTOR)
// ============================================

// Confirm attendance to an approved event
export async function confirmStaffAttendance(eventId: string, notes?: string) {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }

  const role = session.user.role
  if (role !== 'FACILITATOR' && role !== 'CONTRACTOR' && role !== 'ADMIN') {
    return { error: "Only staff can confirm attendance" }
  }

  try {
    // Verify event exists and is available
    const event = await db.event.findUnique({
      where: { id: eventId },
      include: {
        attendances: true,
        location: true
      }
    })

    if (!event) return { error: "Event not found" }
    if (event.status !== 'PUBLISHED') return { error: "Event is not available" }

    // Check if event is in the future
    if (new Date(event.startDateTime) < new Date()) {
      return { error: "Cannot confirm attendance for past events" }
    }

    // Check capacity
    const confirmedCount = event.attendances.filter((a: any) => a.status === 'YES').length
    if (confirmedCount >= event.maxAttendees) {
      return { error: "Event is at full capacity" }
    }

    // Create or update attendance
    const attendance = await db.eventAttendance.upsert({
      where: {
        eventId_userId: {
          eventId,
          userId: session.user.id
        }
      },
      create: {
        eventId,
        userId: session.user.id,
        status: 'YES'
      },
      update: {
        status: 'YES'
      }
    })

    // Notify admins
    const admins = await db.user.findMany({
      where: { role: 'ADMIN', status: 'ACTIVE' }
    })

    for (const admin of admins) {
      await db.notification.create({
        data: {
          userId: admin.id,
          type: 'STAFF_ATTENDANCE_CONFIRMED',
          title: 'Staff Attendance Confirmed',
          message: `${session.user.name || 'A staff member'} has confirmed attendance for "${event.title}"`,
          link: `/admin/events`
        }
      })
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'STAFF_ATTENDANCE_CONFIRMED',
        details: JSON.stringify({ eventId, userId: session.user.id }),
        userId: session.user.id
      }
    })

    revalidatePath('/staff/events')
    revalidatePath('/staff/my-events')
    revalidatePath('/admin/events')

    return { success: true, data: attendance }
  } catch (error) {
    console.error("Failed to confirm attendance:", error)
    return { error: "Failed to confirm attendance" }
  }
}

// Withdraw attendance confirmation
export async function withdrawStaffAttendance(eventId: string) {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }

  try {
    const event = await db.event.findUnique({
      where: { id: eventId }
    })

    if (!event) return { error: "Event not found" }

    // Check if event is in the future (allow withdrawal only before event)
    if (new Date(event.startDateTime) < new Date()) {
      return { error: "Cannot withdraw from past events" }
    }

    // Update attendance to NO
    await db.eventAttendance.update({
      where: {
        eventId_userId: {
          eventId,
          userId: session.user.id
        }
      },
      data: {
        status: 'NO'
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'STAFF_ATTENDANCE_WITHDRAWN',
        details: JSON.stringify({ eventId, userId: session.user.id }),
        userId: session.user.id
      }
    })

    revalidatePath('/staff/events')
    revalidatePath('/staff/my-events')
    revalidatePath('/admin/events')

    return { success: true }
  } catch (error) {
    console.error("Failed to withdraw attendance:", error)
    return { error: "Failed to withdraw attendance" }
  }
}

// Get events available for staff attendance
export async function getAvailableEventsForStaff() {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }

  const role = session.user.role
  if (role !== 'FACILITATOR' && role !== 'CONTRACTOR' && role !== 'ADMIN') {
    return { error: "Unauthorized" }
  }

  try {
    const events = await db.event.findMany({
      where: {
        status: 'PUBLISHED',
        startDateTime: { gte: new Date() }
      },
      include: {
        location: true,
        geriatricHome: { select: { id: true, name: true, address: true } },
        attendances: {
          include: { user: { select: { id: true, name: true, role: true } } }
        },
        _count: { select: { attendances: true, photos: true } }
      },
      orderBy: { startDateTime: 'asc' }
    })

    // Add user's attendance status to each event
    const eventsWithStatus = events.map((event: any) => {
      const myAttendance = event.attendances.find(
        (a: any) => a.userId === session.user.id
      )
      const confirmedCount = event.attendances.filter((a: any) => a.status === 'YES').length

      return {
        ...event,
        myAttendanceStatus: myAttendance?.status || null,
        confirmedCount,
        spotsRemaining: event.maxAttendees - confirmedCount
      }
    })

    return { success: true, data: eventsWithStatus }
  } catch (error) {
    console.error("Failed to get available events:", error)
    return { error: "Failed to load events" }
  }
}

// Get events I've confirmed attendance for
export async function getMyConfirmedEvents() {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }

  try {
    const attendances = await db.eventAttendance.findMany({
      where: {
        userId: session.user.id,
        status: 'YES'
      },
      include: {
        event: {
          include: {
            location: true,
            geriatricHome: { select: { id: true, name: true, address: true } },
            attendances: {
              where: { status: 'YES' },
              include: { user: { select: { id: true, name: true, role: true } } }
            },
            _count: { select: { attendances: true, photos: true } }
          }
        }
      },
      orderBy: { event: { startDateTime: 'asc' } }
    })

    // Filter to only include valid events and add status
    const events = attendances
      .filter((a: any) => a.event)
      .map((a: any) => {
        const now = new Date()
        const eventDate = new Date(a.event.startDateTime)
        const eventEndDate = new Date(a.event.endDateTime)

        let eventStatus: 'upcoming' | 'today' | 'past'
        if (eventEndDate < now) {
          eventStatus = 'past'
        } else if (eventDate.toDateString() === now.toDateString()) {
          eventStatus = 'today'
        } else {
          eventStatus = 'upcoming'
        }

        return {
          ...a.event,
          myCheckInTime: a.checkInTime,
          eventStatus,
          confirmedStaff: a.event.attendances.filter(
            (att: any) => ['FACILITATOR', 'CONTRACTOR'].includes(att.user.role)
          )
        }
      })

    return { success: true, data: events }
  } catch (error) {
    console.error("Failed to get confirmed events:", error)
    return { error: "Failed to load events" }
  }
}

// Staff check-in to event
export async function staffCheckIn(eventId: string) {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }

  try {
    const event = await db.event.findUnique({
      where: { id: eventId }
    })

    if (!event) return { error: "Event not found" }

    // Validate check-in window (2 hours before event start)
    const now = new Date()
    const eventStart = new Date(event.startDateTime)
    const checkInWindowStart = new Date(eventStart.getTime() - 2 * 60 * 60 * 1000)
    const eventEnd = new Date(event.endDateTime)

    if (now < checkInWindowStart) {
      return { error: "Check-in opens 2 hours before the event" }
    }

    if (now > eventEnd) {
      return { error: "Event has already ended" }
    }

    // Check if user has attendance record
    const attendance = await db.eventAttendance.findUnique({
      where: {
        eventId_userId: {
          eventId,
          userId: session.user.id
        }
      }
    })

    if (!attendance) {
      return { error: "You must confirm attendance before checking in" }
    }

    if (attendance.checkInTime) {
      return { error: "You have already checked in" }
    }

    // Update check-in
    await db.eventAttendance.update({
      where: { id: attendance.id },
      data: {
        checkInTime: now,
        status: 'YES'
      }
    })

    // Notify admins
    const admins = await db.user.findMany({
      where: { role: 'ADMIN', status: 'ACTIVE' }
    })

    for (const admin of admins) {
      await db.notification.create({
        data: {
          userId: admin.id,
          type: 'STAFF_CHECKIN',
          title: 'Staff Check-In',
          message: `${session.user.name || 'A staff member'} has checked in to "${event.title}"`,
          link: `/events/${eventId}`
        }
      })
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'STAFF_CHECKED_IN',
        details: JSON.stringify({ eventId, userId: session.user.id }),
        userId: session.user.id
      }
    })

    revalidatePath('/staff/events')
    revalidatePath('/staff/my-events')
    revalidatePath(`/staff/events/${eventId}`)
    revalidatePath(`/events/${eventId}`)

    return { success: true }
  } catch (error) {
    console.error("Failed to check in:", error)
    return { error: "Failed to check in" }
  }
}

// Get event detail for staff
export async function getStaffEventDetail(eventId: string) {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }

  try {
    const event = await db.event.findUnique({
      where: { id: eventId },
      include: {
        location: true,
        geriatricHome: {
          select: {
            id: true,
            name: true,
            address: true,
            contactName: true,
            contactPhone: true,
            contactEmail: true,
            // Important Info fields
            accessibilityInfo: true,
            triggerWarnings: true,
            accommodations: true,
            photoPermissions: true
          }
        },
        attendances: {
          include: {
            user: { select: { id: true, name: true, role: true, image: true } }
          }
        },
        photos: { take: 6, orderBy: { createdAt: 'desc' } },
        comments: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { name: true, image: true } } }
        },
        _count: { select: { attendances: true, photos: true, comments: true } }
      }
    })

    if (!event) return { error: "Event not found" }

    // Get user's attendance
    const myAttendance = event.attendances.find(
      (a: any) => a.userId === session.user.id
    )

    // Calculate stats
    const confirmedStaff = event.attendances.filter(
      (a: any) => a.status === 'YES' && ['FACILITATOR', 'CONTRACTOR'].includes(a.user.role)
    )
    const checkedInStaff = event.attendances.filter(
      (a: any) => a.checkInTime && ['FACILITATOR', 'CONTRACTOR'].includes(a.user.role)
    )

    // Determine event status
    const now = new Date()
    const eventStart = new Date(event.startDateTime)
    const eventEnd = new Date(event.endDateTime)
    const checkInWindowStart = new Date(eventStart.getTime() - 2 * 60 * 60 * 1000)

    let eventStatus: 'upcoming' | 'check-in-open' | 'in-progress' | 'past'
    let canCheckIn = false

    if (eventEnd < now) {
      eventStatus = 'past'
    } else if (eventStart <= now && eventEnd >= now) {
      eventStatus = 'in-progress'
      canCheckIn = !myAttendance?.checkInTime && myAttendance?.status === 'YES'
    } else if (checkInWindowStart <= now) {
      eventStatus = 'check-in-open'
      canCheckIn = !myAttendance?.checkInTime && myAttendance?.status === 'YES'
    } else {
      eventStatus = 'upcoming'
    }

    return {
      success: true,
      data: {
        ...event,
        myAttendance,
        eventStatus,
        canCheckIn,
        stats: {
          confirmedStaffCount: confirmedStaff.length,
          checkedInStaffCount: checkedInStaff.length,
          spotsRemaining: event.maxAttendees - confirmedStaff.length
        },
        confirmedStaff,
        checkedInStaff
      }
    }
  } catch (error) {
    console.error("Failed to get event detail:", error)
    return { error: "Failed to load event" }
  }
}
