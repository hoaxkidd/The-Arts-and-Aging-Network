'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

// Get the Monday of a given week
function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Adjust for Sunday
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

// Get a timesheet for the given week (read-only, does NOT auto-create)
export async function getWeeklyTimesheet(weekStartDate?: Date) {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }

  const weekStart = getWeekStart(weekStartDate || new Date())

  try {
    const timesheet = await prisma.timesheet.findUnique({
      where: {
        userId_weekStart: {
          userId: session.user.id,
          weekStart
        }
      },
      include: {
        entries: {
          orderBy: { date: 'asc' }
        }
      }
    })

    return { timesheet: timesheet || null }
  } catch (e) {
    console.error('getWeeklyTimesheet error:', e)
    return { error: "Failed to get timesheet" }
  }
}

// Create a new timesheet for the given week
export async function createWeeklyTimesheet(weekStartDate?: Date) {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }

  const weekStart = getWeekStart(weekStartDate || new Date())

  try {
    // Return existing if already created
    const existing = await prisma.timesheet.findUnique({
      where: {
        userId_weekStart: {
          userId: session.user.id,
          weekStart
        }
      },
      include: {
        entries: {
          orderBy: { date: 'asc' }
        }
      }
    })

    if (existing) return { timesheet: existing }

    const timesheet = await prisma.timesheet.create({
      data: {
        userId: session.user.id,
        weekStart,
        status: 'DRAFT'
      },
      include: {
        entries: true
      }
    })

    return { timesheet }
  } catch (e) {
    console.error('createWeeklyTimesheet error:', e)
    return { error: "Failed to create timesheet" }
  }
}

// Save a timesheet entry
export async function saveTimesheetEntry(
  timesheetId: string,
  entryData: {
    id?: string
    date: string
    checkInTime?: string
    checkOutTime?: string
    hoursWorked?: number
    programName?: string
    fundingClass?: string
    notes?: string
  }
) {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }

  try {
    // Verify timesheet belongs to user and is in DRAFT status
    const timesheet = await prisma.timesheet.findUnique({
      where: { id: timesheetId }
    })

    if (!timesheet) return { error: "Timesheet not found" }
    if (timesheet.userId !== session.user.id) return { error: "Unauthorized" }
    if (timesheet.status !== 'DRAFT') return { error: "Timesheet is not editable" }

    const date = new Date(entryData.date)

    // Calculate hours if check-in and check-out provided
    let hoursWorked = entryData.hoursWorked || 0
    let checkInTime: Date | undefined
    let checkOutTime: Date | undefined

    if (entryData.checkInTime) {
      const [inHour, inMin] = entryData.checkInTime.split(':').map(Number)
      checkInTime = new Date(date)
      checkInTime.setHours(inHour, inMin, 0, 0)
    }

    if (entryData.checkOutTime) {
      const [outHour, outMin] = entryData.checkOutTime.split(':').map(Number)
      checkOutTime = new Date(date)
      checkOutTime.setHours(outHour, outMin, 0, 0)
    }

    if (checkInTime && checkOutTime) {
      const diffMs = checkOutTime.getTime() - checkInTime.getTime()
      hoursWorked = Math.round((diffMs / 3600000) * 100) / 100 // Round to 2 decimals
    }

    if (entryData.id) {
      // Update existing entry
      await prisma.timesheetEntry.update({
        where: { id: entryData.id },
        data: {
          date,
          checkInTime,
          checkOutTime,
          hoursWorked,
          programName: entryData.programName,
          fundingClass: entryData.fundingClass,
          notes: entryData.notes
        }
      })
    } else {
      // Create new entry
      await prisma.timesheetEntry.create({
        data: {
          timesheetId,
          userId: session.user.id,
          date,
          checkInTime,
          checkOutTime,
          hoursWorked,
          programName: entryData.programName,
          fundingClass: entryData.fundingClass,
          notes: entryData.notes
        }
      })
    }

    revalidatePath('/payroll/timesheet')
    return { success: true }
  } catch (e) {
    console.error('saveTimesheetEntry error:', e)
    return { error: "Failed to save entry" }
  }
}

// Delete a timesheet entry
export async function deleteTimesheetEntry(entryId: string) {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }

  try {
    const entry = await prisma.timesheetEntry.findUnique({
      where: { id: entryId },
      include: { timesheet: true }
    })

    if (!entry) return { error: "Entry not found" }
    if (entry.userId !== session.user.id) return { error: "Unauthorized" }
    if (entry.timesheet.status !== 'DRAFT') return { error: "Timesheet is not editable" }

    await prisma.timesheetEntry.delete({
      where: { id: entryId }
    })

    revalidatePath('/payroll/timesheet')
    return { success: true }
  } catch (e) {
    console.error('deleteTimesheetEntry error:', e)
    return { error: "Failed to delete entry" }
  }
}

