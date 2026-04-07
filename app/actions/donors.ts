'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import type { Prisma } from "@prisma/client"
import { logger } from "@/lib/logger"

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
    const where: Prisma.DonorWhereInput = {}

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
    logger.serverAction("Failed to fetch donors:", error)
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
    logger.serverAction("Failed to create donor:", error)
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
    // #region agent log
    fetch('http://127.0.0.1:3010/api/debug-log',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'7a8fa1'},body:JSON.stringify({sessionId:'7a8fa1',runId:'donors-pre',hypothesisId:'H1',location:'app/actions/donors.ts:recordDonation:start',message:'recordDonation input',data:{donorId:data.donorId,amount:data.amount,type:data.type ?? null,method:data.method ?? null,campaign:data.campaign ?? null,programType:data.programType ?? null,donationDate:data.donationDate ? data.donationDate.toISOString() : null},timestamp:Date.now()})}).catch(()=>{})
    // #endregion
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

      // #region agent log
      fetch('http://127.0.0.1:3010/api/debug-log',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'7a8fa1'},body:JSON.stringify({sessionId:'7a8fa1',runId:'donors-pre',hypothesisId:'H2',location:'app/actions/donors.ts:recordDonation:stats',message:'computed donor stats before update',data:{donorId:data.donorId,donationCount:donor.donations.length,totalDonated,firstDonation:firstDonation ? firstDonation.toISOString() : null,lastDonationStrategy:'new Date()'},timestamp:Date.now()})}).catch(()=>{})
      // #endregion

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

    // #region agent log
    fetch('http://127.0.0.1:3010/api/debug-log',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'7a8fa1'},body:JSON.stringify({sessionId:'7a8fa1',runId:'donors-pre',hypothesisId:'H3',location:'app/actions/donors.ts:recordDonation:done',message:'recordDonation success',data:{donationId:donation.id,donorId:data.donorId},timestamp:Date.now()})}).catch(()=>{})
    // #endregion

    return { success: true, data: donation }
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:3010/api/debug-log',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'7a8fa1'},body:JSON.stringify({sessionId:'7a8fa1',runId:'donors-pre',hypothesisId:'H4',location:'app/actions/donors.ts:recordDonation:error',message:'recordDonation failed',data:{error:error instanceof Error ? error.message : String(error)},timestamp:Date.now()})}).catch(()=>{})
    // #endregion
    logger.serverAction("Failed to record donation:", error)
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
    logger.serverAction("Failed to fetch donor:", error)
    return { error: "Failed to load donor" }
  }
}

export async function updateDonor(id: string, data: {
  name?: string
  email?: string
  phone?: string
  address?: string
  type?: string
  tier?: string
  status?: string
  isRecurring?: boolean
  notes?: string
}) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    return { error: 'Unauthorized' }
  }

  try {
    const donor = await prisma.donor.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.email !== undefined ? { email: data.email || null } : {}),
        ...(data.phone !== undefined ? { phone: data.phone || null } : {}),
        ...(data.address !== undefined ? { address: data.address || null } : {}),
        ...(data.type !== undefined ? { type: data.type } : {}),
        ...(data.tier !== undefined ? { tier: data.tier } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.isRecurring !== undefined ? { isRecurring: data.isRecurring } : {}),
        ...(data.notes !== undefined ? { notes: data.notes || null } : {}),
      },
    })

    await prisma.auditLog.create({
      data: {
        action: 'DONOR_UPDATED',
        details: JSON.stringify({ donorId: id }),
        userId: session.user.id,
      },
    })

    revalidatePath('/admin/donors')
    return { success: true, data: donor }
  } catch (error) {
    logger.serverAction('Failed to update donor:', error)
    return { error: 'Failed to update donor' }
  }
}

export async function deleteDonor(id: string) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    return { error: 'Unauthorized' }
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.donation.deleteMany({ where: { donorId: id } })
      await tx.donor.delete({ where: { id } })
      await tx.auditLog.create({
        data: {
          action: 'DONOR_DELETED',
          details: JSON.stringify({ donorId: id }),
          userId: session.user.id,
        },
      })
    })

    revalidatePath('/admin/donors')
    return { success: true }
  } catch (error) {
    logger.serverAction('Failed to delete donor:', error)
    return { error: 'Failed to delete donor' }
  }
}
