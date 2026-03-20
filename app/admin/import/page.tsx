'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import * as XLSX from 'xlsx'
import { ArrowLeft, Upload, Users, Check, AlertCircle, FileText, Building2 } from 'lucide-react'
import { importStaffFromCSV, previewCSV } from '@/app/actions/staff-import'
import { importHomesFromCSV, importHomesRows, previewHomesCSV, type HomesImportRow } from '@/app/actions/home-import'

const ROLES = [
  { value: 'FACILITATOR', label: 'Facilitator' },
  { value: 'EMPLOYEE', label: 'Employee' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'PAYROLL', label: 'Payroll' },
  { value: 'PARTNER', label: 'Partner' },
  { value: 'VOLUNTEER', label: 'Volunteer' },
  { value: 'BOARD', label: 'Board Member' },
]

type ImportResult = {
  created: number
  updated: number
  skipped: number
  errors: string[]
  uncertainFields?: { email: string; field: string }[]
}

function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim()
}

function detectHomeHeaderRow(rows: string[][]): number {
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const normalized = rows[i].map((cell) => normalizeHeader(cell || ''))
    const hasHome = normalized.some((cell) => cell.includes('home/organization') || cell.includes('home organization') || cell === 'home')
    const hasContact = normalized.some((cell) => cell.includes('contact name'))
    if (hasHome && hasContact) return i
  }
  return -1
}

function findHeaderIndex(headers: string[], candidates: string[]): number {
  for (const candidate of candidates) {
    const c = normalizeHeader(candidate)
    const idx = headers.findIndex((h) => h === c || h.includes(c) || c.includes(h))
    if (idx >= 0) return idx
  }
  return -1
}

function getCell(row: string[], index: number): string {
  if (index < 0 || index >= row.length) return ''
  return String(row[index] || '').trim()
}

function parseHomesWorkbookAllTabs(file: File, workbook: XLSX.WorkBook): { rows: HomesImportRow[]; headers: string[]; rowCount: number } {
  const parsedRows: HomesImportRow[] = []
  const headerSet = new Set<string>()

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName]
    const rawRows = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1, raw: false, defval: '' })
      .map((row) => row.map((cell) => String(cell ?? '').trim()))

    if (rawRows.length === 0) continue

    const headerRowIndex = detectHomeHeaderRow(rawRows)
    if (headerRowIndex < 0) continue

    const headers = rawRows[headerRowIndex].map((h) => normalizeHeader(String(h || '')))
    headers.forEach((h) => {
      if (h) headerSet.add(h)
    })

    const idx = {
      name: findHeaderIndex(headers, ['Home/Organization', 'Home Organization', 'Home', 'Organization', 'Facility Name']),
      contactName: findHeaderIndex(headers, ['Contact Name', 'Primary Contact']),
      position: findHeaderIndex(headers, ['Position', 'Role']),
      email: findHeaderIndex(headers, ['Email', 'Contact Email']),
      phone: findHeaderIndex(headers, ['Phone', 'Contact Phone']),
      address: findHeaderIndex(headers, ['Address', 'Street Address']),
      cityProvince: findHeaderIndex(headers, ['City, Province', 'City Province']),
      city: findHeaderIndex(headers, ['City']),
      province: findHeaderIndex(headers, ['Province']),
      postalCode: findHeaderIndex(headers, ['Postal Code', 'Postal']),
      type: findHeaderIndex(headers, ['LTC or PCH', 'LTC', 'PCH', 'Type']),
      region: findHeaderIndex(headers, ['Region']),
      contacted: findHeaderIndex(headers, ['Contacted']),
      secondContact: findHeaderIndex(headers, ['2nd Contact', 'Second Contact']),
      secondEmailPhone: findHeaderIndex(headers, ['2nd Email/Phone', 'Second Email/Phone'])
    }

    for (let i = headerRowIndex + 1; i < rawRows.length; i++) {
      const row = rawRows[i]
      const name = getCell(row, idx.name)
      const contactName = getCell(row, idx.contactName)
      const contactPosition = getCell(row, idx.position)
      const contactEmail = getCell(row, idx.email)
      const contactPhone = getCell(row, idx.phone)
      const address = getCell(row, idx.address)
      const cityProvince = getCell(row, idx.cityProvince) || [getCell(row, idx.city), getCell(row, idx.province)].filter(Boolean).join(', ')
      const postalCode = getCell(row, idx.postalCode)
      const type = getCell(row, idx.type)
      const regionValue = getCell(row, idx.region)
      const contacted = getCell(row, idx.contacted)
      const secondContact = getCell(row, idx.secondContact)
      const secondEmailPhone = getCell(row, idx.secondEmailPhone)

      const hasAny = [name, contactName, contactPosition, contactEmail, contactPhone, address, cityProvince, postalCode, type, regionValue, contacted, secondContact, secondEmailPhone].some(Boolean)
      if (!hasAny) continue

      parsedRows.push({
        sheetName,
        rowNumber: i + 1,
        name,
        contactName,
        contactPosition,
        contactEmail,
        contactPhone,
        address,
        cityProvince,
        postalCode,
        type,
        region: regionValue || sheetName,
        contacted,
        secondContact,
        secondEmailPhone
      })
    }
  }

  if (parsedRows.length === 0) {
    throw new Error(`No valid homes data found in workbook: ${file.name}`)
  }

  return {
    rows: parsedRows,
    headers: Array.from(headerSet),
    rowCount: parsedRows.length
  }
}

