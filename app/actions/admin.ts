'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { notifyStaffAboutExpenseStatus } from "@/lib/notifications"

export async function updateRequestStatus(requestId: string, status: 'APPROVED' | 'REJECTED') {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    return { error: 'Unauthorized' }
  }

  try {
    const request = await prisma.expenseRequest.update({
      where: { id: requestId },
      data: { status },
    })

    // Log the action
    await prisma.auditLog.create({
      data: {
        action: `REQUEST_${status}`,
        details: JSON.stringify({ requestId, amount: request.amount, category: request.category }),
        userId: session.user.id,
      }
    })

    // Notify admin about the status update
    try {
      await notifyStaffAboutExpenseStatus({
        staffId: request.userId,
        expenseId: request.id,
        category: request.category,
        status
      })
    } catch (notifyError) {
      console.error('Failed to send expense status notification:', notifyError)
    }

    revalidatePath('/admin/requests')
    revalidatePath('/payroll/requests') // Update user view too
    return { success: true }
  } catch (error) {
    return { error: 'Failed to update request status' }
  }
}
