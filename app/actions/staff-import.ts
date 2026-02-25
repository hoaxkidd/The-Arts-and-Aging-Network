'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const optionalString = z.string().optional().nullable()
const optionalBool = z.boolean().optional().nullable()
const optionalNumber = z.union([z.number(), z.string().transform(Number)]).optional().nullable()

const importRowSchema = z.object({
  name: optionalString,
  email: optionalString,
  role: z.string().optional(),
  preferredName: optionalString,
  pronouns: optionalString,
  birthDate: optionalString,
  phone: optionalString,
  address: optionalString,
  teamId: optionalString,
  teamCode: optionalString,
  teamType: optionalString,
  tShirtSize: optionalString,
  position: optionalString,
  employmentType: optionalString,
  employmentStatus: optionalString,
  startDate: optionalString,
  region: optionalString,
  ec_name: optionalString,
  ec_relation: optionalString,
  ec_phone: optionalString,
  ec_alt_phone: optionalString,
  health_allergies: optionalString,
  health_medical: optionalString,
  requiresAccommodation: optionalBool,
  accommodationDetails: optionalString,
  workplaceSafetyFormReceived: optionalBool,
  codeOfConductReceived: optionalBool,
  travelPolicyAcknowledged: optionalBool,
  policeCheckReceived: optionalBool,
  vulnerableSectorCheckRequired: optionalBool,
  dementiaTrainingCompleted: optionalBool,
  dementiaTrainingDate: optionalString,
  dementiaTrainingTopupDate: optionalString,
  strengthsSkills: optionalString,
  facilitatingSkillRating: optionalNumber,
  creativeArtsSkillRating: optionalNumber,
  organizingSkillRating: optionalNumber,
  communicatingSkillRating: optionalNumber,
  mentoringSkillRating: optionalNumber,
  supportNotes: optionalString,
  funFacts: optionalString,
  signatureOnFile: optionalBool,
  signatureDate: optionalString,
  headshotReceived: optionalBool,
  bioReceived: optionalBool,
})

function capitalizeName(name: string | null | undefined): string | null {
  if (!name) return null
  return name
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    .trim()
}

function normalizePronouns(pronouns: string | null | undefined): string | null {
  if (!pronouns) return null
  return pronouns
    .toLowerCase()
    .split('/')
    .map(p => p.trim().charAt(0).toUpperCase() + p.trim().slice(1))
    .join('/')
}

function normalizeYesNo(value: string | null | undefined): boolean | null {
  if (!value) return null
  const v = value.toLowerCase().trim()
  if (v === 'y' || v === 'yes') return true
  if (v === 'n' || v === 'no') return false
  return null
}

function isUncertain(value: string | null | undefined): boolean {
  if (!value) return false
  const v = value.toLowerCase().trim()
  return v === '?' || v === 'y?' || v === 'n?' || v === '?'
}

