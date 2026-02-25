'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { z } from "zod"

function parseFormBool(value: FormDataEntryValue | null): boolean {
  if (value === null || value === undefined) return false
  const s = String(value).toLowerCase()
  return s === 'true' || s === '1' || s === 'yes' || s === 'on' || s === 'y'
}

// Schemas
const ProfileSchema = z.object({
  pronouns: z.string().optional(),
  preferredName: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  bio: z.string().optional(),
  birthDate: z.string().optional(), // Receive as YYYY-MM-DD
  region: z.string().optional(), // Location/Region
  alternateEmail: z.string().optional(),
  emergencyContact: z.object({
    name: z.string().optional(),
    phone: z.string().optional(),
    relation: z.string().optional(),
  }).optional(),
  healthInfo: z.string().optional(),
  // Allow richer intake data (arrays/objects) like skills, tasks, etc.
  intakeAnswers: z.record(z.string(), z.unknown()).optional(),
  // Team fields
  teamId: z.string().optional(),
  teamCode: z.string().optional(),
  teamType: z.string().optional(),
  tShirtSize: z.string().optional(),
  supervisorId: z.string().optional(),
  // Skills & Notes
  strengthsSkills: z.string().optional(),
  supportNotes: z.string().optional(),
  funFacts: z.string().optional(),
  // Skill ratings
  facilitatingSkillRating: z.union([z.number(), z.string()]).optional(),
  creativeArtsSkillRating: z.union([z.number(), z.string()]).optional(),
  organizingSkillRating: z.union([z.number(), z.string()]).optional(),
  communicatingSkillRating: z.union([z.number(), z.string()]).optional(),
  mentoringSkillRating: z.union([z.number(), z.string()]).optional(),
  // Accommodations
  requiresAccommodation: z.boolean().optional(),
  accommodationDetails: z.string().optional(),
  // Compliance
  workplaceSafetyFormReceived: z.boolean().optional(),
  codeOfConductReceived: z.boolean().optional(),
  travelPolicyAcknowledged: z.boolean().optional(),
  policeCheckReceived: z.boolean().optional(),
  vulnerableSectorCheckRequired: z.boolean().optional(),
  dementiaTrainingCompleted: z.boolean().optional(),
  dementiaTrainingDate: z.string().optional(),
  dementiaTrainingTopupDate: z.string().optional(),
  // Documents & Signatures
  signatureOnFile: z.boolean().optional(),
  signatureDate: z.string().optional(),
  headshotReceived: z.boolean().optional(),
  bioReceived: z.boolean().optional(),
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

  // Handle pronouns: if "Other" is selected, use the custom value
  const pronounsSelect = formData.get("pronouns") as string | null
  const pronounsOther = formData.get("pronouns_other") as string | null
  const pronouns = pronounsSelect === 'Other' && pronounsOther ? pronounsOther : (pronounsSelect || undefined)

  const rawData = {
    pronouns,
    preferredName: formData.get("preferredName") || undefined,
    phone: formData.get("phone") || undefined,
    address: formData.get("address") || undefined,
    bio: formData.get("bio") || undefined,
    birthDate: formData.get("birthDate") || undefined,
    region: formData.get("region") || undefined,
    emergencyContact,
    healthInfo: formData.get("healthInfo") || undefined,
    alternateEmail: formData.get("alternateEmail") || undefined,
  }

  // Load existing intake answers to merge with new values
  const existingUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { intakeAnswers: true }
  })
  
  const existingIntake: Record<string, unknown> = existingUser?.intakeAnswers 
    ? (() => {
        try {
          return JSON.parse(existingUser.intakeAnswers)
        } catch {
          return {}
        }
      })()
    : {}

  // Extract intake answers from form
  const newIntakeAnswers: Record<string, unknown> = {}
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith('intake_')) continue
    
    // Allow empty strings/arrays to be saved (don't skip if value is empty)
    const intakeKey = key.replace('intake_', '')
    const raw = value as string

    // Fields we explicitly JSON-encode on the client (arrays/objects)
    if (intakeKey === 'skills' || intakeKey === 'tasks') {
      try {
        const parsed = JSON.parse(raw)
        // Always save, even if empty array
        newIntakeAnswers[intakeKey] = parsed
      } catch {
        // Fallback to raw string if parsing fails
        newIntakeAnswers[intakeKey] = raw
      }
    } else if (value) {
      // Only save non-empty strings for other fields
      newIntakeAnswers[intakeKey] = raw
    }
  }
  
  // Merge existing intake with new values (new values override existing)
  const intakeAnswers = { ...existingIntake, ...newIntakeAnswers }
  
  // Debug logging (remove in production)
  console.log('[updateStaffProfile] Existing intake:', existingIntake)
  console.log('[updateStaffProfile] New intake from form:', newIntakeAnswers)
  console.log('[updateStaffProfile] Merged intake:', intakeAnswers)
  
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
    const updateData: Record<string, unknown> = {
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

        // Team fields
        const teamId = formData.get("teamId")
        const teamCode = formData.get("teamCode")
        const teamType = formData.get("teamType")
        const tShirtSize = formData.get("tShirtSize")
        const supervisorId = formData.get("supervisorId")
        if (teamId) updateData.teamId = teamId
        if (teamCode) updateData.teamCode = teamCode
        if (teamType) updateData.teamType = teamType
        if (tShirtSize) updateData.tShirtSize = tShirtSize
        if (supervisorId) updateData.supervisorId = supervisorId

        // Skills & Notes
        const strengthsSkills = formData.get("strengthsSkills")
        const supportNotes = formData.get("supportNotes")
        const funFacts = formData.get("funFacts")
        if (strengthsSkills) updateData.strengthsSkills = strengthsSkills
        if (supportNotes) updateData.supportNotes = supportNotes
        if (funFacts) updateData.funFacts = funFacts

        // Skill ratings (convert to number)
        const rating = (v: FormDataEntryValue | null): number | undefined => {
            if (v === null || v === undefined || v === '') return undefined
            const n = typeof v === 'number' ? v : parseInt(String(v), 10)
            return isNaN(n) ? undefined : n
        }
        const facilitatingSkillRating = formData.get("facilitatingSkillRating")
        const creativeArtsSkillRating = formData.get("creativeArtsSkillRating")
        const organizingSkillRating = formData.get("organizingSkillRating")
        const communicatingSkillRating = formData.get("communicatingSkillRating")
        const mentoringSkillRating = formData.get("mentoringSkillRating")
        if (rating(facilitatingSkillRating) !== undefined) updateData.facilitatingSkillRating = rating(facilitatingSkillRating)
        if (rating(creativeArtsSkillRating) !== undefined) updateData.creativeArtsSkillRating = rating(creativeArtsSkillRating)
        if (rating(organizingSkillRating) !== undefined) updateData.organizingSkillRating = rating(organizingSkillRating)
        if (rating(communicatingSkillRating) !== undefined) updateData.communicatingSkillRating = rating(communicatingSkillRating)
        if (rating(mentoringSkillRating) !== undefined) updateData.mentoringSkillRating = rating(mentoringSkillRating)

        // Accommodations
        const requiresAccommodation = formData.get("requiresAccommodation")
        const accommodationDetails = formData.get("accommodationDetails")
        if (requiresAccommodation !== null) updateData.requiresAccommodation = parseFormBool(requiresAccommodation)
        if (accommodationDetails) updateData.accommodationDetails = accommodationDetails

        // Compliance checkboxes
        const workplaceSafetyFormReceived = formData.get("workplaceSafetyFormReceived")
        const codeOfConductReceived = formData.get("codeOfConductReceived")
        const travelPolicyAcknowledged = formData.get("travelPolicyAcknowledged")
        const policeCheckReceived = formData.get("policeCheckReceived")
        const vulnerableSectorCheckRequired = formData.get("vulnerableSectorCheckRequired")
        const dementiaTrainingCompleted = formData.get("dementiaTrainingCompleted")
        if (workplaceSafetyFormReceived !== null) updateData.workplaceSafetyFormReceived = parseFormBool(workplaceSafetyFormReceived)
        if (codeOfConductReceived !== null) updateData.codeOfConductReceived = parseFormBool(codeOfConductReceived)
        if (travelPolicyAcknowledged !== null) updateData.travelPolicyAcknowledged = parseFormBool(travelPolicyAcknowledged)
        if (policeCheckReceived !== null) updateData.policeCheckReceived = parseFormBool(policeCheckReceived)
        if (vulnerableSectorCheckRequired !== null) updateData.vulnerableSectorCheckRequired = parseFormBool(vulnerableSectorCheckRequired)
        if (dementiaTrainingCompleted !== null) updateData.dementiaTrainingCompleted = parseFormBool(dementiaTrainingCompleted)

        // Compliance dates
        const dementiaTrainingDate = formData.get("dementiaTrainingDate")
        const dementiaTrainingTopupDate = formData.get("dementiaTrainingTopupDate")
        if (dementiaTrainingDate) {
            const [y, m, d] = (dementiaTrainingDate as string).split('-').map(Number)
            updateData.dementiaTrainingDate = new Date(Date.UTC(y, m - 1, d))
        }
        if (dementiaTrainingTopupDate) {
            const [y, m, d] = (dementiaTrainingTopupDate as string).split('-').map(Number)
            updateData.dementiaTrainingTopupDate = new Date(Date.UTC(y, m - 1, d))
        }

        // Documents & Signatures
        const signatureOnFile = formData.get("signatureOnFile")
        const headshotReceived = formData.get("headshotReceived")
        const bioReceived = formData.get("bioReceived")
        const signatureDate = formData.get("signatureDate")
        if (signatureOnFile !== null) updateData.signatureOnFile = parseFormBool(signatureOnFile)
        if (headshotReceived !== null) updateData.headshotReceived = parseFormBool(headshotReceived)
        if (bioReceived !== null) updateData.bioReceived = parseFormBool(bioReceived)
        if (signatureDate) {
            const [y, m, d] = (signatureDate as string).split('-').map(Number)
            updateData.signatureDate = new Date(Date.UTC(y, m - 1, d))
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
    } catch {
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
    } catch {
        return { error: "Failed to delete document" }
    }
}
