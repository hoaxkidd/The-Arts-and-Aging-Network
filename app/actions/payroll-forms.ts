'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { join } from "path"
import { writeFile, mkdir, unlink } from "fs/promises"

const PayrollFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  formType: z.enum(["COMPLIANCE", "TAX", "POLICE_CHECK", "HR", "OTHER"]),
  isRequired: z.boolean().optional().default(false),
  roles: z.array(z.string()),
  expiresAt: z.string().optional(),
})

export async function getPayrollForms() {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Unauthorized" }
  }

  try {
    const forms = await prisma.payrollForm.findMany({
      where: { isActive: true },
      include: {
        uploader: {
          select: { name: true, email: true }
        },
        _count: {
          select: { submissions: true }
        }
      },
      orderBy: { createdAt: "desc" }
    })

    return { success: true, data: forms }
  } catch (error) {
    console.error("Failed to fetch payroll forms:", error)
    return { error: "Failed to fetch forms" }
  }
}

export async function getPayrollFormById(id: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Unauthorized" }
  }

  try {
    const form = await prisma.payrollForm.findUnique({
      where: { id },
      include: {
        uploader: {
          select: { name: true, email: true }
        }
      }
    })

    if (!form) {
      return { error: "Form not found" }
    }

    return { success: true, data: form }
  } catch (error) {
    console.error("Failed to fetch payroll form:", error)
    return { error: "Failed to fetch form" }
  }
}

export async function getMyPayrollFormSubmissions() {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Unauthorized" }
  }

  try {
    const userRole = session.user.role
    
    // Get all required forms for this role
    const requiredForms = await prisma.payrollForm.findMany({
      where: {
        isActive: true,
        roles: { has: userRole }
      },
      include: {
        submissions: {
          where: { userId: session.user.id }
        }
      },
      orderBy: { createdAt: "desc" }
    })

    // Transform to include submission status
    const formsWithStatus = requiredForms.map(form => ({
      ...form,
      mySubmission: form.submissions[0] || null,
      isCompleted: form.submissions.length > 0 && form.submissions[0].status === "COMPLETED"
    }))

    return { success: true, data: formsWithStatus }
  } catch (error) {
    console.error("Failed to fetch my form submissions:", error)
    return { error: "Failed to fetch your forms" }
  }
}

export async function createPayrollForm(formData: FormData) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") {
    return { error: "Unauthorized" }
  }

  const rawData = Object.fromEntries(formData)
  
  // Handle roles array
  const roles = rawData.roles 
    ? (typeof rawData.roles === "string" ? [rawData.roles] : Array.from(rawData.roles as unknown as string[]))
    : []

  const validated = PayrollFormSchema.safeParse({
    title: rawData.title,
    description: rawData.description,
    formType: rawData.formType,
    isRequired: rawData.isRequired === "on",
    roles,
    expiresAt: rawData.expiresAt
  })

  if (!validated.success) {
    return { error: "Invalid form data" }
  }

  try {
    // Helper to parse date string in YYYY-MM-DD or DD-MM-YYYY format
    const parseDateString = (dateStr: string | undefined): Date | null => {
      if (!dateStr) return null
      
      // Handle DD-MM-YYYY format
      if (dateStr.match(/^\d{2}-\d{2}-\d{4}$/)) {
        const [day, month, year] = dateStr.split('-')
        return new Date(`${year}-${month}-${day}T00:00:00`)
      }
      
      // Handle YYYY-MM-DD format
      if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return new Date(`${dateStr}T00:00:00`)
      }
      
      // Fallback
      const date = new Date(dateStr)
      return isNaN(date.getTime()) ? null : date
    }

    const expiresAtDate = parseDateString(validated.data.expiresAt)
    
    // Handle file upload to local storage
    const file = formData.get("file") as File
    if (!file || file.size === 0) {
      return { error: "File is required" }
    }

    // Sanitize filename and create unique name
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.]/g, '_')
    const fileName = `${Date.now()}-${sanitizedName}`
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'payroll-forms')
    const uploadPath = join(uploadDir, fileName)

    // Ensure upload directory exists
    await mkdir(uploadDir, { recursive: true })

    // Write file to disk
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    await writeFile(uploadPath, buffer)

    // Store relative URL for database
    const fileUrl = `/uploads/payroll-forms/${fileName}`

    const form = await prisma.payrollForm.create({
      data: {
        title: validated.data.title,
        description: validated.data.description || null,
        formType: validated.data.formType,
        isRequired: validated.data.isRequired,
        roles: validated.data.roles,
        expiresAt: expiresAtDate,
        fileUrl,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        uploadedBy: session.user.id
      }
    })

    await prisma.auditLog.create({
      data: {
        action: "PAYROLL_FORM_CREATED",
        details: JSON.stringify({ formId: form.id, title: form.title }),
        userId: session.user.id
      }
    })

    revalidatePath("/admin/payroll-forms")
    return { success: true, data: form }
  } catch (error) {
    console.error("Failed to create payroll form:", error)
    return { error: "Failed to create form" }
  }
}

