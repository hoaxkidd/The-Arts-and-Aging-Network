'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

// ============================================
// FORM TEMPLATE MANAGEMENT
// ============================================

// Get all form templates (filtered by role/access)
export async function getFormTemplates(filters?: {
  category?: string
  search?: string
  isActive?: boolean
}) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Unauthorized" }
  }

  try {
    const where: any = {}

    // Non-admins only see active, public templates
    if (session.user.role !== 'ADMIN') {
      where.isActive = true
      where.isPublic = true
    } else if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive
    }

    if (filters?.category && filters.category !== 'ALL') {
      where.category = filters.category
    }

    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { tags: { contains: filters.search, mode: 'insensitive' } }
      ]
    }

    const templates = await prisma.formTemplate.findMany({
      where,
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
            image: true
          }
        },
        _count: {
          select: { submissions: true }
        }
      },
      orderBy: [
        { isActive: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    return { success: true, data: templates }
  } catch (error) {
    console.error("Failed to fetch form templates:", error)
    return { error: "Failed to load form templates" }
  }
}

// Get single template details
export async function getFormTemplate(id: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Unauthorized" }
  }

  try {
    const template = await prisma.formTemplate.findUnique({
      where: { id },
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
            image: true
          }
        },
        submissions: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            submitter: {
              select: {
                id: true,
                name: true,
                preferredName: true
              }
            }
          }
        },
        _count: {
          select: { submissions: true }
        }
      }
    })

    if (!template) {
      return { error: "Template not found" }
    }

    // Check access
    if (session.user.role !== 'ADMIN' && (!template.isActive || !template.isPublic)) {
      return { error: "Template not accessible" }
    }

    // Increment download count
    await prisma.formTemplate.update({
      where: { id },
      data: { downloadCount: { increment: 1 } }
    })

    return { success: true, data: template }
  } catch (error) {
    console.error("Failed to fetch template:", error)
    return { error: "Failed to load template" }
  }
}

// Create new form template (Admin only)
export async function createFormTemplate(data: {
  title: string
  description?: string
  category: string
  fileUrl?: string
  fileName?: string
  fileType?: string
  fileSize?: number
  isFillable?: boolean
  formFields?: string
  tags?: string[]
  requiredFor?: string[]
  isPublic?: boolean
}) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    return { error: "Unauthorized" }
  }

  if (!data.title?.trim()) {
    return { error: "Title is required" }
  }

  if (!data.category) {
    return { error: "Category is required" }
  }

  try {
    const template = await prisma.formTemplate.create({
      data: {
        title: data.title,
        description: data.description || null,
        category: data.category,
        fileUrl: data.fileUrl || null,
        fileName: data.fileName || null,
        fileType: data.fileType || null,
        fileSize: data.fileSize || null,
        isFillable: data.isFillable || false,
        formFields: data.formFields || null,
        tags: data.tags ? JSON.stringify(data.tags) : null,
        requiredFor: data.requiredFor ? JSON.stringify(data.requiredFor) : null,
        isPublic: data.isPublic !== undefined ? data.isPublic : true,
        uploadedBy: session.user.id
      }
    })

    await prisma.auditLog.create({
      data: {
        action: 'FORM_TEMPLATE_CREATED',
        details: JSON.stringify({ templateId: template.id, title: data.title }),
        userId: session.user.id
      }
    })

    revalidatePath('/admin/form-templates')
    revalidatePath('/staff/forms')

    return { success: true, data: template }
  } catch (error) {
    console.error("Failed to create template:", error)
    return { error: "Failed to create template" }
  }
}

// Update form template (Admin only)
export async function updateFormTemplate(
  id: string,
  data: {
    title?: string
    description?: string
    category?: string
    fileUrl?: string
    fileName?: string
    fileType?: string
    fileSize?: number
    isFillable?: boolean
    formFields?: string
    tags?: string[]
    requiredFor?: string[]
    isPublic?: boolean
    isActive?: boolean
    version?: string
  }
) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    return { error: "Unauthorized" }
  }

  try {
    const updates: any = {}

    if (data.title !== undefined) updates.title = data.title
    if (data.description !== undefined) updates.description = data.description
    if (data.category !== undefined) updates.category = data.category
    if (data.fileUrl !== undefined) updates.fileUrl = data.fileUrl
    if (data.fileName !== undefined) updates.fileName = data.fileName
    if (data.fileType !== undefined) updates.fileType = data.fileType
    if (data.fileSize !== undefined) updates.fileSize = data.fileSize
    if (data.isFillable !== undefined) updates.isFillable = data.isFillable
    if (data.formFields !== undefined) updates.formFields = data.formFields
    if (data.tags !== undefined) updates.tags = JSON.stringify(data.tags)
    if (data.requiredFor !== undefined) updates.requiredFor = JSON.stringify(data.requiredFor)
    if (data.isPublic !== undefined) updates.isPublic = data.isPublic
    if (data.isActive !== undefined) updates.isActive = data.isActive
    if (data.version !== undefined) updates.version = data.version

    const template = await prisma.formTemplate.update({
      where: { id },
      data: updates
    })

    await prisma.auditLog.create({
      data: {
        action: 'FORM_TEMPLATE_UPDATED',
        details: JSON.stringify({ templateId: id, updates }),
        userId: session.user.id
      }
    })

    revalidatePath('/admin/form-templates')
    revalidatePath('/staff/forms')
    revalidatePath(`/staff/forms/${id}`)

    return { success: true, data: template }
  } catch (error) {
    console.error("Failed to update template:", error)
    return { error: "Failed to update template" }
  }
}

