'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import type { PrismaClient } from "@prisma/client"

// Type-safe prisma client reference
const db = prisma as PrismaClient & Record<string, unknown>

// Helper to safely parse JSON with a default fallback
function safeJsonParse<T>(json: string | null | undefined, defaultValue: T): T {
  if (!json) return defaultValue
  try {
    return JSON.parse(json) as T
  } catch {
    console.error('Failed to parse JSON:', json?.substring(0, 100))
    return defaultValue
  }
}

// Create a new facility profile linked to a user (Admin only)
export async function createFacilityProfile(formData: FormData) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    return { error: "Unauthorized" }
  }

  const userId = formData.get("userId") as string
  const name = formData.get("name") as string
  const address = formData.get("address") as string
  const contactName = formData.get("contactName") as string
  const contactEmail = formData.get("contactEmail") as string
  const contactPhone = formData.get("contactPhone") as string
  const maxCapacity = parseInt(formData.get("maxCapacity") as string) || 10

  if (!userId || !name || !address || !contactName || !contactEmail || !contactPhone) {
    return { error: "Please fill in all required fields" }
  }

  try {
    // Check user exists and doesn't already have a home
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { geriatricHome: true }
    })

    if (!user) return { error: "User not found" }
    if (user.geriatricHome) return { error: "This user already has a facility profile" }

    const prismaClient = prisma as any
    await prismaClient.geriatricHome.create({
      data: {
        name,
        address,
        contactName,
        contactEmail,
        contactPhone,
        maxCapacity,
        residentCount: 0,
        userId,
      }
    })

    // Ensure user has HOME_ADMIN role
    if (user.role !== 'HOME_ADMIN') {
      await prisma.user.update({
        where: { id: userId },
        data: { role: 'HOME_ADMIN' }
      })
    }

    await prisma.auditLog.create({
      data: {
        action: 'HOME_CREATED',
        details: JSON.stringify({ userId, facilityName: name }),
        userId: session.user.id
      }
    })

    revalidatePath(`/admin/users/${userId}`)
    revalidatePath('/admin/homes')
    revalidatePath('/admin/users')

    return { success: true }
  } catch (error) {
    console.error("Failed to create facility profile:", error)
    return { error: "Failed to create facility profile" }
  }
}

// Get full home details including user info
// Accessible by ADMIN or the HOME_ADMIN who owns this home
export async function getHomeDetails(homeId: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Unauthorized" }
  }

  try {
    const home = await db.geriatricHome.findUnique({
      where: { id: homeId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            address: true,
            emergencyContact: true,
            status: true,
            createdAt: true,
          }
        },
        events: {
          take: 10,
          orderBy: { startDateTime: 'desc' },
          select: {
            id: true,
            title: true,
            startDateTime: true,
            status: true,
          }
        },
        _count: {
          select: { events: true }
        }
      }
    })

    if (!home) {
      return { error: "Home not found" }
    }

    // Check authorization - ADMIN can view any, HOME_ADMIN can only view their own
    if (session.user.role !== 'ADMIN' && home.userId !== session.user.id) {
      return { error: "Unauthorized" }
    }

    return { success: true, data: home }
  } catch (error) {
    console.error("Failed to fetch home details:", error)
    return { error: "Failed to load home details" }
  }
}

