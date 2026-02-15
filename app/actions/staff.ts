'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { z } from "zod"

// Schemas
const ProfileSchema = z.object({
  pronouns: z.string().optional(),
  preferredName: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  bio: z.string().optional(),
  birthDate: z.string().optional(), // Receive as YYYY-MM-DD
  region: z.string().optional(), // Location/Region
  emergencyContact: z.object({
    name: z.string().optional(),
    phone: z.string().optional(),
    relation: z.string().optional(),
  }).optional(),
  healthInfo: z.string().optional(),
  intakeAnswers: z.record(z.string(), z.string()).optional(), // Zod v4: key and value schemas required
})

export async function updateStaffProfile(formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }

  // Check for admin override (if editing another user, user ID might be passed in hidden field or context)
  // For now, assuming ProfileForm submits to this action, but for Admin editing another user, 
  // we need to know WHICH user to update. 
  // If `userId` is present in FormData and current user is ADMIN, use that ID.
  // Otherwise default to session.user.id.
  
  const targetUserId = formData.get("userId") as string || session.user.id
  
  // Verify permission if updating someone else
  if (targetUserId !== session.user.id) {
     const currentUser = await prisma.user.findUnique({ where: { id: session.user.id } })
     if (currentUser?.role !== 'ADMIN') return { error: "Unauthorized to edit other users" }
  }
  
  const isAdmin = (await prisma.user.findUnique({ where: { id: session.user.id } }))?.role === 'ADMIN'

  const ecName = formData.get("ec_name")
  const ecPhone = formData.get("ec_phone")
  const ecRelation = formData.get("ec_relation")

  // Only construct emergency contact if at least one field is present
  let emergencyContact = undefined
  if (ecName || ecPhone || ecRelation) {
      emergencyContact = {
          name: (ecName as string) || undefined,
          phone: (ecPhone as string) || undefined,
          relation: (ecRelation as string) || undefined,
      }
  }

  const rawData = {
    pronouns: formData.get("pronouns") || undefined,
    preferredName: formData.get("preferredName") || undefined,
    phone: formData.get("phone") || undefined,
    address: formData.get("address") || undefined,
    bio: formData.get("bio") || undefined,
    birthDate: formData.get("birthDate") || undefined,
    region: formData.get("region") || undefined,
    emergencyContact,
    healthInfo: formData.get("healthInfo") || undefined,
  }

  // Extract intake answers
  const intakeAnswers: Record<string, string> = {}
  for (const [key, value] of formData.entries()) {
    if (key.startsWith('intake_') && value) {
        intakeAnswers[key.replace('intake_', '')] = value as string
    }
  }
  
  // Merge intake into rawData for validation
  const dataToValidate = { ...rawData, intakeAnswers }

  const validated = ProfileSchema.safeParse(dataToValidate)
  if (!validated.success) return { error: "Invalid data" }

  try {
    const data = validated.data
    
    // Robust date handling: Ensure YYYY-MM-DD string is parsed as UTC midnight
    let birthDate: Date | undefined
    if (data.birthDate) {
        // Append time to force local/UTC consistency or split manually
        const [y, m, d] = data.birthDate.split('-').map(Number)
        // Create UTC date: new Date(Date.UTC(y, m-1, d))
        birthDate = new Date(Date.UTC(y, m - 1, d))
    }

    // Create update object
    const updateData: any = {
        pronouns: data.pronouns,
        preferredName: data.preferredName,
        phone: data.phone,
        address: data.address,
        bio: data.bio,
        birthDate: birthDate,
        region: data.region,
        emergencyContact: JSON.stringify(data.emergencyContact),
        healthInfo: data.healthInfo,
        intakeAnswers: JSON.stringify(data.intakeAnswers),
    }

    // Name field (disabled inputs aren't submitted, so only present when editable)
    const name = formData.get("name")
    if (name) updateData.name = name

    // Image field (from profile pages that include it)
    const image = formData.get("image")
    if (image !== null) updateData.image = image || null

    // Admin-only fields
    if (isAdmin) {
        const position = formData.get("position")
        const employmentType = formData.get("employmentType")
        const employmentStatus = formData.get("employmentStatus")
        const startDateRaw = formData.get("startDate")

        if (position) updateData.position = position
        if (employmentType) updateData.employmentType = employmentType
        if (employmentStatus) updateData.employmentStatus = employmentStatus

        if (startDateRaw) {
             const [y, m, d] = (startDateRaw as string).split('-').map(Number)
             updateData.startDate = new Date(Date.UTC(y, m - 1, d))
        }
    }

    await prisma.user.update({
        where: { id: targetUserId },
        data: updateData
    })

    // Revalidate all paths that display user profile data
    revalidatePath('/staff/directory')
    revalidatePath('/staff/profile')
    revalidatePath('/staff/settings')
    revalidatePath('/admin/profile')
    revalidatePath('/admin/settings')
    revalidatePath('/admin/users')
    revalidatePath(`/admin/users/${targetUserId}`)
    revalidatePath('/payroll/profile')
    revalidatePath('/payroll/settings')
    revalidatePath('/dashboard/profile')
    revalidatePath('/dashboard/settings')
    return { success: true }
  } catch (e) {
    console.error(e)
    return { error: "Failed to update profile" }
  }
}

export async function uploadDocument(formData: FormData) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }

    const file = formData.get('file') as File
    const type = formData.get('type') as string
    const name = formData.get('name') as string

    if (!file || !type) return { error: "Missing file or type" }

    try {
        // Mock upload - in prod use S3/Blob storage
        const mockUrl = `https://placehold.co/600x800?text=${encodeURIComponent(name || type)}`
        
        await prisma.document.create({
            data: {
                name: name || file.name,
                url: mockUrl,
                type,
                userId: session.user.id,
                verified: false 
            }
        })

        revalidatePath('/payroll/profile')
        return { success: true }
    } catch (e) {
        return { error: "Failed to upload document" }
    }
}

export async function deleteDocument(docId: string) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }

    try {
        const doc = await prisma.document.findUnique({ where: { id: docId } })
        if (doc?.userId !== session.user.id) return { error: "Unauthorized" }

        await prisma.document.delete({ where: { id: docId } })
        revalidatePath('/payroll/profile')
        return { success: true }
    } catch (e) {
        return { error: "Failed to delete document" }
    }
}