// Delete form template (Admin only)
export async function deleteFormTemplate(id: string) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    return { error: "Unauthorized" }
  }

  try {
    const template = await prisma.formTemplate.findUnique({
      where: { id },
      select: { title: true, _count: { select: { submissions: true } } }
    })

    if (!template) {
      return { error: "Template not found" }
    }

    // Check if has submissions
    if (template._count.submissions > 0) {
      return {
        error: `Cannot delete template with ${template._count.submissions} submissions. Archive it instead.`
      }
    }

    await prisma.formTemplate.delete({
      where: { id }
    })

    await prisma.auditLog.create({
      data: {
        action: 'FORM_TEMPLATE_DELETED',
        details: JSON.stringify({ templateId: id, title: template.title }),
        userId: session.user.id
      }
    })

    revalidatePath('/admin/form-templates')
    revalidatePath('/staff/forms')

    return { success: true }
  } catch (error) {
    console.error("Failed to delete template:", error)
    return { error: "Failed to delete template" }
  }
}

// ============================================
// FORM SUBMISSIONS
// ============================================

// Submit a filled form
export async function submitForm(data: {
  templateId: string
  formData: Record<string, any>
  eventId?: string
  attachments?: string[]
}) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Unauthorized" }
  }

  try {
    const template = await prisma.formTemplate.findUnique({
      where: { id: data.templateId }
    })

    if (!template) {
      return { error: "Template not found" }
    }

    if (!template.isActive) {
      return { error: "Template is not active" }
    }

    const submission = await prisma.formSubmission.create({
      data: {
        templateId: data.templateId,
        submittedBy: session.user.id,
        formData: JSON.stringify(data.formData),
        eventId: data.eventId || null,
        attachments: data.attachments ? JSON.stringify(data.attachments) : null
      }
    })

    // Update template usage count
    await prisma.formTemplate.update({
      where: { id: data.templateId },
      data: { usageCount: { increment: 1 } }
    })

    revalidatePath('/staff/forms')
    revalidatePath(`/staff/forms/${data.templateId}`)
    revalidatePath('/admin/form-submissions')

    return { success: true, data: submission }
  } catch (error) {
    console.error("Failed to submit form:", error)
    return { error: "Failed to submit form" }
  }
}

// Get user's form submissions
export async function getMyFormSubmissions(filters?: {
  templateId?: string
  status?: string
}) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Unauthorized" }
  }

  try {
    const where: any = {
      submittedBy: session.user.id
    }

    if (filters?.templateId) {
      where.templateId = filters.templateId
    }

    if (filters?.status && filters.status !== 'ALL') {
      where.status = filters.status
    }

    const submissions = await prisma.formSubmission.findMany({
      where,
      include: {
        template: {
          select: {
            id: true,
            title: true,
            category: true
          }
        },
        event: {
          select: {
            id: true,
            title: true,
            startDateTime: true
          }
        },
        reviewer: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return { success: true, data: submissions }
  } catch (error) {
    console.error("Failed to fetch submissions:", error)
    return { error: "Failed to load submissions" }
  }
}

// Get all form submissions (Admin)
export async function getAllFormSubmissions(filters?: {
  templateId?: string
  status?: string
  submitterId?: string
}) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    return { error: "Unauthorized" }
  }

  try {
    const where: any = {}

    if (filters?.templateId) {
      where.templateId = filters.templateId
    }

    if (filters?.status && filters.status !== 'ALL') {
      where.status = filters.status
    }

    if (filters?.submitterId) {
      where.submittedBy = filters.submitterId
    }

    const submissions = await prisma.formSubmission.findMany({
      where,
      include: {
        template: {
          select: {
            id: true,
            title: true,
            category: true
          }
        },
        submitter: {
          select: {
            id: true,
            name: true,
            preferredName: true,
            role: true
          }
        },
        event: {
          select: {
            id: true,
            title: true,
            startDateTime: true
          }
        },
        reviewer: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    })

    return { success: true, data: submissions }
  } catch (error) {
    console.error("Failed to fetch submissions:", error)
    return { error: "Failed to load submissions" }
  }
}

// Review a form submission (Admin)
export async function reviewFormSubmission(
  id: string,
  data: {
    status: 'REVIEWED' | 'APPROVED' | 'REJECTED'
    reviewNotes?: string
  }
) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    return { error: "Unauthorized" }
  }

  try {
    const submission = await prisma.formSubmission.update({
      where: { id },
      data: {
        status: data.status,
        reviewedBy: session.user.id,
        reviewedAt: new Date(),
        reviewNotes: data.reviewNotes || null
      }
    })

    // Notify submitter
    await prisma.notification.create({
      data: {
        userId: submission.submittedBy,
        type: 'FORM_REVIEWED',
        title: `Form ${data.status.toLowerCase()}`,
        message: `Your form submission has been ${data.status.toLowerCase()}`,
        link: `/staff/forms/submissions/${id}`
      }
    })

    await prisma.auditLog.create({
      data: {
        action: 'FORM_SUBMISSION_REVIEWED',
        details: JSON.stringify({ submissionId: id, status: data.status }),
        userId: session.user.id
      }
    })

    revalidatePath('/admin/form-submissions')
    revalidatePath(`/admin/form-submissions/${id}`)

    return { success: true, data: submission }
  } catch (error) {
    console.error("Failed to review submission:", error)
    return { error: "Failed to review submission" }
  }
}