export default function ImportStaffPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importType, setImportType] = useState<'staff' | 'homes'>('staff')
  const [file, setFile] = useState<File | null>(null)
  const [csvContent, setCsvContent] = useState<string | null>(null)
  const [homesRows, setHomesRows] = useState<HomesImportRow[] | null>(null)
  const [preview, setPreview] = useState<{ headers: string[]; rowCount: number } | null>(null)
  const [role, setRole] = useState('FACILITATOR')
  const [isImporting, setIsImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setResult(null)
    setParseError(null)
    setHomesRows(null)

    const fileName = selectedFile.name.toLowerCase()
    const isXlsx = fileName.endsWith('.xlsx') || fileName.endsWith('.xls')

    try {
      if (importType === 'homes' && isXlsx) {
        const buffer = await selectedFile.arrayBuffer()
        const workbook = XLSX.read(buffer, { type: 'array' })
        const parsed = parseHomesWorkbookAllTabs(selectedFile, workbook)
        setHomesRows(parsed.rows)
        setCsvContent(null)
        setPreview({ headers: parsed.headers, rowCount: parsed.rowCount })
        return
      }

      const text = await selectedFile.text()
      setCsvContent(text)

      const previewData = importType === 'staff'
        ? await previewCSV(text)
        : await previewHomesCSV(text)
      setPreview(previewData)
    } catch (error) {
      setPreview(null)
      setCsvContent(null)
      setHomesRows(null)
      setParseError(error instanceof Error ? error.message : 'Failed to read file')
    }
  }

  async function handleImport() {
    if (importType === 'homes' && !csvContent && !homesRows) return
    if (importType === 'staff' && !csvContent) return

    setIsImporting(true)
    const importResult = importType === 'staff'
      ? await importStaffFromCSV(csvContent || '', role)
      : homesRows
        ? await importHomesRows(homesRows)
        : await importHomesFromCSV(csvContent || '')
    setResult(importResult)
    setIsImporting(false)
  }

  function resetForType(type: 'staff' | 'homes') {
    setImportType(type)
    setFile(null)
    setCsvContent(null)
    setHomesRows(null)
    setPreview(null)
    setParseError(null)
    setResult(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="space-y-0">
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => resetForType('staff')}
            className={`px-4 py-2 rounded-lg text-sm font-medium border ${importType === 'staff' ? 'bg-primary-50 text-primary-700 border-primary-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
          >
            <Users className="w-4 h-4 inline mr-1.5" /> Staff Import
          </button>
          <button
            onClick={() => resetForType('homes')}
            className={`px-4 py-2 rounded-lg text-sm font-medium border ${importType === 'homes' ? 'bg-primary-50 text-primary-700 border-primary-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
          >
            <Building2 className="w-4 h-4 inline mr-1.5" /> Homes Import
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Upload File
        </h2>

        <input
          ref={fileInputRef}
          type="file"
          accept={importType === 'homes' ? '.csv,.txt,.xlsx,.xls' : '.csv,.txt'}
          onChange={handleFileSelect}
          className="hidden"
        />

        {!file ? (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-12 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors flex flex-col items-center justify-center gap-2 text-gray-500"
          >
            <FileText className="w-10 h-10" />
            <span className="font-medium">Click to upload file</span>
            <span className="text-sm">CSV for staff, CSV/XLSX for homes</span>
          </button>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <FileText className="w-8 h-8 text-gray-400" />
              <div className="flex-1">
                <p className="font-medium text-gray-900">{file.name}</p>
                <p className="text-sm text-gray-500">{preview?.rowCount || 0} rows detected</p>
              </div>
              <button
                onClick={() => {
                  setFile(null)
                  setCsvContent(null)
                  setHomesRows(null)
                  setPreview(null)
                  setParseError(null)
                  setResult(null)
                }}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Remove
              </button>
            </div>

            {parseError && (
              <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">{parseError}</div>
            )}

            {preview && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="font-medium text-blue-900 mb-2">Detected Columns:</h3>
                <div className="flex flex-wrap gap-2">
                  {preview.headers.slice(0, 12).map((h, i) => (
                    <span key={i} className="px-2 py-1 bg-white text-blue-800 text-xs rounded border border-blue-200">
                      {h}
                    </span>
                  ))}
                  {preview.headers.length > 12 && (
                    <span className="px-2 py-1 text-blue-800 text-xs">+{preview.headers.length - 12} more</span>
                  )}
                </div>
              </div>
            )}

            {importType === 'staff' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Default Role for Imported Staff</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full max-w-xs rounded-lg border-gray-300"
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={handleImport}
              disabled={isImporting || !!parseError || !preview}
              className="px-6 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isImporting ? (
                <>Processing...</>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Import {preview?.rowCount || 0} {importType === 'staff' ? 'Staff Members' : 'Homes'}
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {result && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Check className="w-5 h-5 text-green-600" />
            Import Complete
          </h2>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-green-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-green-600">{result.created}</p>
              <p className="text-sm text-green-700">Created</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-blue-600">{result.updated}</p>
              <p className="text-sm text-blue-700">Updated</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-gray-600">{result.skipped}</p>
              <p className="text-sm text-gray-600">Skipped</p>
            </div>
          </div>

          {importType === 'staff' && (result.uncertainFields?.length || 0) > 0 && (
            <div className="mb-4 p-4 bg-yellow-50 rounded-lg">
              <h3 className="font-medium text-yellow-900 mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Uncertain Fields ({result.uncertainFields?.length || 0})
              </h3>
              <p className="text-sm text-yellow-800 mb-3">These fields had "?" values and were not imported.</p>
              <div className="max-h-40 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left">
                      <th className="pb-2 font-medium">Email</th>
                      <th className="pb-2 font-medium">Uncertain Field</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(result.uncertainFields || []).slice(0, 10).map((item, i) => (
                      <tr key={i} className="border-t border-yellow-200">
                        <td className="py-1.5">{item.email}</td>
                        <td className="py-1.5">{item.field}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {result.errors.length > 0 && (
            <div className="p-4 bg-red-50 rounded-lg">
              <h3 className="font-medium text-red-900 mb-2">Errors</h3>
              <ul className="text-sm text-red-700 space-y-1">
                {result.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          <button
            onClick={() => router.push(importType === 'staff' ? '/admin/users' : '/admin/homes')}
            className="mt-4 px-6 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700"
          >
            {importType === 'staff' ? 'View All Users' : 'View All Homes'}
          </button>
        </div>
      )}
    </div>
  )
}
