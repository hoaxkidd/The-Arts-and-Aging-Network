/**
 * One-time script to bulk-import staff profiles from a CSV file.
 * Creates User rows with status PENDING and no password (placeholder profiles).
 *
 * Usage: npx tsx scripts/import-staff-profiles.ts <path-to-csv>
 *
 * CSV should have a header row. Column names are matched case-insensitively.
 * Required columns: Email Address, Full Legal Name (or "Name")
 * Optional: see COLUMN_MAP below.
 *
 * Example header (spreadsheet export):
 * Full Legal Name,Team ID,Team Code,Team Type,Active/Non-Active,Preferred Name,Pronouns,Date of Birth,Phone Number,Email Address,Street Address,City,Province,Postal Code,T-Shirt Size,Emergency Contact Name,Emergency Contact Relationship,Emergency Contact Phone,Emergency Contact Alt Phone,Allergies,Medical Conditions,Requires Accommodations (Y/N),Accommodation Details,Position / Role,Start Date,Supervisor,...
 */

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

const COLUMN_MAP: Record<string, string> = {
  'full legal name': 'name',
  'name': 'name',
  'email address': 'email',
  'email': 'email',
  'team id': 'teamId',
  'team code': 'teamCode',
  'team type': 'teamType',
  'active/non-active': 'active',
  'preferred name': 'preferredName',
  'pronouns': 'pronouns',
  'date of birth': 'birthDate',
  'phone number': 'phone',
  'street address': 'streetAddress',
  'city': 'city',
  'province': 'province',
  'postal code': 'postalCode',
  't-shirt size': 'tShirtSize',
  'emergency contact name': 'ec_name',
  'emergency contact relationship': 'ec_relation',
  'emergency contact phone': 'ec_phone',
  'emergency contact alt phone': 'ec_alt_phone',
  'allergies': 'health_allergies',
  'medical conditions': 'health_medical',
  'requires accommodations (y/n)': 'requiresAccommodation',
  'accommodation details': 'accommodationDetails',
  'position / role': 'position',
  'start date': 'startDate',
  'supervisor': 'supervisorId',
  'workplace safety form received (y/n)': 'workplaceSafetyFormReceived',
  'code of conduct received (y/n)': 'codeOfConductReceived',
  'internal controls & travel policy acknowledged (y/n)': 'travelPolicyAcknowledged',
  'police check received (y/n)': 'policeCheckReceived',
  'vulnerable sector check required (y/n)': 'vulnerableSectorCheckRequired',
  'dementia engagement training completed (y/n)': 'dementiaTrainingCompleted',
  'training completion date': 'dementiaTrainingDate',
  'training topup renewal (2 year later)': 'dementiaTrainingTopupDate',
  'strengths / skills': 'strengthsSkills',
  'facilitating groups (1–5)': 'facilitatingSkillRating',
  'creative arts (1–5)': 'creativeArtsSkillRating',
  'organizing (1–5)': 'organizingSkillRating',
  'communicating (1–5)': 'communicatingSkillRating',
  'mentoring (1–5)': 'mentoringSkillRating',
  'support needs / notes': 'supportNotes',
  'hobbies / fun facts': 'funFacts',
  'signature on file (y/n)': 'signatureOnFile',
  'signature date': 'signatureDate',
  'headshot received (y/n)': 'headshotReceived',
  'bio received (y/n)': 'bioReceived',
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      inQuotes = !inQuotes
    } else if ((c === ',' && !inQuotes) || (c === '\n' && !inQuotes)) {
      result.push(current.trim())
      current = ''
      if (c === '\n') break
    } else {
      current += c
    }
  }
  result.push(current.trim())
  return result
}

function parseYN(value: string | undefined): boolean {
  if (!value) return false
  const v = value.trim().toLowerCase()
  return v === 'y' || v === 'yes' || v === '1' || v === 'true'
}

function parseDate(value: string | undefined): Date | undefined {
  if (!value || !value.trim()) return undefined
  const d = new Date(value.trim())
  return isNaN(d.getTime()) ? undefined : d
}

function parseRating(value: string | undefined): number | undefined {
  if (!value) return undefined
  const n = parseInt(value.trim(), 10)
  return isNaN(n) ? undefined : n
}

