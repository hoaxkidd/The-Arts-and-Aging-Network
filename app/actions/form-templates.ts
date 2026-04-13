'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import type { Prisma } from "@prisma/client"
import { createNotification } from "./notifications"
import { sendDirectMessage } from "./direct-messages"
import { logger } from "@/lib/logger"
import { canAccessTemplate } from "@/lib/form-access"

function hasTemplateAccess(
  template: { isActive: boolean; isPublic: boolean; allowedRoles: string | null },
  roles: string[],
  opts?: { isHomeAdmin?: boolean }
) {
  return canAccessTemplate(template, { roles, isHomeAdmin: opts?.isHomeAdmin })
}

// ============================================
// ADMIN: REQUEST RESUBMISSION
// ============================================

export async function requestUserResubmission(formData: FormData): Promise<{ success?: true; error?: string }> {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return { error: "Unauthorized" }
  }

  const userId = String(formData.get('userId') || '').trim()
  const title = String(formData.get('title') || '').trim()
  const message = String(formData.get('message') || '').trim()
  const actionUrl = String(formData.get('actionUrl') || '').trim()

  if (!userId || !title || !message) {
    return { error: "Missing required fields" }
  }

  try {
    // Notify in-app
    await createNotification({
      userId,
      type: 'RESUBMISSION_REQUEST',
      title,
      message,
      actionUrl: actionUrl || undefined,
    })

    // Also send as a direct message (email relay when possible)
    await sendDirectMessage({
      recipientId: userId,
      subject: title,
      content: actionUrl ? `${message}\n\nOpen: ${actionUrl}` : message,
    })

    await prisma.auditLog.create({
      data: {
        action: 'USER_RESUBMISSION_REQUESTED',
        details: JSON.stringify({ targetUserId: userId, title, actionUrl: actionUrl || null }),
        userId: session.user.id,
      },
    })

    revalidatePath(`/admin/users/${userId}`)
    revalidatePath('/admin/users')
    return { success: true }
  } catch (error) {
    logger.serverAction("Failed to request resubmission", error)
    return { error: "Failed to request resubmission" }
  }
}

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
    const where: Prisma.FormTemplateWhereInput = {}

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
        { title: { contains: filters.search } },
        { description: { contains: filters.search } },
        { tags: { contains: filters.search } }
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
    logger.serverAction("Failed to fetch form templates:", error)
    return { error: "Failed to load form templates" }
  }
}

// Get EVENT_SIGNUP form templates for Program Coordinator booking requests
export async function getEventSignupForms() {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Unauthorized" }
  }

  try {
    const roles = Array.isArray(session.user.roles) ? session.user.roles : (session.user.role ? [session.user.role] : [])
    const isHomeAdmin = session.user.role === 'HOME_ADMIN'
    const templates = await prisma.formTemplate.findMany({
      where: {
        category: 'EVENT_SIGNUP',
        isActive: true,
        isFillable: true,
      },
      orderBy: { title: 'asc' }
    })

    const visibleTemplates = templates.filter((template) =>
      hasTemplateAccess(
        { isActive: Boolean(template.isActive), isPublic: Boolean(template.isPublic), allowedRoles: template.allowedRoles ?? null },
        roles,
        { isHomeAdmin }
      )
    )

    return { success: true, data: visibleTemplates }
  } catch (error) {
    logger.serverAction("Failed to fetch booking sign-up forms:", error)
    return { error: "Failed to load booking sign-up forms" }
  }
}

// Get single template details
export async function getFormTemplate(id: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Unauthorized" }
  }
  const roles = Array.isArray(session.user.roles) ? session.user.roles : (session.user.role ? [session.user.role] : [])

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
    const isHomeAdmin = session.user.role === 'HOME_ADMIN'
    if (!hasTemplateAccess(template, roles, { isHomeAdmin })) {
      return { error: "Template not accessible" }
    }

    return { success: true, data: template }
  } catch (error) {
    logger.serverAction("Failed to fetch template:", error)
    return { error: "Failed to load template" }
  }
}

