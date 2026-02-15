'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { join } from "path"
import { mkdir, writeFile } from "fs/promises"
import { notifyAdminsAboutExpense } from "@/lib/notifications"

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
    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      return { error: 'File size exceeds 5MB limit' }
    }

    // Validate type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png']
    if (!allowedTypes.includes(file.type)) {
      return { error: 'Invalid file type. Only PDF, JPG, and PNG are allowed.' }
    }

    // Save file locally
    // Note: In production, use S3/Cloudflare R2/Vercel Blob storage
    try {
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)

      // Sanitize filename and create unique name
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.]/g, '_')
      const fileName = `${Date.now()}-${sanitizedName}`
      const uploadDir = join(process.cwd(), 'public', 'uploads')
      const uploadPath = join(uploadDir, fileName)

      // Ensure upload directory exists
      await mkdir(uploadDir, { recursive: true })

      // Write file to disk
      await writeFile(uploadPath, buffer)

      // Store relative URL for database
      receiptUrl = `/uploads/${fileName}`
    } catch (e) {
      console.error('File upload error:', e)
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
      console.error('Failed to send expense notification:', notifyError)
    }

    revalidatePath('/payroll/requests')
    return { success: true }
  } catch (error) {
    return { error: 'Failed to submit request' }
  }
}