async function main() {
  const csvPath = process.argv[2]
  if (!csvPath) {
    console.error('Usage: npx tsx scripts/import-staff-profiles.ts <path-to-csv>')
    process.exit(1)
  }

  const resolved = path.resolve(process.cwd(), csvPath)
  if (!fs.existsSync(resolved)) {
    console.error('File not found:', resolved)
    process.exit(1)
  }

  const content = fs.readFileSync(resolved, 'utf-8')
  const lines = content.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) {
    console.error('CSV must have a header row and at least one data row.')
    process.exit(1)
  }

  const headerLine = lines[0]
  const headers = parseCSVLine(headerLine).map((h) => h.toLowerCase().trim())
  const getCol = (row: string[], key: string): string | undefined => {
    const idx = headers.indexOf(key.toLowerCase().trim())
    if (idx === -1) return undefined
    return row[idx]?.trim() || undefined
  }

  let created = 0
  let skipped = 0
  let errors = 0

  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i])
    const get = (col: string): string | undefined => {
      const normalizedCol = col.toLowerCase().trim()
      const mapped = COLUMN_MAP[normalizedCol]
      const keysToTry = mapped
        ? Object.keys(COLUMN_MAP).filter((k) => COLUMN_MAP[k] === mapped)
        : [normalizedCol]
      for (const key of keysToTry) {
        const val = getCol(row, key)
        if (val !== undefined && val !== '') return val
      }
      return undefined
    }

    const email = get('email address') || get('email')
    const name = get('full legal name') || get('name')
    if (!email || !name) {
      console.warn(`Row ${i + 1}: missing email or name, skipping`)
      skipped++
      continue
    }

    const emailNorm = email.toLowerCase().trim()
    const existing = await prisma.user.findUnique({ where: { email: emailNorm } })
    if (existing) {
      if (existing.password || existing.status === 'ACTIVE') {
        console.warn(`Row ${i + 1}: ${email} already has an account, skipping`)
        skipped++
        continue
      }
      console.warn(`Row ${i + 1}: placeholder for ${email} already exists, skipping`)
      skipped++
      continue
    }

    const street = get('street address')
    const city = get('city')
    const province = get('province')
    const postal = get('postal code')
    const addressParts = [street, city, province, postal].filter(Boolean)
    const address = addressParts.length ? addressParts.join(', ') : undefined

    const activeStr = get('active/non-active')
    const status = parseYN(activeStr) ? 'PENDING' : 'INACTIVE'

    const emergencyContact =
      get('emergency contact name') || get('emergency contact relationship') || get('emergency contact phone')
        ? JSON.stringify({
            name: get('emergency contact name') ?? undefined,
            relation: get('emergency contact relationship') ?? undefined,
            phone: get('emergency contact phone') ?? undefined,
          })
        : null

    const healthInfo =
      get('allergies') || get('medical conditions')
        ? JSON.stringify({
            allergies: get('allergies') ?? undefined,
            medical: get('medical conditions') ?? undefined,
          })
        : null

    try {
      await prisma.user.create({
        data: {
          email: emailNorm,
          name,
          password: null,
          status,
          role: 'CONTRACTOR',
          preferredName: get('preferred name') ?? null,
          pronouns: get('pronouns') ?? null,
          birthDate: parseDate(get('date of birth')) ?? null,
          phone: get('phone number') ?? null,
          address: address ?? null,
          teamId: get('team id') ?? null,
          teamCode: get('team code') ?? null,
          teamType: get('team type') ?? null,
          tShirtSize: get('t-shirt size') ?? null,
          position: get('position / role') ?? null,
          startDate: parseDate(get('start date')) ?? null,
          supervisorId: get('supervisor') ?? null,
          region: get('province') ?? null,
          emergencyContact,
          emergencyAltPhone: get('emergency contact alt phone') ?? null,
          healthInfo,
          requiresAccommodation: parseYN(get('requires accommodations (y/n)')),
          accommodationDetails: get('accommodation details') ?? null,
          workplaceSafetyFormReceived: parseYN(get('workplace safety form received (y/n)')),
          codeOfConductReceived: parseYN(get('code of conduct received (y/n)')),
          travelPolicyAcknowledged: parseYN(get('internal controls & travel policy acknowledged (y/n)')),
          policeCheckReceived: parseYN(get('police check received (y/n)')),
          vulnerableSectorCheckRequired: parseYN(get('vulnerable sector check required (y/n)')),
          dementiaTrainingCompleted: parseYN(get('dementia engagement training completed (y/n)')),
          dementiaTrainingDate: parseDate(get('training completion date')) ?? null,
          dementiaTrainingTopupDate: parseDate(get('training topup renewal (2 year later)')) ?? null,
          strengthsSkills: get('strengths / skills') ?? null,
          facilitatingSkillRating: parseRating(get('facilitating groups (1–5)')) ?? null,
          creativeArtsSkillRating: parseRating(get('creative arts (1–5)')) ?? null,
          organizingSkillRating: parseRating(get('organizing (1–5)')) ?? null,
          communicatingSkillRating: parseRating(get('communicating (1–5)')) ?? null,
          mentoringSkillRating: parseRating(get('mentoring (1–5)')) ?? null,
          supportNotes: get('support needs / notes') ?? null,
          funFacts: get('hobbies / fun facts') ?? null,
          signatureOnFile: parseYN(get('signature on file (y/n)')),
          signatureDate: parseDate(get('signature date')) ?? null,
          headshotReceived: parseYN(get('headshot received (y/n)')),
          bioReceived: parseYN(get('bio received (y/n)')),
        },
      })
      created++
      console.log(`Created: ${name} (${emailNorm})`)
    } catch (e) {
      console.error(`Row ${i + 1}: ${email}`, e)
      errors++
    }
  }

  console.log('\nDone. Created:', created, 'Skipped:', skipped, 'Errors:', errors)
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e)
    prisma.$disconnect()
    process.exit(1)
  })