// Create new form template (Admin only)
export async function createFormTemplate(data: {
  title: string
  description?: string
  descriptionHtml?: string
  category: string
  fileName?: string
  fileSize?: number
  isFillable?: boolean
  formFields?: string
  tags?: string[]
  requiredFor?: string[]
  isPublic?: boolean
  allowedRoles?: string[]
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
    const allowedRolesStr = data.allowedRoles && data.allowedRoles.length > 0 
      ? data.allowedRoles.join(',') 
      : null
    
    const template = await prisma.formTemplate.create({
      data: {
        title: data.title,
        description: data.description || null,
        descriptionHtml: data.descriptionHtml || null,
        category: data.category,
        fileName: data.fileName || null,
        fileSize: data.fileSize || null,
        isFillable: data.isFillable || false,
        formFields: data.formFields || null,
        tags: data.tags ? JSON.stringify(data.tags) : null,
        requiredFor: data.requiredFor ? JSON.stringify(data.requiredFor) : null,
        isPublic: data.isPublic !== undefined ? data.isPublic : true,
        allowedRoles: allowedRolesStr,
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

    revalidatePath('/admin/forms')
    revalidatePath('/staff/forms')

    return { success: true, data: template }
  } catch (error) {
    logger.serverAction("Failed to create template:", error)
    return { error: "Failed to create template" }
  }
}

// Update form template (Admin only)
export async function updateFormTemplate(
  id: string,
  data: {
    title?: string
    description?: string
    descriptionHtml?: string
    category?: string
    fileName?: string
    fileSize?: number
    isFillable?: boolean
    formFields?: string
    tags?: string[]
    requiredFor?: string[]
    isPublic?: boolean
    isActive?: boolean
    version?: string
    allowedRoles?: string[]
  }
) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    return { error: "Unauthorized" }
  }

  try {
    const updates: Prisma.FormTemplateUpdateInput = {}

    if (data.title !== undefined) updates.title = data.title
    if (data.description !== undefined) updates.description = data.description
    if (data.descriptionHtml !== undefined) updates.descriptionHtml = data.descriptionHtml
    if (data.category !== undefined) updates.category = data.category
    if (data.fileName !== undefined) updates.fileName = data.fileName
    if (data.fileSize !== undefined) updates.fileSize = data.fileSize
    if (data.isFillable !== undefined) updates.isFillable = data.isFillable
    if (data.formFields !== undefined) updates.formFields = data.formFields
    if (data.tags !== undefined) updates.tags = JSON.stringify(data.tags)
    if (data.requiredFor !== undefined) updates.requiredFor = JSON.stringify(data.requiredFor)
    if (data.isPublic !== undefined) updates.isPublic = data.isPublic
    if (data.isActive !== undefined) updates.isActive = data.isActive
    if (data.version !== undefined) updates.version = data.version
    if (data.allowedRoles !== undefined) {
      updates.allowedRoles = data.allowedRoles && data.allowedRoles.length > 0 
        ? data.allowedRoles.join(',') 
        : null
    }

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

    revalidatePath('/admin/forms')
    revalidatePath('/staff/forms')
    revalidatePath(`/staff/forms/${id}`)

    return { success: true, data: template }
  } catch (error) {
    logger.serverAction("Failed to update template:", error)
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

    revalidatePath('/admin/forms')
    revalidatePath('/staff/forms')

    return { success: true }
  } catch (error) {
    logger.serverAction("Failed to delete template:", error)
    return { error: "Failed to delete template" }
  }
}

// ============================================
// FORM SUBMISSIONS
// ============================================

// Submit a filled form
export async function submitForm(data: {
  templateId: string
  formData: Record<string, unknown>
  eventId?: string
  eventRequestId?: string
  attachments?: string[]
}) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Unauthorized" }
  }
  const roles = Array.isArray(session.user.roles) ? session.user.roles : (session.user.role ? [session.user.role] : [])

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

    const isHomeAdmin = session.user.role === 'HOME_ADMIN'
    if (!hasTemplateAccess(template, roles, { isHomeAdmin })) {
      return { error: "Template not accessible" }
    }

    const allowsMultipleSubmissions = template.category === 'EVENT_SIGNUP' && session.user.role === 'HOME_ADMIN'
    if (!allowsMultipleSubmissions) {
      const existingSubmission = await prisma.formSubmission.findFirst({
        where: {
          templateId: data.templateId,
          submittedBy: session.user.id,
        },
        select: { id: true },
      })

      if (existingSubmission) {
        return {
          error: 'This form can only be submitted once. Your previous submission is available for preview.',
          existingSubmissionId: existingSubmission.id,
        }
      }
    }

    const submission = await prisma.formSubmission.create({
      data: {
        templateId: data.templateId,
        submittedBy: session.user.id,
        formData: JSON.stringify(data.formData),
        eventId: data.eventId || null,
        eventRequestId: data.eventRequestId || null,
        attachments: data.attachments ? JSON.stringify(data.attachments) : null
      }
    })

    // Update template usage count
    await prisma.formTemplate.update({
      where: { id: data.templateId },
      data: { usageCount: { increment: 1 } }
    })

    // Notify admins about new submission
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true }
    })
    const userName = session.user.name || session.user.email || 'A user'
    for (const admin of admins) {
      await createNotification({
        userId: admin.id,
        type: 'FORM_SUBMISSION',
        title: 'New Form Submission',
        message: `${userName} submitted "${template.title}"`,
        actionUrl: '/admin/forms?tab=submissions'
      })
    }

    revalidatePath('/staff/forms')
    revalidatePath(`/staff/forms/${data.templateId}`)
    revalidatePath('/admin/form-submissions')
    revalidatePath('/admin/forms')

    return { success: true, data: submission }
  } catch (error) {
    logger.serverAction("Failed to submit form:", error)
    return { error: "Failed to submit form" }
  }
}

