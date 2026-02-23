'use server'

import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'

const optionalString = z.string().optional().nullable()
const optionalDate = z.string().optional().nullable()
const optionalNumber = z.union([z.number(), z.string().transform(Number)]).optional().nullable()

const createPlaceholderSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1, 'Full legal name required'),
  role: z.enum(['ADMIN', 'PAYROLL', 'CONTRACTOR', 'FACILITATOR', 'PARTNER', 'VOLUNTEER', 'BOARD', 'HOME_ADMIN']),
  preferredName: optionalString,
  pronouns: optionalString,
  birthDate: optionalDate,
  phone: optionalString,
  address: optionalString,
  teamId: optionalString,
  teamCode: optionalString,
  teamType: optionalString,
  tShirtSize: optionalString,
  position: optionalString,
  employmentType: optionalString,
  employmentStatus: optionalString,
  startDate: optionalDate,
  supervisorId: optionalString,
  region: optionalString,
  ec_name: optionalString,
  ec_relation: optionalString,
  ec_phone: optionalString,
  ec_alt_phone: optionalString,
  health_allergies: optionalString,
  health_medical: optionalString,
  requiresAccommodation: z.boolean().optional(),
  accommodationDetails: optionalString,
  workplaceSafetyFormReceived: z.boolean().optional(),
  codeOfConductReceived: z.boolean().optional(),
  travelPolicyAcknowledged: z.boolean().optional(),
  policeCheckReceived: z.boolean().optional(),
  vulnerableSectorCheckRequired: z.boolean().optional(),
  dementiaTrainingCompleted: z.boolean().optional(),
  dementiaTrainingDate: optionalDate,
  dementiaTrainingTopupDate: optionalDate,
  strengthsSkills: optionalString,
  facilitatingSkillRating: optionalNumber,
  creativeArtsSkillRating: optionalNumber,
  organizingSkillRating: optionalNumber,
  communicatingSkillRating: optionalNumber,
  mentoringSkillRating: optionalNumber,
  supportNotes: optionalString,
  funFacts: optionalString,
  signatureOnFile: z.boolean().optional(),
  signatureDate: optionalDate,
  headshotReceived: z.boolean().optional(),
  bioReceived: z.boolean().optional(),
})

function parseFormBool(value: FormDataEntryValue | null): boolean {
  if (value === null || value === undefined) return false
  const s = String(value).toLowerCase()
  return s === 'true' || s === '1' || s === 'yes' || s === 'on' || s === 'y'
}

function parseFormDate(value: FormDataEntryValue | null | undefined): Date | undefined {
  if (!value || typeof value !== 'string' || !value.trim()) return undefined
  const d = new Date(value)
  return isNaN(d.getTime()) ? undefined : d
}