// Update home details (legacy form-based)
export async function updateHomeDetails(formData: FormData) {
  const session = await auth()
  // Allow ADMIN or the HOME_ADMIN who owns the home
  if (!session?.user?.id) {
    return { error: "Unauthorized" }
  }

  const id = formData.get("id") as string
  const name = formData.get("name") as string
  const address = formData.get("address") as string
  const residentCount = parseInt(formData.get("residentCount") as string) || 0
  const maxCapacity = parseInt(formData.get("maxCapacity") as string) || 0
  const contactName = formData.get("contactName") as string
  const contactEmail = formData.get("contactEmail") as string
  const contactPhone = formData.get("contactPhone") as string
  const contactPosition = formData.get("contactPosition") as string

  // Organization Settings
  const type = formData.get("type") as string
  const region = formData.get("region") as string
  const isPartner = formData.get("isPartner") === 'on'
  const newsletterSub = formData.get("newsletterSub") === 'on'

  // Important Info fields
  const triggerWarnings = formData.get("triggerWarnings") as string || null
  const specialNeeds = formData.get("specialNeeds") as string || null
  const accommodations = formData.get("accommodations") as string || null
  const emergencyProtocol = formData.get("emergencyProtocol") as string || null
  const feedbackFormUrl = formData.get("feedbackFormUrl") as string || null

  // Accessibility Info (JSON)
  const accessibilityInfo = JSON.stringify({
    wheelchair: formData.get("acc_wheelchair") === 'on',
    hearingLoop: formData.get("acc_hearingLoop") === 'on',
    elevator: formData.get("acc_elevator") === 'on',
    notes: formData.get("acc_notes") as string || ''
  })

  // Photo Permissions (JSON)
  const photoPermissions = JSON.stringify({
    formReceived: formData.get("photo_formReceived") === 'on',
    restrictions: formData.get("photo_restrictions") as string || ''
  })

  if (!id || !name) {
    return { error: "Missing required fields" }
  }

  try {
    const prismaClient = prisma as any

    // Check ownership if not admin
    if (session.user.role !== 'ADMIN') {
        const existing = await prismaClient.geriatricHome.findUnique({ where: { id } })
        if (existing?.userId !== session.user.id) return { error: "Unauthorized" }
    }

    await prismaClient.geriatricHome.update({
      where: { id },
      data: {
        name,
        address,
        residentCount,
        maxCapacity,
        contactName,
        contactEmail,
        contactPhone,
        contactPosition,
        type,
        region,
        isPartner,
        newsletterSub,
        // Important Info fields
        accessibilityInfo,
        triggerWarnings,
        specialNeeds,
        accommodations,
        emergencyProtocol,
        photoPermissions,
        feedbackFormUrl
      }
    })

    await prisma.auditLog.create({
      data: {
        action: 'HOME_UPDATED',
        details: JSON.stringify({ homeId: id, updates: { name, address, type, region } }),
        userId: session.user.id
      }
    })

    revalidatePath(`/admin/homes/${id}`)
    revalidatePath('/admin/homes')
    revalidatePath('/dashboard/profile')

    return { success: true }
  } catch (error) {
    console.error("Failed to update home:", error)
    return { error: "Failed to update home details" }
  }
}

// Update home details (JSON-based for modal)
export async function updateHome(data: {
  id: string
  name?: string
  address?: string
  residentCount?: number
  maxCapacity?: number
  specialNeeds?: string
  emergencyProtocol?: string
  contactName?: string
  contactEmail?: string
  contactPhone?: string
  contactPosition?: string
  // User updates
  userName?: string
  userEmail?: string
}) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    return { error: "Unauthorized" }
  }

  const { id, userName, userEmail, ...homeData } = data

  if (!id) {
    return { error: "Home ID is required" }
  }

  try {
    // Get the home to find the associated user
    const existingHome = await db.geriatricHome.findUnique({
      where: { id },
      select: { userId: true }
    })

    if (!existingHome) {
      return { error: "Home not found" }
    }

    // Update home details
    const filteredHomeData = Object.fromEntries(
      Object.entries(homeData).filter(([_, v]) => v !== undefined)
    )

    if (Object.keys(filteredHomeData).length > 0) {
      await db.geriatricHome.update({
        where: { id },
        data: filteredHomeData
      })
    }

    // Update user details if provided
    if (userName !== undefined || userEmail !== undefined) {
      const userUpdates: { name?: string; email?: string } = {}
      if (userName !== undefined) userUpdates.name = userName
      if (userEmail !== undefined) userUpdates.email = userEmail

      await prisma.user.update({
        where: { id: existingHome.userId },
        data: userUpdates
      })
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: 'HOME_UPDATED',
        details: JSON.stringify({
          homeId: id,
          updates: { ...filteredHomeData, userName, userEmail }
        }),
        userId: session.user.id
      }
    })

    // Revalidate all relevant paths
    revalidatePath(`/admin/homes/${id}`)
    revalidatePath('/admin/homes')
    revalidatePath('/admin/users')
    revalidatePath('/dashboard')

    return { success: true }
  } catch (error) {
    console.error("Failed to update home:", error)
    return { error: "Failed to update home details" }
  }
}

