'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

// Upload file attachment to expense/mileage request
export async function attachFileToRequest(data: {
  requestId: string
  fileUrl: string
  fileName: string
  fileType: string
  fileSize: number
}) {
  const session = await auth()
  if (!session?.user?.id) {
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
    console.error("Failed to attach file:", error)
    return { error: "Failed to attach file" }
  }
}

// Remove file attachment
export async function removeFileAttachment(requestId: string, fileId: string) {
  const session = await auth()
  if (!session?.user?.id) {
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

    const existingAttachments = request.attachments ? JSON.parse(request.attachments) : []
    const updatedAttachments = existingAttachments.filter((a: any) => a.id !== fileId)

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
    console.error("Failed to remove file:", error)
    return { error: "Failed to remove file" }
  }
}

// Get upload URL (placeholder - integrate with your storage solution)
export async function getUploadUrl(fileName: string, fileType: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Unauthorized" }
  }

  // TODO: Integrate with your storage solution (S3, Cloudflare R2, etc.)
  // For now, return a placeholder
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