// Submit timesheet for approval
export async function submitTimesheet(timesheetId: string) {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }

  try {
    const timesheet = await prisma.timesheet.findUnique({
      where: { id: timesheetId },
      include: { entries: true }
    })

    if (!timesheet) return { error: "Timesheet not found" }
    if (timesheet.userId !== session.user.id) return { error: "Unauthorized" }
    if (timesheet.status !== 'DRAFT') return { error: "Timesheet already submitted" }
    if (timesheet.entries.length === 0) return { error: "No entries to submit" }

    await prisma.timesheet.update({
      where: { id: timesheetId },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date()
      }
    })

    // Notify admins
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN', status: 'ACTIVE' }
    })

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, preferredName: true }
    })

    const staffName = user?.preferredName || user?.name || 'A staff member'

    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          type: 'TIMESHEET_SUBMITTED',
          title: 'Timesheet Submitted',
          message: `${staffName} has submitted their timesheet for review`,
          link: `/admin/timesheets/${timesheetId}`
        }
      })
    }

    revalidatePath('/payroll/timesheet')
    return { success: true }
  } catch (e) {
    console.error('submitTimesheet error:', e)
    return { error: "Failed to submit timesheet" }
  }
}

// Get timesheets for admin
export async function getTimesheetsForAdmin(status?: string) {
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

    const timesheets = await prisma.timesheet.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, preferredName: true, image: true }
        },
        entries: true
      },
      orderBy: { weekStart: 'desc' }
    })

    return { timesheets }
  } catch (e) {
    console.error('getTimesheetsForAdmin error:', e)
    return { error: "Failed to get timesheets" }
  }
}

// Approve timesheet (admin only)
export async function approveTimesheet(timesheetId: string) {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }

  // Verify admin
  const admin = await prisma.user.findUnique({
    where: { id: session.user.id }
  })
  if (admin?.role !== 'ADMIN') return { error: "Unauthorized" }

  try {
    const timesheet = await prisma.timesheet.findUnique({
      where: { id: timesheetId }
    })

    if (!timesheet) return { error: "Timesheet not found" }
    if (timesheet.status !== 'SUBMITTED') return { error: "Timesheet is not pending approval" }

    await prisma.timesheet.update({
      where: { id: timesheetId },
      data: {
        status: 'APPROVED',
        approvedBy: session.user.id,
        approvedAt: new Date()
      }
    })

    // Notify staff
    await prisma.notification.create({
      data: {
        userId: timesheet.userId,
        type: 'TIMESHEET_APPROVED',
        title: 'Timesheet Approved',
        message: 'Your timesheet has been approved',
        link: '/payroll/timesheet'
      }
    })

    revalidatePath('/admin/timesheets')
    return { success: true }
  } catch (e) {
    console.error('approveTimesheet error:', e)
    return { error: "Failed to approve timesheet" }
  }
}

// Reject timesheet (admin only)
export async function rejectTimesheet(timesheetId: string, notes: string) {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }

  // Verify admin
  const admin = await prisma.user.findUnique({
    where: { id: session.user.id }
  })
  if (admin?.role !== 'ADMIN') return { error: "Unauthorized" }

  try {
    const timesheet = await prisma.timesheet.findUnique({
      where: { id: timesheetId }
    })

    if (!timesheet) return { error: "Timesheet not found" }
    if (timesheet.status !== 'SUBMITTED') return { error: "Timesheet is not pending approval" }

    await prisma.timesheet.update({
      where: { id: timesheetId },
      data: {
        status: 'DRAFT', // Return to draft for editing
        rejectionNote: notes
      }
    })

    // Notify staff
    await prisma.notification.create({
      data: {
        userId: timesheet.userId,
        type: 'TIMESHEET_REJECTED',
        title: 'Timesheet Returned',
        message: `Your timesheet needs revision: ${notes}`,
        link: '/payroll/timesheet'
      }
    })

    revalidatePath('/admin/timesheets')
    return { success: true }
  } catch (e) {
    console.error('rejectTimesheet error:', e)
    return { error: "Failed to reject timesheet" }
  }
}

// Delete a timesheet (Admin only, mostly for drafts)
export async function deleteTimesheet(timesheetId: string) {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }

  // Verify admin
  const user = await prisma.user.findUnique({
    where: { id: session.user.id }
  })
  if (user?.role !== 'ADMIN') return { error: "Unauthorized" }

  try {
    const timesheet = await prisma.timesheet.findUnique({
      where: { id: timesheetId }
    })

    if (!timesheet) return { error: "Timesheet not found" }
    
    // Only allow deleting drafts
    if (timesheet.status !== 'DRAFT') {
      return { error: "Can only delete draft timesheets" }
    }

    // Delete related entries first (cascade should handle this, but being safe)
    await prisma.timesheetEntry.deleteMany({
      where: { timesheetId }
    })

    await prisma.timesheet.delete({
      where: { id: timesheetId }
    })

    revalidatePath('/admin/financials')
    revalidatePath('/payroll/timesheet')
    return { success: true }
  } catch (e) {
    console.error('deleteTimesheet error:', e)
    return { error: "Failed to delete timesheet" }
  }
}
