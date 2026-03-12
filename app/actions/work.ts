'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { isPayrollOrAdminRole } from "@/lib/roles"
import { Prisma } from "@prisma/client"

export async function startWork(data: { type: string, notes?: string }) {
  const session = await auth()
  if (!session?.user?.id || !isPayrollOrAdminRole(session.user.role)) return { error: 'Unauthorized' }

  try {
    const workLog = await prisma.$transaction(async (tx) => {
      const activeSession = await tx.workLog.findFirst({
        where: {
          userId: session.user.id,
          status: 'ACTIVE',
        },
      })

      if (activeSession) {
        throw new Error('ACTIVE_SESSION_EXISTS')
      }

      return tx.workLog.create({
        data: {
          userId: session.user.id,
          type: data.type,
          notes: data.notes,
          status: 'ACTIVE',
          startTime: new Date(),
          date: new Date(),
        },
      })
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    })

    await prisma.auditLog.create({
      data: {
        action: 'WORK_START',
        details: JSON.stringify({ workLogId: workLog.id, type: data.type }),
        userId: session.user.id
      }
    })

    revalidatePath('/payroll/check-in')
    return { success: true, data: workLog }
  } catch (e) {
    if (e instanceof Error && e.message === 'ACTIVE_SESSION_EXISTS') {
      return { error: 'You already have an active work session.' }
    }
    console.error(e)
    return { error: 'Failed to start work session' }
  }
}

export async function endWork(workLogId: string, notes?: string) {
  const session = await auth()
  if (!session?.user?.id || !isPayrollOrAdminRole(session.user.role)) return { error: 'Unauthorized' }

  try {
    const workLog = await prisma.workLog.findUnique({
      where: { id: workLogId }
    })

    if (!workLog || workLog.userId !== session.user.id) {
      return { error: 'Work log not found or unauthorized' }
    }

    if (workLog.status !== 'ACTIVE') {
      return { error: 'This session is already completed' }
    }

    const endTime = new Date()
    
    // Append notes if provided
    const updatedNotes = notes ? (workLog.notes ? `${workLog.notes}\n\n[End Notes]: ${notes}` : notes) : workLog.notes

    await prisma.workLog.update({
      where: { id: workLogId },
      data: {
        endTime: endTime,
        status: 'COMPLETED',
        notes: updatedNotes
      }
    })

    await prisma.auditLog.create({
      data: {
        action: 'WORK_END',
        details: JSON.stringify({ workLogId }),
        userId: session.user.id
      }
    })

    revalidatePath('/payroll/check-in')
    return { success: true }
  } catch (e) {
    return { error: 'Failed to end work session' }
  }
}

export async function logActivity(workLogId: string, activity: string) {
  const session = await auth()
  if (!session?.user?.id || !isPayrollOrAdminRole(session.user.role)) return { error: 'Unauthorized' }

  try {
    const workLog = await prisma.workLog.findUnique({
      where: { id: workLogId }
    })

    if (!workLog || workLog.userId !== session.user.id) {
      return { error: 'Work log not found' }
    }

    // Append activity to existing JSON or text
    // Simple text appending with timestamps for now
    const timestamp = new Date().toLocaleTimeString()
    const newEntry = `[${timestamp}] ${activity}`
    const updatedActivities = workLog.activities ? `${workLog.activities}\n${newEntry}` : newEntry

    await prisma.workLog.update({
      where: { id: workLogId },
      data: {
        activities: updatedActivities
      }
    })

    revalidatePath('/payroll/check-in')
    return { success: true }
  } catch (e) {
    return { error: 'Failed to log activity' }
  }
}