function formatPhone(phone: string | null | undefined): string | null {
  if (!phone) return null
  const firstPhone = phone.split(/[;,]/)[0].trim()
  const digits = firstPhone.replace(/\D/g, '')
  if (digits.length === 10) {
    return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`
  }
  if (digits.length === 11 && digits[0] === '1') {
    return `+1 (${digits.slice(1,4)}) ${digits.slice(4,7)}-${digits.slice(7)}`
  }
  return firstPhone
}

function parseDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null
  const cleaned = dateStr.trim()
  
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    return new Date(cleaned)
  }
  
  if (/^\d{4}-\d{2}$/.test(cleaned)) {
    return new Date(cleaned + '-01')
  }
  
  const parsed = new Date(cleaned)
  if (!isNaN(parsed.getTime())) {
    return parsed
  }
  
  const monthMatch = cleaned.match(/(\d{1,2})-([A-Za-z]+)-(\d{2,4})/)
  if (monthMatch) {
    const [, day, month, year] = monthMatch
    const fullYear = year.length === 2 ? (parseInt(year) > 50 ? '19' : '20') + year : year
    const monthNum = new Date(`${month} 1 2000`).getMonth() + 1
    return new Date(`${fullYear}-${String(monthNum).padStart(2, '0')}-${day.padStart(2, '0')}`)
  }
  
  return null
}

function formatAddress(
  street: string | null | undefined,
  city: string | null | undefined,
  province: string | null | undefined,
  postal: string | null | undefined
): string | null {
  const parts = [street, city, province, postal].filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : null
}

function parseRating(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') return value >= 1 && value <= 5 ? value : null
  const num = parseInt(String(value), 10)
  return !isNaN(num) && num >= 1 && num <= 5 ? num : null
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

interface ImportResult {
  success: boolean
  created: number
  updated: number
  skipped: number
  errors: string[]
  uncertainFields: { email: string; field: string }[]
}

export async function importStaffFromCSV(
  csvContent: string,
  defaultRole: string = 'FACILITATOR'
): Promise<ImportResult> {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    return { success: false, created: 0, updated: 0, skipped: 0, errors: ['Unauthorized'], uncertainFields: [] }
  }

  let lines = csvContent.split('\n').filter(line => line.trim())
  
  // Skip first line if it's a table name (e.g., "Team Master Sheet: Table 1")
  if (lines.length > 0 && lines[0].toLowerCase().includes('table')) {
    lines = lines.slice(1)
  }
  
  if (lines.length < 2) {
    return { success: false, created: 0, updated: 0, skipped: 0, errors: ['CSV file is empty or has no data rows'], uncertainFields: [] }
  }

  const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase())
  
  const headerMap: Record<string, number> = {}
  headers.forEach((h, i) => {
    headerMap[h] = i
  })

  const columnIndex = (name: string): number => {
    const possibleNames = [
      name,
      name.replace(/[_-]/g, ' '),
      name.replace(/[_-]/g, ''),
    ]
    for (const n of possibleNames) {
      for (const [h, idx] of Object.entries(headerMap)) {
        if (h.includes(n) || n.includes(h)) {
          return idx
        }
      }
    }
    return -1
  }

  const idx = {
    fullLegalName: columnIndex('full legal name'),
    email: columnIndex('email address'),
    teamId: columnIndex('team id'),
    teamCode: columnIndex('team code'),
    teamType: columnIndex('team type'),
    active: columnIndex('active'),
    preferredName: columnIndex('preferred name'),
    pronouns: columnIndex('pronouns'),
    dob: columnIndex('date of birth'),
    phone: columnIndex('phone number'),
    street: columnIndex('street address'),
    city: columnIndex('city'),
    province: columnIndex('province'),
    postal: columnIndex('postal code'),
    tshirt: columnIndex('t-shirt size'),
    ecName: columnIndex('emergency contact name'),
    ecRelation: columnIndex('emergency contact relationship'),
    ecPhone: columnIndex('emergency contact phone'),
    ecAltPhone: columnIndex('emergency contact alt phone'),
    allergies: columnIndex('allergies'),
    medical: columnIndex('medical conditions'),
    requiresAccom: columnIndex('requires accommodations'),
    accomDetails: columnIndex('accommodation details'),
    position: columnIndex('position'),
    startDate: columnIndex('start date'),
    supervisor: columnIndex('supervisor'),
    workplaceSafety: columnIndex('workplace safety form received'),
    codeOfConduct: columnIndex('code of conduct received'),
    travelPolicy: columnIndex('internal controls'),
    policeCheck: columnIndex('police check received'),
    vulnerableSector: columnIndex('vulnerable sector check required'),
    dementiaTraining: columnIndex('dementia engagement training completed'),
    trainingDate: columnIndex('training complettion date'),
    trainingTopup: columnIndex('training topup renewal'),
    strengths: columnIndex('strengths'),
    facilitating: columnIndex('facilitating groups'),
    creative: columnIndex('creative arts'),
    organizing: columnIndex('organizing'),
    communicating: columnIndex('communicating'),
    mentoring: columnIndex('mentoring'),
    supportNotes: columnIndex('support needs'),
    hobbies: columnIndex('hobbies'),
    signature: columnIndex('signature on file'),
    signatureDate: columnIndex('signature date'),
    headshot: columnIndex('headshot received'),
    bio: columnIndex('bio received'),
  }

  let created = 0
  let updated = 0
  let skipped = 0
  const errors: string[] = []
  const uncertainFields: { email: string; field: string }[] = []

  for (let i = 1; i < lines.length; i++) {
    try {
      const values = parseCSVLine(lines[i])
      
      const name = idx.fullLegalName >= 0 ? values[idx.fullLegalName] : ''
      const emailRaw = idx.email >= 0 ? values[idx.email] : ''
      const teamIdRaw = idx.teamId >= 0 ? values[idx.teamId] : ''
      const teamId = teamIdRaw ? teamIdRaw.toUpperCase().trim() : ''
      
      // Skip empty rows or rows that don't look like person data
      if (!name || name.length < 2) {
        skipped++
        continue
      }
      
      // Use email from CSV if available, otherwise use null (since email is now nullable)
      let email: string | null = null
      if (emailRaw && emailRaw.includes('@')) {
        email = emailRaw.split(/[;,]/)[0].trim().toLowerCase()
      }

      // Only search for existing user if email is provided
      let existingUser = null
      if (email) {
        existingUser = await prisma.user.findUnique({
          where: { email }
        })
      }

      const getValue = (idx: number): string => (idx >= 0 && idx < values.length ? values[idx] : '')
      const getRawValue = (idx: number): string | null => {
        if (idx < 0 || idx >= values.length) return null
        const v = values[idx].trim()
        return v || null
      }

      const userData: Record<string, unknown> = {}
      
      userData.name = capitalizeName(name)
      userData.preferredName = capitalizeName(getValue(idx.preferredName)) || null
      userData.pronouns = normalizePronouns(getRawValue(idx.pronouns))
      userData.phone = formatPhone(getRawValue(idx.phone))
      userData.birthDate = parseDate(getRawValue(idx.dob))
      userData.address = formatAddress(
        getRawValue(idx.street),
        getRawValue(idx.city),
        getRawValue(idx.province),
        getRawValue(idx.postal)
      )
      userData.teamId = teamId || null
      userData.teamCode = getRawValue(idx.teamCode)?.toUpperCase().trim() || null
      userData.teamType = getRawValue(idx.teamType) === 'Contractor' ? 'Contractor' : 'Employee'
      
      // Set role based on Team Type, fallback to default
      const teamType = getRawValue(idx.teamType)
      userData.role = teamType === 'Contractor' ? 'CONTRACTOR' : defaultRole
      
      userData.status = 'PENDING'
      
      userData.tShirtSize = getRawValue(idx.tshirt)
      userData.position = getRawValue(idx.position)
      userData.startDate = parseDate(getRawValue(idx.startDate))
      userData.supervisorId = getRawValue(idx.supervisor)
      
      userData.emergencyContact = JSON.stringify({
        name: capitalizeName(getRawValue(idx.ecName)),
        relation: getRawValue(idx.ecRelation),
        phone: formatPhone(getRawValue(idx.ecPhone)),
      })
      userData.emergencyAltPhone = formatPhone(getRawValue(idx.ecAltPhone))
      
      userData.healthInfo = JSON.stringify({
        allergies: getRawValue(idx.allergies) || null,
        medical: getRawValue(idx.medical) || null,
      })
      
      const requiresAccom = getRawValue(idx.requiresAccom)
      userData.requiresAccommodation = requiresAccom ? normalizeYesNo(requiresAccom) : null
      userData.accommodationDetails = getRawValue(idx.accomDetails)

      const checkUncertain = (field: string, rawValue: string | null): boolean => {
        const uncertain = isUncertain(rawValue)
        if (uncertain && email) {
          uncertainFields.push({ email, field })
        }
        return uncertain
      }

      // Return null for empty, false for no, true for yes - leave null so can be edited later
      const toBool = (rawValue: string | null): boolean | null => {
        if (!rawValue || rawValue.trim() === '') return null
        if (isUncertain(rawValue)) return null
        return normalizeYesNo(rawValue)
      }

      userData.requiresAccommodation = toBool(getRawValue(idx.requiresAccom)) ?? false
      userData.workplaceSafetyFormReceived = toBool(getRawValue(idx.workplaceSafety)) ?? false
      userData.codeOfConductReceived = toBool(getRawValue(idx.codeOfConduct)) ?? false
      userData.travelPolicyAcknowledged = toBool(getRawValue(idx.travelPolicy)) ?? false
      userData.policeCheckReceived = toBool(getRawValue(idx.policeCheck)) ?? false
      userData.vulnerableSectorCheckRequired = toBool(getRawValue(idx.vulnerableSector)) ?? false
      userData.dementiaTrainingCompleted = toBool(getRawValue(idx.dementiaTraining)) ?? false
      
      userData.dementiaTrainingDate = parseDate(getRawValue(idx.trainingDate))
      userData.dementiaTrainingTopupDate = parseDate(getRawValue(idx.trainingTopup))
      
      userData.strengthsSkills = getRawValue(idx.strengths)
      userData.facilitatingSkillRating = parseRating(getValue(idx.facilitating))
      userData.creativeArtsSkillRating = parseRating(getValue(idx.creative))
      userData.organizingSkillRating = parseRating(getValue(idx.organizing))
      userData.communicatingSkillRating = parseRating(getValue(idx.communicating))
      userData.mentoringSkillRating = parseRating(getValue(idx.mentoring))
      
      userData.supportNotes = getRawValue(idx.supportNotes)
      userData.funFacts = getRawValue(idx.hobbies)
      
      userData.signatureOnFile = toBool(getRawValue(idx.signature)) ?? false
      userData.signatureDate = parseDate(getRawValue(idx.signatureDate))
      
      userData.headshotReceived = toBool(getRawValue(idx.headshot)) ?? false
      
      userData.bioReceived = toBool(getRawValue(idx.bio)) ?? false

      if (existingUser) {
        const updateData: Record<string, unknown> = {}
        
        for (const [key, value] of Object.entries(userData)) {
          const existingValue = existingUser[key as keyof typeof existingUser]
          if (value !== null && value !== undefined && existingValue === null) {
            updateData[key] = value
          }
        }
        
        if (Object.keys(updateData).length > 0) {
          await prisma.user.update({
            where: { id: existingUser.id },
            data: updateData,
          })
          updated++
        } else {
          skipped++
        }
      } else {
        await prisma.user.create({
          data: {
            ...userData,
            email,
          } as never,
        })
        created++
      }
    } catch (err) {
      errors.push(`Row ${i + 1}: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  revalidatePath('/admin/users')

  return {
    success: true,
    created,
    updated,
    skipped,
    errors: errors.slice(0, 20),
    uncertainFields,
  }
}

export async function previewCSV(csvContent: string): Promise<{
  headers: string[]
  rowCount: number
  sampleRows: string[][]
}> {
  let lines = csvContent.split('\n').filter(line => line.trim())
  
  // Skip first line if it's a table name (e.g., "Team Master Sheet: Table 1")
  if (lines.length > 0 && lines[0].toLowerCase().includes('table')) {
    lines = lines.slice(1)
  }
  
  const headers = lines.length > 0 ? parseCSVLine(lines[0]) : []
  const sampleRows = lines.slice(1, 6).map(line => parseCSVLine(line))
  
  return {
    headers,
    rowCount: Math.max(0, lines.length - 1),
    sampleRows,
  }
}
