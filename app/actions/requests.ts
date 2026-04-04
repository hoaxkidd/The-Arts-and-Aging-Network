'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { notifyAdminsAboutExpense } from "@/lib/notifications"
import { logger } from "@/lib/logger"
import { uploadToR2, isValidFileSize, getR2Diagnostics, R2ConfigurationError } from "@/lib/r2"

const requestSchema = z.object({
  category: z.enum(['SICK_DAY', 'OFF_DAY', 'EXPENSE']),
  description: z.string().min(1, "Description is required"),
  amount: z.number().optional(),
})

export async function submitRequest(formData: FormData) {
  const session = await auth()
  if (!session?.user || (session.user.role !== 'PAYROLL' && session.user.role !== 'ADMIN')) {
    return { error: 'Unauthorized' }
  }

  const category = formData.get('category') as string
  const description = formData.get('description') as string
  const amountStr = formData.get('amount') as string
  const file = formData.get('receipt') as File | null

  // Parse amount safely - check for NaN
  let parsedAmount: number | undefined = undefined
  if (amountStr) {
    const parsed = parseFloat(amountStr)
    if (isNaN(parsed)) {
      return { error: 'Invalid amount value' }
    }
    parsedAmount = parsed
  }

  // Validate fields
  const validation = requestSchema.safeParse({
    category,
    description,
    amount: parsedAmount,
  })

  if (!validation.success) {
    const errorMessage = validation.error.issues[0]?.message || 'Invalid input fields'
    return { error: errorMessage }
  }

  let receiptUrl = null

  // Handle File Upload
  if (file && file.size > 0) {
    if (!isValidFileSize(file.size, 5)) {
      return { error: 'File size exceeds 5MB limit' }
    }

    // Validate type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png']
    if (!allowedTypes.includes(file.type)) {
      return { error: 'Invalid file type. Only PDF, JPG, and PNG are allowed.' }
    }

    try {
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)

      const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const uploaded = await uploadToR2(
        buffer,
        safeFileName,
        file.type,
        `expense-receipts/${session.user.id}`
      )

      receiptUrl = uploaded.url
    } catch (e) {
      logger.upload('Expense receipt upload error', {
        error: e,
        diagnostics: getR2Diagnostics(),
      })

      if (e instanceof R2ConfigurationError) {
        return { error: 'Receipt storage is not configured correctly. Please contact an administrator.' }
      }

      return { error: 'Failed to upload file' }
    }
  }

  try {
    const expenseRequest = await prisma.expenseRequest.create({
      data: {
        userId: session.user.id,
        category: validation.data.category,
        description: validation.data.description,
        amount: validation.data.amount,
        receiptUrl,
        status: 'PENDING',
      },
    })

    await prisma.auditLog.create({
      data: {
        action: 'REQUEST_CREATED',
        details: JSON.stringify({ category: validation.data.category, amount: validation.data.amount }),
        userId: session.user.id,
      }
    })

    // Notify admins about the new request
    try {
      await notifyAdminsAboutExpense({
        staffName: session.user.name || 'Staff member',
        staffId: session.user.id,
        expenseId: expenseRequest.id,
        category: validation.data.category,
        description: validation.data.description
      })
    } catch (notifyError) {
      logger.serverAction('Failed to send expense notification:', notifyError)
    }

    revalidatePath('/payroll/requests')
    return { success: true }
  } catch (error) {
    return { error: 'Failed to submit request' }
  }
}