export async function createPlaceholderStaffUser(formData: FormData) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    return { error: 'Unauthorized' }
  }

  const raw = {
    email: (formData.get('email') as string)?.trim().toLowerCase(),
    name: (formData.get('name') as string)?.trim(),
    role: formData.get('role') as string,
    preferredName: formData.get('preferredName') as string | null,
    pronouns: formData.get('pronouns') as string | null,
    birthDate: formData.get('birthDate') as string | null,
    phone: formData.get('phone') as string | null,
    address: formData.get('address') as string | null,
    teamId: formData.get('teamId') as string | null,
    teamCode: formData.get('teamCode') as string | null,
    teamType: formData.get('teamType') as string | null,
    tShirtSize: formData.get('tShirtSize') as string | null,
    position: formData.get('position') as string | null,
    employmentType: formData.get('employmentType') as string | null,
    employmentStatus: formData.get('employmentStatus') as string | null,
    startDate: formData.get('startDate') as string | null,
    supervisorId: formData.get('supervisorId') as string | null,
    region: formData.get('region') as string | null,
    ec_name: formData.get('ec_name') as string | null,
    ec_relation: formData.get('ec_relation') as string | null,
    ec_phone: formData.get('ec_phone') as string | null,
    ec_alt_phone: formData.get('ec_alt_phone') as string | null,
    health_allergies: formData.get('health_allergies') as string | null,
    health_medical: formData.get('health_medical') as string | null,
    requiresAccommodation: parseFormBool(formData.get('requiresAccommodation')),
    accommodationDetails: formData.get('accommodationDetails') as string | null,
    workplaceSafetyFormReceived: parseFormBool(formData.get('workplaceSafetyFormReceived')),
    codeOfConductReceived: parseFormBool(formData.get('codeOfConductReceived')),
    travelPolicyAcknowledged: parseFormBool(formData.get('travelPolicyAcknowledged')),
    policeCheckReceived: parseFormBool(formData.get('policeCheckReceived')),
    vulnerableSectorCheckRequired: parseFormBool(formData.get('vulnerableSectorCheckRequired')),
    dementiaTrainingCompleted: parseFormBool(formData.get('dementiaTrainingCompleted')),
    dementiaTrainingDate: formData.get('dementiaTrainingDate') as string | null,
    dementiaTrainingTopupDate: formData.get('dementiaTrainingTopupDate') as string | null,
    strengthsSkills: formData.get('strengthsSkills') as string | null,
    facilitatingSkillRating: formData.get('facilitatingSkillRating') as string | null,
    creativeArtsSkillRating: formData.get('creativeArtsSkillRating') as string | null,
    organizingSkillRating: formData.get('organizingSkillRating') as string | null,
    communicatingSkillRating: formData.get('communicatingSkillRating') as string | null,
    mentoringSkillRating: formData.get('mentoringSkillRating') as string | null,
    supportNotes: formData.get('supportNotes') as string | null,
    funFacts: formData.get('funFacts') as string | null,
    signatureOnFile: parseFormBool(formData.get('signatureOnFile')),
    signatureDate: formData.get('signatureDate') as string | null,
    headshotReceived: parseFormBool(formData.get('headshotReceived')),
    bioReceived: parseFormBool(formData.get('bioReceived')),
  }

  const parsed = createPlaceholderSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: 'Invalid data', details: parsed.error.flatten() }
  }

  const data = parsed.data

  const existingUser = await prisma.user.findUnique({ where: { email: data.email } })
  if (existingUser) {
    if (existingUser.password || existingUser.status === 'ACTIVE') {
      return { error: 'A user with this email already has an account. Use Invite to add them instead.' }
    }
    return { error: 'A placeholder profile with this email already exists. Edit that user instead.' }
  }

  const emergencyContact =
    data.ec_name || data.ec_relation || data.ec_phone
      ? JSON.stringify({
          name: data.ec_name ?? undefined,
          relation: data.ec_relation ?? undefined,
          phone: data.ec_phone ?? undefined,
        })
      : null

  const healthInfo =
    data.health_allergies || data.health_medical
      ? JSON.stringify({
          allergies: data.health_allergies ?? undefined,
          medical: data.health_medical ?? undefined,
        })
      : null

  const rating = (v: string | number | null | undefined): number | undefined => {
    if (v === null || v === undefined || v === '') return undefined
    const n = typeof v === 'number' ? v : parseInt(String(v), 10)
    return isNaN(n) ? undefined : n
  }

  try {
    const user = await prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        password: null,
        status: 'PENDING',
        role: data.role,
        preferredName: data.preferredName ?? null,
        pronouns: data.pronouns ?? null,
        birthDate: parseFormDate(data.birthDate ?? null) ?? null,
        phone: data.phone ?? null,
        address: data.address ?? null,
        teamId: data.teamId ?? null,
        teamCode: data.teamCode ?? null,
        teamType: data.teamType ?? null,
        tShirtSize: data.tShirtSize ?? null,
        position: data.position ?? null,
        employmentType: data.employmentType ?? null,
        employmentStatus: data.employmentStatus ?? null,
        startDate: parseFormDate(data.startDate) ?? null,
        supervisorId: data.supervisorId ?? null,
        region: data.region ?? null,
        emergencyContact,
        emergencyAltPhone: data.ec_alt_phone ?? null,
        healthInfo,
        requiresAccommodation: data.requiresAccommodation ?? false,
        accommodationDetails: data.accommodationDetails ?? null,
        workplaceSafetyFormReceived: data.workplaceSafetyFormReceived ?? false,
        codeOfConductReceived: data.codeOfConductReceived ?? false,
        travelPolicyAcknowledged: data.travelPolicyAcknowledged ?? false,
        policeCheckReceived: data.policeCheckReceived ?? false,
        vulnerableSectorCheckRequired: data.vulnerableSectorCheckRequired ?? false,
        dementiaTrainingCompleted: data.dementiaTrainingCompleted ?? false,
        dementiaTrainingDate: parseFormDate(data.dementiaTrainingDate) ?? null,
        dementiaTrainingTopupDate: parseFormDate(data.dementiaTrainingTopupDate) ?? null,
        strengthsSkills: data.strengthsSkills ?? null,
        facilitatingSkillRating: rating(data.facilitatingSkillRating) ?? null,
        creativeArtsSkillRating: rating(data.creativeArtsSkillRating) ?? null,
        organizingSkillRating: rating(data.organizingSkillRating) ?? null,
        communicatingSkillRating: rating(data.communicatingSkillRating) ?? null,
        mentoringSkillRating: rating(data.mentoringSkillRating) ?? null,
        supportNotes: data.supportNotes ?? null,
        funFacts: data.funFacts ?? null,
        signatureOnFile: data.signatureOnFile ?? false,
        signatureDate: parseFormDate(data.signatureDate) ?? null,
        headshotReceived: data.headshotReceived ?? false,
        bioReceived: data.bioReceived ?? false,
      },
    })

    await prisma.auditLog.create({
      data: {
        action: 'PLACEHOLDER_STAFF_CREATED',
        details: JSON.stringify({ email: user.email, role: user.role, userId: user.id }),
        userId: session.user.id,
      },
    })

    revalidatePath('/admin/users')
    return { success: true, userId: user.id }
  } catch (e) {
    console.error('createPlaceholderStaffUser error:', e)
    return { error: 'Failed to create staff profile' }
  }
}

export async function completeOnboarding() {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized' }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { onboardingCompletedAt: new Date() },
    })
    revalidatePath('/staff/onboarding')
    revalidatePath('/dashboard/onboarding')
    revalidatePath('/staff')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (e) {
    console.error('completeOnboarding error:', e)
    return { error: 'Failed to save' }
  }
}

export async function skipOnboarding() {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized' }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { onboardingSkipCount: { increment: 1 } },
    })
    revalidatePath('/staff/onboarding')
    revalidatePath('/dashboard/onboarding')
    return { success: true }
  } catch (e) {
    console.error('skipOnboarding error:', e)
    return { error: 'Failed to save' }
  }
}