// Request edit access for a form submission
export async function requestEditAccess(submissionId: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Unauthorized" }
  }
  if (session.user.role !== 'ADMIN') {
    return { error: "Only administrators can manage form submission edits" }
  }

  try {
    const submission = await prisma.formSubmission.findUnique({
      where: { id: submissionId },
      include: {
        template: { select: { title: true } },
        submitter: { select: { name: true } }
      }
    })

    if (!submission) {
      return { error: "Submission not found" }
    }

    // Only the submitter can request edit access
    if (submission.submittedBy !== session.user.id) {
      return { error: "You can only request edit access for your own submissions" }
    }

    // Update submission to request edit
    await prisma.formSubmission.update({
      where: { id: submissionId },
      data: {
        editRequested: true,
        editApproved: false,
        editDenyReason: null
      }
    })

    // Get all admin users to notify
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' }
    })

    // Create in-app notifications for all admins
    await prisma.notification.createMany({
      data: admins.map(admin => ({
        userId: admin.id,
        type: 'FORM_EDIT_REQUEST',
        title: 'Form Edit Request',
        message: `${submission.submitter?.name || 'A user'} requested to edit their submission for "${submission.template.title}"`,
        link: `/admin/form-submissions?editRequest=true`
      }))
    })

    revalidatePath('/staff/forms')
    revalidatePath(`/staff/forms/${submission.templateId}`)
    revalidatePath('/dashboard/forms')
    revalidatePath(`/dashboard/forms/${submission.templateId}`)

    return { success: true }
  } catch (error) {
    logger.serverAction("Failed to request edit access:", error)
    return { error: "Failed to request edit access" }
  }
}

