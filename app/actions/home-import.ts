'use server'

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { createUserWithGeneratedCode } from '@/lib/user-code'

export type HomesImportRow = {
  sheetName?: string
  rowNumber?: number
  name: string
  contactName: string
  contactPosition?: string
  contactEmail?: string
  contactPhone?: string
  address?: string
  cityProvince?: string
  postalCode?: string
  type?: string
  region?: string
  contacted?: string
  secondContact?: string
  secondEmailPhone?: string
}

type HomeImportResult = {
  success: boolean
  created: number
  updated: number
  skipped: number
  errors: string[]
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

function normalizeEmail(value: string | null | undefined): string | null {
  if (!value) return null
  const normalized = value.trim().toLowerCase()
  return normalized.includes('@') ? normalized : null
}

function parseYesNo(value: string | null | undefined): boolean {
  if (!value) return false
  return ['y', 'yes', 'true', '1'].includes(value.trim().toLowerCase())
}

function safeJsonParse<T>(json: string | null | undefined, defaultValue: T): T {
  if (!json) return defaultValue
  try {
    return JSON.parse(json) as T
  } catch {
    return defaultValue
  }
}

async function importHomesRowsInternal(rows: HomesImportRow[], userId: string): Promise<HomeImportResult> {
  let created = 0
  let updated = 0
  let skipped = 0
  const errors: string[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    try {
      const name = row.name?.trim() || ''
      const contactName = row.contactName?.trim() || ''
      const contactPosition = row.contactPosition?.trim() || ''
      const contactEmail = normalizeEmail(row.contactEmail)
      const contactPhone = row.contactPhone?.trim() || ''
      const address = row.address?.trim() || ''
      const cityProvince = row.cityProvince?.trim() || ''
      const postalCode = row.postalCode?.trim() || ''
      const type = row.type?.trim() || ''
      const region = row.region?.trim() || row.sheetName?.trim() || ''
      const contactedRaw = row.contacted?.trim() || ''
      const secondContact = row.secondContact?.trim() || ''
      const secondEmailPhone = row.secondEmailPhone?.trim() || ''

      if (!name) {
        skipped++
        continue
      }

      const fullAddress = [address, cityProvince, postalCode].filter(Boolean).join(', ')

      const addressFilters = [
        ...(address ? [{ address: { contains: address, mode: 'insensitive' as const } }] : []),
        ...(cityProvince ? [{ address: { contains: cityProvince, mode: 'insensitive' as const } }] : [])
      ]

      const existingHome = await prisma.geriatricHome.findFirst({
        where: {
          name: { equals: name, mode: 'insensitive' },
          ...(addressFilters.length > 0 ? { OR: addressFilters } : {})
        },
        select: { id: true, additionalContacts: true, flags: true }
      })

      const secondaryEmail = normalizeEmail(secondEmailPhone)
      const secondaryPhone = secondEmailPhone
      const baseFlags = existingHome ? safeJsonParse<Record<string, unknown>>(existingHome.flags, {}) : {}
      const mergedFlags = {
        ...baseFlags,
        contacted: parseYesNo(contactedRaw),
        raw: contactedRaw || null,
        cityProvince: cityProvince || null,
        postalCode: postalCode || null,
        secondEmailPhone: secondEmailPhone || null,
        sourceSheet: row.sheetName || null
      }

      if (existingHome) {
        const additionalContacts = safeJsonParse<Array<{ id: string; name: string; email: string; phone: string; position: string }>>(existingHome.additionalContacts, [])
        if (secondContact && !additionalContacts.some((contact) => contact.name.toLowerCase() === secondContact.toLowerCase())) {
          additionalContacts.push({
            id: `contact_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            name: secondContact,
            email: secondaryEmail || '',
            phone: secondaryPhone || '',
            position: 'Secondary Contact'
          })
        }

        await prisma.geriatricHome.update({
          where: { id: existingHome.id },
          data: {
            name,
            address: fullAddress,
            contactName,
            contactEmail: contactEmail || row.contactEmail?.trim() || '',
            contactPhone: contactPhone || '',
            contactPosition: contactPosition || null,
            type: type || null,
            region: region || null,
            secondaryContact: secondContact || null,
            additionalContacts: JSON.stringify(additionalContacts),
            flags: JSON.stringify(mergedFlags)
          }
        })
        updated++
      } else {
        const user = await createUserWithGeneratedCode(prisma, {
          name: `${name} Home Admin`,
          email: null,
          password: null,
          role: 'HOME_ADMIN',
          status: 'PENDING',
          phone: contactPhone || null
        })

        await prisma.geriatricHome.create({
          data: {
            name,
            address: fullAddress,
            residentCount: 0,
            maxCapacity: 1,
            contactName,
            contactEmail: contactEmail || row.contactEmail?.trim() || '',
            contactPhone: contactPhone || '',
            contactPosition: contactPosition || null,
            type: type || null,
            region: region || null,
            secondaryContact: secondContact || null,
            additionalContacts: secondContact
              ? JSON.stringify([{
                  id: `contact_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                  name: secondContact,
                  email: secondaryEmail || '',
                  phone: secondaryPhone || '',
                  position: 'Secondary Contact'
                }])
              : JSON.stringify([]),
            flags: JSON.stringify(mergedFlags),
            userId: user.id
          }
        })
        created++
      }
    } catch (error) {
      const label = row.sheetName ? `${row.sheetName} row ${row.rowNumber || i + 1}` : `Row ${row.rowNumber || i + 1}`
      errors.push(`${label}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  await prisma.auditLog.create({
    data: {
      action: 'HOME_IMPORT_COMPLETED',
      details: JSON.stringify({ created, updated, skipped, errors: errors.length }),
      userId
    }
  })

  revalidatePath('/admin/homes')
  revalidatePath('/admin/users')
  revalidatePath('/admin/import')

  return {
    success: true,
    created,
    updated,
    skipped,
    errors: errors.slice(0, 50)
  }
}

export async function importHomesRows(rows: HomesImportRow[]): Promise<HomeImportResult> {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    return { success: false, created: 0, updated: 0, skipped: 0, errors: ['Unauthorized'] }
  }

  return importHomesRowsInternal(rows, session.user.id)
}

export async function previewHomesCSV(csvContent: string): Promise<{
  headers: string[]
  rowCount: number
  sampleRows: string[][]
}> {
  const lines = csvContent.split('\n').filter((line) => line.trim())
  const headers = lines.length > 0 ? parseCSVLine(lines[0]) : []
  const sampleRows = lines.slice(1, 6).map((line) => parseCSVLine(line))

  return {
    headers,
    rowCount: Math.max(0, lines.length - 1),
    sampleRows
  }
}

export async function importHomesFromCSV(csvContent: string): Promise<HomeImportResult> {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    return { success: false, created: 0, updated: 0, skipped: 0, errors: ['Unauthorized'] }
  }

  const lines = csvContent.split('\n').filter((line) => line.trim())
  if (lines.length < 2) {
    return { success: false, created: 0, updated: 0, skipped: 0, errors: ['CSV file is empty or has no data rows'] }
  }

  const headers = parseCSVLine(lines[0]).map((h) => h.trim().toLowerCase())
  const headerMap: Record<string, number> = {}
  headers.forEach((h, i) => {
    headerMap[h] = i
  })

  const columnIndex = (names: string[]): number => {
    for (const name of names) {
      const normalized = name.toLowerCase()
      for (const [header, idx] of Object.entries(headerMap)) {
        if (header === normalized || header.includes(normalized) || normalized.includes(header)) {
          return idx
        }
      }
    }
    return -1
  }

  const idx = {
    homeName: columnIndex(['home/organization', 'home organization', 'home', 'organization', 'facility name', 'home name']),
    contactName: columnIndex(['contact name', 'primary contact']),
    position: columnIndex(['position', 'role']),
    email: columnIndex(['email', 'contact email']),
    phone: columnIndex(['phone', 'contact phone']),
    address: columnIndex(['address', 'street address']),
    cityProvince: columnIndex(['city, province', 'city province']),
    city: columnIndex(['city']),
    province: columnIndex(['province']),
    postalCode: columnIndex(['postal code', 'postal']),
    type: columnIndex(['ltc or pch', 'ltc', 'pch', 'type']),
    region: columnIndex(['region']),
    contacted: columnIndex(['contacted']),
    secondContact: columnIndex(['2nd contact', 'second contact']),
    secondEmailPhone: columnIndex(['2nd email/phone', 'second email/phone', '2nd email phone'])
  }

  const getValue = (values: string[], index: number): string => (index >= 0 && index < values.length ? values[index].trim() : '')

  const rows: HomesImportRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    rows.push({
      rowNumber: i + 1,
      name: getValue(values, idx.homeName),
      contactName: getValue(values, idx.contactName),
      contactPosition: getValue(values, idx.position),
      contactEmail: getValue(values, idx.email),
      contactPhone: getValue(values, idx.phone),
      address: getValue(values, idx.address),
      cityProvince: getValue(values, idx.cityProvince) || [getValue(values, idx.city), getValue(values, idx.province)].filter(Boolean).join(', '),
      postalCode: getValue(values, idx.postalCode),
      type: getValue(values, idx.type),
      region: getValue(values, idx.region),
      contacted: getValue(values, idx.contacted),
      secondContact: getValue(values, idx.secondContact),
      secondEmailPhone: getValue(values, idx.secondEmailPhone)
    })
  }

  return importHomesRowsInternal(rows, session.user.id)
}