// Quick update for a single field (optimistic updates)
export async function updateHomeField(
  homeId: string,
  field: string,
  value: string | number
) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    return { error: "Unauthorized" }
  }

  // Allowed fields for home
  const allowedHomeFields = [
    'name', 'address', 'residentCount', 'maxCapacity',
    'specialNeeds', 'emergencyProtocol', 'contactName',
    'contactEmail', 'contactPhone', 'contactPosition'
  ]

  // Allowed fields for user
  const allowedUserFields = ['userName', 'userEmail', 'userPhone']

  try {
    const home = await db.geriatricHome.findUnique({
      where: { id: homeId },
      select: { userId: true }
    })

    if (!home) {
      return { error: "Home not found" }
    }

    if (allowedHomeFields.includes(field)) {
      await db.geriatricHome.update({
        where: { id: homeId },
        data: { [field]: value }
      })
    } else if (allowedUserFields.includes(field)) {
      // Map field names (remove 'user' prefix and lowercase first char)
      const userField = field.replace('user', '').toLowerCase()
      await prisma.user.update({
        where: { id: home.userId },
        data: { [userField]: value }
      })
    } else {
      return { error: "Invalid field" }
    }

    await prisma.auditLog.create({
      data: {
        action: 'HOME_FIELD_UPDATED',
        details: JSON.stringify({ homeId, field, value }),
        userId: session.user.id
      }
    })

    // Revalidate all paths that might display this data
    revalidatePath(`/admin/homes/${homeId}`)
    revalidatePath('/admin/homes')
    revalidatePath('/admin/users')
    revalidatePath('/dashboard')

    return { success: true }
  } catch (error) {
    console.error("Failed to update field:", error)
    return { error: "Failed to update" }
  }
}

// Update primary contact fields on a geriatric home
export async function updatePrimaryContact(
  homeId: string,
  data: { name: string; email: string; phone: string; position: string }
) {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }

  try {
    const home = await db.geriatricHome.findUnique({
      where: { id: homeId },
      select: { userId: true }
    })

    if (!home) return { error: "Home not found" }

    if (session.user.role !== 'ADMIN' && home.userId !== session.user.id) {
      return { error: "Unauthorized" }
    }

    await db.geriatricHome.update({
      where: { id: homeId },
      data: {
        contactName: data.name,
        contactEmail: data.email,
        contactPhone: data.phone,
        contactPosition: data.position,
      }
    })

    revalidatePath(`/admin/homes/${homeId}`)
    revalidatePath('/admin/users')
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/profile')
    revalidatePath('/dashboard/contacts')

    return { success: true }
  } catch (error) {
    console.error("Failed to update primary contact:", error)
    return { error: "Failed to update primary contact" }
  }
}

// ============================================
// PERSONNEL MANAGEMENT
// ============================================

type Personnel = {
  id: string
  name: string
  email: string
  phone: string
  position: string
  isPrimary?: boolean
}