// Approve or deny edit request (Admin only)
export async function approveEditRequest(
  submissionId: string, 
  approved: boolean, 
  denyReason?: string
) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    return { error: "Unauthorized" }
  }

  try {
    const submission = await prisma.formSubmission.findUnique({
      where: { id: submissionId },
      include: {
        template: { select: { title: true } },
        submitter: { select: { id: true, name: true, email: true, role: true } }
      }
    })

    if (!submission) {
      return { error: "Submission not found" }
    }

    if (!submission.editRequested) {
      return { error: "No edit request found for this submission" }
    }

    // Update submission
    const updateData = {
      editRequested: false,
      editApproved: approved,
      editApprovedAt: approved ? new Date() : undefined,
      editApprovedBy: approved ? session.user.id : undefined,
      editDenyReason: approved ? null : denyReason || null
    } as Prisma.FormSubmissionUpdateInput

    await prisma.formSubmission.update({
      where: { id: submissionId },
      data: updateData
    })

    // Create notification for the submitter
    if (submission.submitter) {
      await prisma.notification.create({
        data: {
          userId: submission.submitter.id,
          type: approved ? 'FORM_EDIT_APPROVED' : 'FORM_EDIT_DENIED',
          title: approved ? 'Edit Request Approved' : 'Edit Request Denied',
          message: approved 
            ? `Your edit request for "${submission.template.title}" has been approved. You can now edit your submission.`
            : `Your edit request for "${submission.template.title}" has been denied. ${denyReason ? `Reason: ${denyReason}` : ''}`,
          link: submission.submitter.role === 'HOME_ADMIN' 
            ? `/dashboard/forms/${submission.templateId}` 
            : `/staff/forms/${submission.templateId}`
        }
      })
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: approved ? 'FORM_EDIT_REQUEST_APPROVED' : 'FORM_EDIT_REQUEST_DENIED',
        details: JSON.stringify({ 
          submissionId, 
          approved, 
          denyReason: denyReason || null 
        }),
        userId: session.user.id
      }
    })

    revalidatePath('/admin/form-submissions')
    revalidatePath('/staff/forms')
    revalidatePath('/dashboard/forms')

    return { success: true }
  } catch (error) {
    logger.serverAction("Failed to process edit request:", error)
    return { error: "Failed to process edit request" }
  }
}

// Update an existing form submission (after edit approval)
export async function updateFormSubmission(
  submissionId: string,
  formData: Record<string, unknown>,
  attachments?: string[]
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return { error: "Unauthorized" }
  }

  try {
    const submission = await prisma.formSubmission.findUnique({
      where: { id: submissionId }
    })

    if (!submission) {
      return { error: "Submission not found" }
    }

    // Update submission
    await prisma.formSubmission.update({
      where: { id: submissionId },
      data: {
        formData: JSON.stringify(formData),
        attachments: attachments ? JSON.stringify(attachments) : null,
        editApproved: false,
        editApprovedAt: null,
        editApprovedBy: null,
        editDenyReason: null,
      }
    })

    revalidatePath('/staff/forms')
    revalidatePath(`/staff/forms/${submission.templateId}`)
    revalidatePath('/dashboard/forms')
    revalidatePath(`/dashboard/forms/${submission.templateId}`)
    revalidatePath('/admin/form-submissions')
    revalidatePath('/admin/forms')

    return { success: true }
  } catch (error) {
    logger.serverAction("Failed to update submission:", error)
    return { error: "Failed to update submission" }
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
    const where: Prisma.FormSubmissionWhereInput = {
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
    logger.serverAction("Failed to fetch submissions:", error)
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
    const where: Prisma.FormSubmissionWhereInput = {}

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
    logger.serverAction("Failed to fetch submissions:", error)
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
    logger.serverAction("Failed to review submission:", error)
    return { error: "Failed to review submission" }
  }
}

// Update allowed roles for a form template
export async function updateFormTemplateRoles(templateId: string, allowedRoles: string[]) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    return { error: "Unauthorized" }
  }

  try {
    const allowedRolesStr = allowedRoles.length > 0 ? allowedRoles.join(',') : null

    const template = await prisma.formTemplate.update({
      where: { id: templateId },
      data: { allowedRoles: allowedRolesStr }
    })

    await prisma.auditLog.create({
      data: {
        action: 'FORM_TEMPLATE_ROLES_UPDATED',
        details: JSON.stringify({ templateId, allowedRoles: allowedRolesStr }),
        userId: session.user.id
      }
    })

    revalidatePath('/admin/forms')
    revalidatePath('/staff/forms')

    return { success: true, data: template }
  } catch (error) {
    logger.serverAction("Failed to update form template roles:", error)
    return { error: "Failed to update roles" }
  }
}

export async function getAdminFormTemplateSubmissions(templateId: string) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    return { error: 'Unauthorized' }
  }

  try {
    const submissions = await prisma.formSubmission.findMany({
      where: { templateId },
      include: {
        submitter: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    })

    return { success: true, data: submissions }
  } catch (error) {
    logger.serverAction('Failed to load template submissions:', error)
    return { error: 'Failed to load template submissions' }
  }
}
