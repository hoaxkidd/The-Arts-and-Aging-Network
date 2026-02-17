'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { ROLE_ORDER, isValidRole } from "@/lib/roles"

// Get all active staff for directory listing. Only includes users with a valid assigned role.
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

  // Only include users with a valid role; exclude HOME_ADMIN (not listed in staff directory)
  const withValidRole = staff.filter(
    (u) => isValidRole(u.role) && u.role !== 'HOME_ADMIN'
  )

  // Sort by role hierarchy, then by name within each group
  const roleOrderMap = Object.fromEntries(ROLE_ORDER.map((r, i) => [r, i]))
  const sorted = withValidRole.sort((a, b) => {
    const orderA = roleOrderMap[a.role as keyof typeof roleOrderMap] ?? 99
    const orderB = roleOrderMap[b.role as keyof typeof roleOrderMap] ?? 99
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

  // HOME_ADMIN profiles are not exposed via the directory (they are not listed)
  if (staff.role === 'HOME_ADMIN') return { error: "Staff member not found" }

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
