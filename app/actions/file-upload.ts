'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { isPayrollOrAdminRole } from "@/lib/roles"
import { logger } from "@/lib/logger"

// Upload file attachment to expense/mileage request
export async function attachFileToRequest(data: {
  requestId: string
  fileUrl: string
  fileName: string
  fileType: string
  fileSize: number
}) {
  const session = await auth()
  if (!session?.user?.id || !isPayrollOrAdminRole(session.user.role)) {
    return { error: "Unauthorized" }
  }

  try {
    // Get the request to check ownership
    const request = await prisma.expenseRequest.findUnique({
      where: { id: data.requestId }
    })

    if (!request) {
      return { error: "Request not found" }
    }

    if (request.userId !== session.user.id && session.user.role !== 'ADMIN') {
      return { error: "Unauthorized" }
    }

    // Get existing attachments
    const existingAttachments = request.attachments ? JSON.parse(request.attachments) : []

    // Add new attachment
    existingAttachments.push({
      id: `file_${Date.now()}`,
      url: data.fileUrl,
      name: data.fileName,
      type: data.fileType,
      size: data.fileSize,
      uploadedAt: new Date().toISOString(),
      uploadedBy: session.user.id
    })

    // Update request
    await prisma.expenseRequest.update({
      where: { id: data.requestId },
      data: {
        attachments: JSON.stringify(existingAttachments)
      }
    })

    revalidatePath('/payroll/requests')
    revalidatePath('/admin/requests')

    return { success: true }
  } catch (error) {
    logger.upload("Failed to attach file", error)
    return { error: "Failed to attach file" }
  }
}

// Remove file attachment
export async function removeFileAttachment(requestId: string, fileId: string) {
  const session = await auth()
  if (!session?.user?.id || !isPayrollOrAdminRole(session.user.role)) {
    return { error: "Unauthorized" }
  }

  try {
    const request = await prisma.expenseRequest.findUnique({
      where: { id: requestId }
    })

    if (!request) {
      return { error: "Request not found" }
    }

    if (request.userId !== session.user.id && session.user.role !== 'ADMIN') {
      return { error: "Unauthorized" }
    }

    const existingAttachments: Array<{ id: string }> = request.attachments ? JSON.parse(request.attachments) : []
    const updatedAttachments = existingAttachments.filter((a) => a.id !== fileId)

    await prisma.expenseRequest.update({
      where: { id: requestId },
      data: {
        attachments: JSON.stringify(updatedAttachments)
      }
    })

    revalidatePath('/payroll/requests')
    revalidatePath('/admin/requests')

    return { success: true }
  } catch (error) {
    logger.upload("Failed to remove file", error)
    return { error: "Failed to remove file" }
  }
}

// Get upload URL (for direct R2 uploads via API)
export async function getUploadUrl(fileName: string, _fileType: string) {
  const session = await auth()
  if (!session?.user?.id || !isPayrollOrAdminRole(session.user.role)) {
    return { error: "Unauthorized" }
  }

  // Generate a unique key for the upload
  const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substring(7)}`

  return {
    success: true,
    data: {
      uploadUrl: `/api/upload/${uploadId}`,
      uploadId,
      fileKey: `uploads/${session.user.id}/${uploadId}/${fileName}`
    }
  }
}
