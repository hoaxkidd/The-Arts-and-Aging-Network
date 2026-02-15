'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

// Role hierarchy order for directory grouping
const ROLE_ORDER: Record<string, number> = {
  ADMIN: 0,
  BOARD: 1,
  PAYROLL: 2,
  HOME_ADMIN: 3,
  FACILITATOR: 4,
  CONTRACTOR: 5,
  VOLUNTEER: 6,
  PARTNER: 7,
}

// Get all active staff for directory listing
export async function getStaffDirectory(search?: string) {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }

  const where: any = {
    status: 'ACTIVE',
  }

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { preferredName: { contains: search } },
      { position: { contains: search } },
      { region: { contains: search } }
    ]
  }

  const staff = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      preferredName: true,
      pronouns: true,
      image: true,
      role: true,
      position: true,
      region: true,
      bio: true,
    },
    orderBy: { name: 'asc' }
  })

  // Sort by role hierarchy, then by name within each group
  const sorted = staff.sort((a, b) => {
    const orderA = ROLE_ORDER[a.role] ?? 99
    const orderB = ROLE_ORDER[b.role] ?? 99
    if (orderA !== orderB) return orderA - orderB
    return (a.name || '').localeCompare(b.name || '')
  })

  return { staff: sorted }
}

// Get public profile data for a specific staff member
export async function getStaffPublicProfile(staffId: string) {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }

  const staff = await prisma.user.findUnique({
    where: { id: staffId },
    select: {
      id: true,
      name: true,
      preferredName: true,
      pronouns: true,
      image: true,
      role: true,
      position: true,
      region: true,
      bio: true,
      // Exclude sensitive: address, emergencyContact, healthInfo, sinHash, birthDate
    }
  })

  if (!staff) return { error: "Staff member not found" }

  // Get upcoming confirmed events
  const upcomingEvents = await prisma.eventAttendance.findMany({
    where: {
      userId: staffId,
      status: 'YES',
      event: {
        startDateTime: { gte: new Date() },
        status: 'PUBLISHED'
      }
    },
    include: {
      event: {
        include: {
          location: true,
          program: true,
          geriatricHome: true
        }
      }
    },
    orderBy: {
      event: { startDateTime: 'asc' }
    },
    take: 10
  })

  // Check if current user has pending phone request for this staff
  const existingPhoneRequest = await prisma.phoneRequest.findUnique({
    where: {
      requesterId_requestedId: {
        requesterId: session.user.id,
        requestedId: staffId
      }
    }
  })

  return {
    staff,
    upcomingEvents: upcomingEvents.map(a => ({
      id: a.event.id,
      title: a.event.title,
      program: a.event.program?.name || 'General',
      location: a.event.location.name,
      place: a.event.geriatricHome?.name || a.event.location.address,
      date: a.event.startDateTime,
      startTime: a.event.startDateTime,
      endTime: a.event.endDateTime
    })),
    phoneRequestStatus: existingPhoneRequest?.status || null
  }
}

// Get staff member's own profile with full details (for profile editing)
export async function getMyFullProfile() {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      documents: {
        orderBy: { createdAt: 'desc' }
      }
    }
  })

  if (!user) return { error: "User not found" }

  return { user }
}
