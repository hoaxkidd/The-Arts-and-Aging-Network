'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { logger } from "@/lib/logger"
import { normalizePhone } from "@/lib/phone"
import { normalizeMultilineText, normalizeText } from "@/lib/input-normalize"
import { reassignUserCodeForName, shouldReassignUserCode } from "@/lib/user-code"

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

// Helper to convert YYYY-MM-DD string to valid Date for Prisma
function toValidDate(value: string | undefined): Date | undefined {
  if (!value || value === '') return undefined
  // Handle YYYY-MM-DD format from date inputs
  if (value.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const date = new Date(value + 'T00:00:00')
    if (!isNaN(date.getTime())) return date
  }
  // Handle DD-MM-YYYY format from custom DateInput
  if (value.match(/^\d{2}-\d{2}-\d{4}$/)) {
    const [day, month, year] = value.split('-')
    const date = new Date(`${year}-${month}-${day}T00:00:00`)
    if (!isNaN(date.getTime())) return date
  }
  return undefined
}

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
  const pronounsOther = normalizeText(formData.get("pronouns_other"))
  const pronouns = pronounsSelect === 'Other' && pronounsOther ? pronounsOther : (normalizeText(pronounsSelect) || undefined)

  const rawData = {
    pronouns,
    preferredName: normalizeText(formData.get("preferredName")),
    phone: normalizePhone(formData.get("phone")),
    address: normalizeText(formData.get("address")),
    bio: normalizeMultilineText(formData.get("bio")),
    birthDate: formData.get("birthDate") || undefined,
    region: normalizeText(formData.get("region")),
    emergencyContact,
    healthInfo: formData.get("healthInfo") || undefined,
    alternateEmail: formData.get("alternateEmail") || undefined,
  }

  // Validate alternateEmail is not already in use by another user
  if (rawData.alternateEmail) {
    const alternateEmailStr = String(rawData.alternateEmail).toLowerCase().trim()
    const existingWithEmail = await prisma.user.findFirst({
      where: {
        email: { equals: alternateEmailStr },
        NOT: { id: targetUserId }
      }
    })
    if (existingWithEmail) {
      return { error: "This alternate email is already in use by another user" }
    }
  }

  // Load existing intake answers to merge with new values
  const existingUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { intakeAnswers: true, name: true }
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
  logger.log('[updateStaffProfile] Existing intake:', existingIntake)
  logger.log('[updateStaffProfile] New intake from form:', newIntakeAnswers)
  logger.log('[updateStaffProfile] Merged intake:', intakeAnswers)
  
  // Merge intake into rawData for validation
  const dataToValidate = { ...rawData, intakeAnswers }

  const validated = ProfileSchema.safeParse(dataToValidate)
  if (!validated.success) return { error: "Invalid data" }

  try {
    const data = validated.data
    
    // Robust date handling: Accept both YYYY-MM-DD and DD-MM-YYYY formats
    const isValidDateFormat = (dateStr: string) => 
      dateStr.match(/^\d{4}-\d{2}-\d{2}$/) || dateStr.match(/^\d{2}-\d{2}-\d{4}$/)
    
    let birthDate: Date | undefined
    if (data.birthDate && isValidDateFormat(data.birthDate)) {
        birthDate = toValidDate(data.birthDate)
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
    if (name && !isAdmin) {
      return { error: 'Only admins can change a user name' }
    }
    if (name && isAdmin) updateData.name = name

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

        if (startDateRaw && typeof startDateRaw === 'string' && isValidDateFormat(startDateRaw)) {
             updateData.startDate = toValidDate(startDateRaw)
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
        if (dementiaTrainingDate && typeof dementiaTrainingDate === 'string' && isValidDateFormat(dementiaTrainingDate)) {
            updateData.dementiaTrainingDate = toValidDate(dementiaTrainingDate)
        }
        if (dementiaTrainingTopupDate && typeof dementiaTrainingTopupDate === 'string' && isValidDateFormat(dementiaTrainingTopupDate)) {
            updateData.dementiaTrainingTopupDate = toValidDate(dementiaTrainingTopupDate)
        }

        // Documents & Signatures
        const signatureOnFile = formData.get("signatureOnFile")
        const headshotReceived = formData.get("headshotReceived")
        const bioReceived = formData.get("bioReceived")
        const signatureDate = formData.get("signatureDate")
        if (signatureOnFile !== null) updateData.signatureOnFile = parseFormBool(signatureOnFile)
        if (headshotReceived !== null) updateData.headshotReceived = parseFormBool(headshotReceived)
        if (bioReceived !== null) updateData.bioReceived = parseFormBool(bioReceived)
        if (signatureDate && typeof signatureDate === 'string' && isValidDateFormat(signatureDate)) {
            updateData.signatureDate = toValidDate(signatureDate)
        }
    }

    if (session.user.role === 'HOME_ADMIN' && targetUserId === session.user.id) {
      const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } })

      await prisma.auditLog.create({
        data: {
          action: 'PROGRAM_COORDINATOR_PROFILE_CHANGE_REQUESTED',
          details: JSON.stringify({
            userId: targetUserId,
            requestedUpdates: updateData,
          }),
          userId: session.user.id,
        },
      })

      if (admins.length > 0) {
        await prisma.notification.createMany({
          data: admins.map((admin) => ({
            userId: admin.id,
            type: 'PROFILE_UPDATE',
            title: 'Program Coordinator Profile Change Request',
            message: 'A Program Coordinator submitted profile updates that require admin approval.',
            link: `/admin/users/${targetUserId}`,
          })),
        })
      }

      revalidatePath('/admin/users')
      revalidatePath(`/admin/users/${targetUserId}`)
      revalidatePath('/dashboard/profile')
      return {
        success: true,
        pendingApproval: true,
        message: 'Profile changes submitted for admin approval.',
      }
    }

    const nextName = typeof updateData.name === 'string' ? updateData.name : existingUser?.name

    const updatedUser = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: targetUserId },
        data: updateData,
      })

      if (shouldReassignUserCode(existingUser?.name, nextName)) {
        await reassignUserCodeForName(tx, targetUserId, nextName)
      }

      return tx.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, userCode: true },
      })
    })

    if (!updatedUser) return { error: 'User not found after update' }

    // Revalidate all paths that display user profile data
    revalidatePath('/staff/directory')
    revalidatePath('/staff/profile')
    revalidatePath('/staff/settings')
    revalidatePath('/admin/profile')
    revalidatePath('/admin/settings')
    revalidatePath('/admin/users')
    revalidatePath(`/admin/users/${targetUserId}`)
    revalidatePath(`/admin/users/${updatedUser.userCode || targetUserId}`)
    revalidatePath('/payroll/profile')
    revalidatePath('/payroll/settings')
    revalidatePath('/dashboard/profile')
    revalidatePath('/dashboard/settings')
    return { success: true, userId: updatedUser.id, userIdentifier: updatedUser.userCode || updatedUser.id }
  } catch (e) {
    logger.serverAction('Failed to update profile', e)
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
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        
        const { uploadToR2, getFileExtension } = await import('@/lib/r2')
        const extension = getFileExtension(file.name)
        const uniqueName = `${session.user.id}/${type}/${Date.now()}.${extension}`
        
        const uploaded = await uploadToR2(buffer, uniqueName, file.type, 'documents')
        
        await prisma.document.create({
            data: {
                name: name || file.name,
                url: uploaded.url,
                type,
                userId: session.user.id,
                verified: false 
            }
        })

        revalidatePath('/payroll/profile')
        return { success: true, url: uploaded.url }
    } catch (error) {
        logger.upload('Document upload error', error)
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
