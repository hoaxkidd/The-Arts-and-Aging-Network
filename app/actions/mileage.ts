'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

// Submit a mileage entry
export async function submitMileageEntry(data: {
  date: string
  startLocation: string
  endLocation: string
  kilometers: number
  fundingClass?: string
  purpose?: string
}) {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }

  try {
    const date = new Date(data.date)
    const month = date.getMonth() + 1
    const year = date.getFullYear()

    await prisma.mileageEntry.create({
      data: {
        userId: session.user.id,
        date,
        month,
        year,
        startLocation: data.startLocation,
        endLocation: data.endLocation,
        kilometers: data.kilometers,
        fundingClass: data.fundingClass,
        purpose: data.purpose,
        status: 'PENDING'
      }
    })

    revalidatePath('/payroll/mileage')
    return { success: true }
  } catch (e) {
    console.error('submitMileageEntry error:', e)
    return { error: "Failed to submit mileage entry" }
  }
}

// Get mileage entries for a specific month
export async function getMileageEntries(month: number, year: number) {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }

  try {
    const entries = await prisma.mileageEntry.findMany({
      where: {
        userId: session.user.id,
        month,
        year
      },
      orderBy: { date: 'desc' }
    })

    return { entries }
  } catch (e) {
    console.error('getMileageEntries error:', e)
    return { error: "Failed to get mileage entries" }
  }
}

// Get all mileage entries for current user
export async function getMyMileageEntries() {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }

  try {
    const entries = await prisma.mileageEntry.findMany({
      where: { userId: session.user.id },
      orderBy: { date: 'desc' },
      take: 50
    })

    return { entries }
  } catch (e) {
    console.error('getMyMileageEntries error:', e)
    return { error: "Failed to get mileage entries" }
  }
}

// Delete a mileage entry (only if pending)
export async function deleteMileageEntry(entryId: string) {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }

  try {
    const entry = await prisma.mileageEntry.findUnique({
      where: { id: entryId }
    })

    if (!entry) return { error: "Entry not found" }
    if (entry.userId !== session.user.id) return { error: "Unauthorized" }
    if (entry.status !== 'PENDING') return { error: "Cannot delete approved/rejected entry" }

    await prisma.mileageEntry.delete({
      where: { id: entryId }
    })

    revalidatePath('/payroll/mileage')
    return { success: true }
  } catch (e) {
    console.error('deleteMileageEntry error:', e)
    return { error: "Failed to delete entry" }
  }
}

// Get mileage entries for admin review
export async function getMileageForAdmin(status?: string) {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }

  // Verify admin
  const user = await prisma.user.findUnique({
    where: { id: session.user.id }
  })
  if (user?.role !== 'ADMIN') return { error: "Unauthorized" }

  try {
    const where: any = {}
    if (status && status !== 'ALL') {
      where.status = status
    }

    const entries = await prisma.mileageEntry.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, preferredName: true, image: true }
        }
      },
      orderBy: [
        { status: 'asc' }, // PENDING first
        { date: 'desc' }
      ]
    })

    return { entries }
  } catch (e) {
    console.error('getMileageForAdmin error:', e)
    return { error: "Failed to get mileage entries" }
  }
}

// Approve mileage entry (admin only)
export async function approveMileageEntry(entryId: string) {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }

  // Verify admin
  const admin = await prisma.user.findUnique({
    where: { id: session.user.id }
  })
  if (admin?.role !== 'ADMIN') return { error: "Unauthorized" }

  try {
    const entry = await prisma.mileageEntry.findUnique({
      where: { id: entryId }
    })

    if (!entry) return { error: "Entry not found" }
    if (entry.status !== 'PENDING') return { error: "Entry is not pending" }

    await prisma.mileageEntry.update({
      where: { id: entryId },
      data: {
        status: 'APPROVED',
        approvedBy: session.user.id,
        approvedAt: new Date()
      }
    })

    // Notify staff
    await prisma.notification.create({
      data: {
        userId: entry.userId,
        type: 'MILEAGE_APPROVED',
        title: 'Mileage Approved',
        message: `Your mileage entry for ${entry.kilometers}km has been approved`,
        link: '/payroll/mileage'
      }
    })

    revalidatePath('/admin/mileage')
    return { success: true }
  } catch (e) {
    console.error('approveMileageEntry error:', e)
    return { error: "Failed to approve entry" }
  }
}

// Reject mileage entry (admin only)
export async function rejectMileageEntry(entryId: string, reason: string) {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }

  // Verify admin
  const admin = await prisma.user.findUnique({
    where: { id: session.user.id }
  })
  if (admin?.role !== 'ADMIN') return { error: "Unauthorized" }

  try {
    const entry = await prisma.mileageEntry.findUnique({
      where: { id: entryId }
    })

    if (!entry) return { error: "Entry not found" }
    if (entry.status !== 'PENDING') return { error: "Entry is not pending" }

    await prisma.mileageEntry.update({
      where: { id: entryId },
      data: {
        status: 'REJECTED',
        rejectionNote: reason
      }
    })

    // Notify staff
    await prisma.notification.create({
      data: {
        userId: entry.userId,
        type: 'MILEAGE_REJECTED',
        title: 'Mileage Rejected',
        message: `Your mileage entry was rejected: ${reason}`,
        link: '/payroll/mileage'
      }
    })

    revalidatePath('/admin/mileage')
    return { success: true }
  } catch (e) {
    console.error('rejectMileageEntry error:', e)
    return { error: "Failed to reject entry" }
  }
}

// Get monthly summary
export async function getMonthlySummary(month: number, year: number) {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }

  try {
    const entries = await prisma.mileageEntry.findMany({
      where: {
        userId: session.user.id,
        month,
        year,
        status: 'APPROVED'
      }
    })

    const totalKm = entries.reduce((sum, e) => sum + e.kilometers, 0)
    const byFundingClass: Record<string, number> = {}

    entries.forEach(entry => {
      const fc = entry.fundingClass || 'Unspecified'
      byFundingClass[fc] = (byFundingClass[fc] || 0) + entry.kilometers
    })

    return {
      summary: {
        totalKm,
        entryCount: entries.length,
        byFundingClass
      }
    }
  } catch (e) {
    console.error('getMonthlySummary error:', e)
    return { error: "Failed to get summary" }
  }
}
