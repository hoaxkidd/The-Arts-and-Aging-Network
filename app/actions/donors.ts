'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

// Get all donors
export async function getDonors(filters?: {
  type?: string
  tier?: string
  status?: string
}) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    return { error: "Unauthorized" }
  }

  try {
    const where: any = {}

    if (filters?.type && filters.type !== 'ALL') {
      where.type = filters.type
    }
    if (filters?.tier && filters.tier !== 'ALL') {
      where.tier = filters.tier
    }
    if (filters?.status && filters.status !== 'ALL') {
      where.status = filters.status
    }

    const donors = await prisma.donor.findMany({
      where,
      include: {
        _count: {
          select: { donations: true }
        }
      },
      orderBy: [
        { totalDonated: 'desc' },
        { name: 'asc' }
      ]
    })

    return { success: true, data: donors }
  } catch (error) {
    console.error("Failed to fetch donors:", error)
    return { error: "Failed to load donors" }
  }
}

// Create donor
export async function createDonor(data: {
  name: string
  email?: string
  phone?: string
  address?: string
  type: string
  tier?: string
  status?: string
  notes?: string
}) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    return { error: "Unauthorized" }
  }

  if (!data.name?.trim()) {
    return { error: "Name is required" }
  }

  try {
    const donor = await prisma.donor.create({
      data: {
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        type: data.type,
        tier: data.tier || 'SUPPORTER',
        status: data.status || 'ACTIVE',
        notes: data.notes || null
      }
    })

    await prisma.auditLog.create({
      data: {
        action: 'DONOR_CREATED',
        details: JSON.stringify({ donorId: donor.id, name: data.name }),
        userId: session.user.id
      }
    })

    revalidatePath('/admin/donors')

    return { success: true, data: donor }
  } catch (error) {
    console.error("Failed to create donor:", error)
    return { error: "Failed to create donor" }
  }
}

// Record donation
export async function recordDonation(data: {
  donorId: string
  amount: number
  type?: string
  method?: string
  campaign?: string
  programType?: string
  isRestricted?: boolean
  restrictions?: string
  receiptNumber?: string
  notes?: string
  donationDate?: Date
}) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    return { error: "Unauthorized" }
  }

  if (!data.amount || data.amount <= 0) {
    return { error: "Invalid amount" }
  }

  try {
    const donation = await prisma.donation.create({
      data: {
        donorId: data.donorId,
        amount: data.amount,
        type: data.type || 'MONETARY',
        method: data.method || null,
        campaign: data.campaign || null,
        programType: data.programType || null,
        isRestricted: data.isRestricted || false,
        restrictions: data.restrictions || null,
        receiptNumber: data.receiptNumber || null,
        notes: data.notes || null,
        donationDate: data.donationDate || new Date(),
        recordedBy: session.user.id
      }
    })

    // Update donor stats
    const donor = await prisma.donor.findUnique({
      where: { id: data.donorId },
      include: { donations: true }
    })

    if (donor) {
      const totalDonated = donor.donations.reduce((sum, d) => sum + d.amount, 0)
      const firstDonation = donor.donations.sort((a, b) =>
        a.donationDate.getTime() - b.donationDate.getTime()
      )[0]?.donationDate

      await prisma.donor.update({
        where: { id: data.donorId },
        data: {
          totalDonated,
          donationCount: donor.donations.length,
          firstDonation: firstDonation || new Date(),
          lastDonation: new Date()
        }
      })
    }

    await prisma.auditLog.create({
      data: {
        action: 'DONATION_RECORDED',
        details: JSON.stringify({ donationId: donation.id, amount: data.amount }),
        userId: session.user.id
      }
    })

    revalidatePath('/admin/donors')

    return { success: true, data: donation }
  } catch (error) {
    console.error("Failed to record donation:", error)
    return { error: "Failed to record donation" }
  }
}

// Get donor details with donations
export async function getDonorDetails(id: string) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    return { error: "Unauthorized" }
  }

  try {
    const donor = await prisma.donor.findUnique({
      where: { id },
      include: {
        donations: {
          orderBy: { donationDate: 'desc' },
          take: 50
        }
      }
    })

    if (!donor) {
      return { error: "Donor not found" }
    }

    return { success: true, data: donor }
  } catch (error) {
    console.error("Failed to fetch donor:", error)
    return { error: "Failed to load donor" }
  }
}
