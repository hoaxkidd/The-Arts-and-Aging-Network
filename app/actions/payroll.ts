'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const timeEntrySchema = z.object({
  hours: z.number().min(0).max(24),
  date: z.string().transform((str) => new Date(str)),
})

// Simplified One-Click Check-in
export async function quickCheckIn() {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }

  const now = new Date()

  try {
    // Log check-in event
    // For now, we can create a TimeEntry with 0 hours or a dedicated CheckIn model if one existed.
    // Using TimeEntry with status 'CHECKED_IN' (if enum allows) or just standard creation.
    // Assuming we want to log the event:
    
    // Check if there is already an open entry? 
    // For simplicity requested, we just log a timestamp.
    
    await prisma.workLog.create({
        data: {
            userId: session.user.id,
            startTime: now,
            status: 'CHECKED_IN',
            notes: 'One-click daily check-in',
            type: 'OFFICE' // Default type
        }
    })

    revalidatePath('/payroll/check-in')
    return { success: true, timestamp: now }
  } catch (e) {
    console.error("Check-in failed:", e)
    return { error: "Failed to record check-in" }
  }
}

export async function submitTimeEntry(formData: FormData) {
  const session = await auth()
  if (!session?.user || (session.user.role !== 'PAYROLL' && session.user.role !== 'ADMIN')) {
    return { error: 'Unauthorized' }
  }

  const rawHours = parseFloat(formData.get('hours') as string)
  const rawDate = formData.get('date') as string

  const validation = timeEntrySchema.safeParse({
    hours: rawHours,
    date: rawDate,
  })

  if (!validation.success) {
    return { error: 'Invalid input. Hours must be between 0 and 24.' }
  }

  // Validate date is not in the past (allow today)
  // Create new Date objects to avoid mutating validation data
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const entryDate = new Date(validation.data.date)
  entryDate.setHours(0, 0, 0, 0)

  if (entryDate < today) {
    return { error: 'Backdated check-ins are not allowed. Please contact an admin.' }
  }

  try {
    await prisma.timeEntry.create({
      data: {
        userId: session.user.id,
        hours: validation.data.hours,
        date: validation.data.date,
        status: 'PENDING',
      },
    })

    await prisma.auditLog.create({
      data: {
        action: 'TIME_ENTRY_CREATED',
        details: JSON.stringify({ hours: validation.data.hours, date: validation.data.date }),
        userId: session.user.id,
      }
    })

    revalidatePath('/payroll')
    revalidatePath('/payroll/check-in')
    return { success: true }
  } catch (error) {
    return { error: 'Failed to submit time entry' }
  }
}