export async function deletePayrollForm(id: string) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") {
    return { error: "Unauthorized" }
  }

  try {
    const form = await prisma.payrollForm.findUnique({ where: { id } })
    
    if (!form) {
      return { error: "Form not found" }
    }

    // Delete file from local storage
    try {
      const filePath = join(process.cwd(), 'public', form.fileUrl)
      await unlink(filePath)
    } catch (fileError) {
      console.warn("Failed to delete file:", fileError)
    }

    await prisma.payrollForm.delete({ where: { id } })

    await prisma.auditLog.create({
      data: {
        action: "PAYROLL_FORM_DELETED",
        details: JSON.stringify({ formId: id, title: form.title }),
        userId: session.user.id
      }
    })

    revalidatePath("/admin/payroll-forms")
    return { success: true }
  } catch (error) {
    console.error("Failed to delete payroll form:", error)
    return { error: "Failed to delete form" }
  }
}

export async function submitPayrollForm(formId: string, signature: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Unauthorized" }
  }

  try {
    const form = await prisma.payrollForm.findUnique({ where: { id: formId } })
    
    if (!form) {
      return { error: "Form not found" }
    }

    if (!form.isActive) {
      return { error: "This form is no longer available" }
    }

    // Check if expired
    if (form.expiresAt && new Date(form.expiresAt) < new Date()) {
      return { error: "This form has expired" }
    }

    // Check if already submitted
    const existing = await prisma.payrollFormSubmission.findUnique({
      where: {
        formId_userId: {
          formId,
          userId: session.user.id
        }
      }
    })

    if (existing && existing.status === "COMPLETED") {
      return { error: "You have already completed this form" }
    }

    // Create or update submission
    const submission = await prisma.payrollFormSubmission.upsert({
      where: {
        formId_userId: {
          formId,
          userId: session.user.id
        }
      },
      update: {
        signature,
        signedAt: new Date(),
        status: "COMPLETED"
      },
      create: {
        formId,
        userId: session.user.id,
        signature,
        signedAt: new Date(),
        status: "COMPLETED"
      }
    })

    revalidatePath("/payroll/forms")
    return { success: true, data: submission }
  } catch (error) {
    console.error("Failed to submit payroll form:", error)
    return { error: "Failed to submit form" }
  }
}

export async function getPayrollFormStats() {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") {
    return { error: "Unauthorized" }
  }

  try {
    const [totalForms, formsByType, recentSubmissions] = await Promise.all([
      prisma.payrollForm.count({ where: { isActive: true } }),
      prisma.payrollForm.groupBy({
        by: ["formType"],
        where: { isActive: true },
        _count: true
      }),
      prisma.payrollFormSubmission.findMany({
        take: 10,
        orderBy: { submittedAt: "desc" },
        include: {
          user: {
            select: { name: true, email: true, role: true }
          },
          form: {
            select: { title: true, formType: true }
          }
        }
      })
    ])

    return {
      success: true,
      data: {
        totalForms,
        formsByType,
        recentSubmissions
      }
    }
  } catch (error) {
    console.error("Failed to fetch payroll form stats:", error)
    return { error: "Failed to fetch stats" }
  }
}