// Add a new personnel contact
export async function addPersonnel(homeId: string, personnel: Omit<Personnel, 'id'>) {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }

  try {
    const home = await db.geriatricHome.findUnique({
      where: { id: homeId },
      select: { userId: true, additionalContacts: true }
    })

    if (!home) return { error: "Home not found" }

    // Check authorization
    if (session.user.role !== 'ADMIN' && home.userId !== session.user.id) {
      return { error: "Unauthorized" }
    }

    // Parse existing contacts or start fresh
    const existingContacts: Personnel[] = safeJsonParse<Personnel[]>(home.additionalContacts, [])

    // Add new contact with unique ID
    const newContact: Personnel = {
      ...personnel,
      id: `contact_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
    }

    existingContacts.push(newContact)

    await db.geriatricHome.update({
      where: { id: homeId },
      data: { additionalContacts: JSON.stringify(existingContacts) }
    })

    await prisma.auditLog.create({
      data: {
        action: 'PERSONNEL_ADDED',
        details: JSON.stringify({ homeId, personnel: newContact }),
        userId: session.user.id
      }
    })

    revalidatePath(`/admin/homes/${homeId}`)
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/contacts')

    return { success: true, data: newContact }
  } catch (error) {
    console.error("Failed to add personnel:", error)
    return { error: "Failed to add personnel" }
  }
}

// Update an existing personnel contact
export async function updatePersonnel(homeId: string, personnelId: string, updates: Partial<Personnel>) {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }

  try {
    const home = await db.geriatricHome.findUnique({
      where: { id: homeId },
      select: { userId: true, additionalContacts: true }
    })

    if (!home) return { error: "Home not found" }

    if (session.user.role !== 'ADMIN' && home.userId !== session.user.id) {
      return { error: "Unauthorized" }
    }

    const existingContacts: Personnel[] = safeJsonParse<Personnel[]>(home.additionalContacts, [])

    const index = existingContacts.findIndex(c => c.id === personnelId)
    if (index === -1) return { error: "Personnel not found" }

    existingContacts[index] = { ...existingContacts[index], ...updates }

    await db.geriatricHome.update({
      where: { id: homeId },
      data: { additionalContacts: JSON.stringify(existingContacts) }
    })

    await prisma.auditLog.create({
      data: {
        action: 'PERSONNEL_UPDATED',
        details: JSON.stringify({ homeId, personnelId, updates }),
        userId: session.user.id
      }
    })

    revalidatePath(`/admin/homes/${homeId}`)
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/contacts')

    return { success: true }
  } catch (error) {
    console.error("Failed to update personnel:", error)
    return { error: "Failed to update personnel" }
  }
}

// Remove a personnel contact
export async function removePersonnel(homeId: string, personnelId: string) {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }

  try {
    const home = await db.geriatricHome.findUnique({
      where: { id: homeId },
      select: { userId: true, additionalContacts: true }
    })

    if (!home) return { error: "Home not found" }

    if (session.user.role !== 'ADMIN' && home.userId !== session.user.id) {
      return { error: "Unauthorized" }
    }

    const existingContacts: Personnel[] = safeJsonParse<Personnel[]>(home.additionalContacts, [])

    const filtered = existingContacts.filter(c => c.id !== personnelId)

    await db.geriatricHome.update({
      where: { id: homeId },
      data: { additionalContacts: JSON.stringify(filtered) }
    })

    await prisma.auditLog.create({
      data: {
        action: 'PERSONNEL_REMOVED',
        details: JSON.stringify({ homeId, personnelId }),
        userId: session.user.id
      }
    })

    revalidatePath(`/admin/homes/${homeId}`)
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/contacts')

    return { success: true }
  } catch (error) {
    console.error("Failed to remove personnel:", error)
    return { error: "Failed to remove personnel" }
  }
}

// ============================================
// DELETE HOME (with cascade)
// ============================================

export async function deleteHome(homeId: string, confirmationText: string) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    return { error: "Only administrators can delete homes" }
  }

  // Require confirmation text to prevent accidental deletion
  if (confirmationText !== 'DELETE') {
    return { error: "Please type DELETE to confirm" }
  }

  try {
    // Get home with all related data counts
    const home = await db.geriatricHome.findUnique({
      where: { id: homeId },
      include: {
        user: true,
        events: { select: { id: true } },
        _count: { select: { events: true } }
      }
    })

    if (!home) {
      return { error: "Home not found" }
    }

    // Store info for audit log before deletion
    const deletionInfo = {
      homeName: home.name,
      homeAddress: home.address,
      adminUserId: home.userId,
      adminEmail: home.user?.email,
      eventsCount: home._count.events
    }

    // Delete in order: related records first, then home, then user
    // 1. Delete all events associated with this home
    if (home.events.length > 0) {
      // First delete event-related records
      for (const event of home.events) {
        await prisma.eventAttendance.deleteMany({ where: { eventId: event.id } })
        await prisma.eventComment.deleteMany({ where: { eventId: event.id } })
        await prisma.eventPhoto.deleteMany({ where: { eventId: event.id } })
      }
      // Then delete the events
      await prisma.event.deleteMany({ where: { geriatricHomeId: homeId } })
    }

    // 2. Delete the geriatric home
    await db.geriatricHome.delete({ where: { id: homeId } })

    // 3. Delete the associated HOME_ADMIN user
    // First delete user's related records
    await prisma.notification.deleteMany({ where: { userId: home.userId } })
    await prisma.auditLog.deleteMany({ where: { userId: home.userId } })
    await prisma.user.delete({ where: { id: home.userId } })

    // 4. Create audit log for deletion (using admin's ID)
    await prisma.auditLog.create({
      data: {
        action: 'HOME_DELETED',
        details: JSON.stringify(deletionInfo),
        userId: session.user.id
      }
    })

    revalidatePath('/admin/homes')
    revalidatePath('/admin/users')

    return { success: true, deletedHome: deletionInfo }
  } catch (error) {
    console.error("Failed to delete home:", error)
    return { error: "Failed to delete home. Please try again." }
  }
}
