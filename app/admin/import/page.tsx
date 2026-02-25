'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Upload, Users, Check, AlertCircle, FileText } from 'lucide-react'
import { importStaffFromCSV, previewCSV } from '@/app/actions/staff-import'

const ROLES = [
  { value: 'FACILITATOR', label: 'Facilitator' },
  { value: 'CONTRACTOR', label: 'Contractor' },
  { value: 'EMPLOYEE', label: 'Employee' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'PAYROLL', label: 'Payroll' },
  { value: 'PARTNER', label: 'Partner' },
  { value: 'VOLUNTEER', label: 'Volunteer' },
  { value: 'BOARD', label: 'Board Member' },
]

export default function ImportStaffPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [csvContent, setCsvContent] = useState<string | null>(null)
  const [preview, setPreview] = useState<{ headers: string[]; rowCount: number } | null>(null)
  const [role, setRole] = useState('FACILITATOR')
  const [isImporting, setIsImporting] = useState(false)
  const [result, setResult] = useState<{
    created: number
    updated: number
    skipped: number
    errors: string[]
    uncertainFields: { email: string; field: string }[]
  } | null>(null)

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setResult(null)

    const text = await selectedFile.text()
    setCsvContent(text)

    const previewData = await previewCSV(text)
    setPreview(previewData)
  }

  async function handleImport() {
    if (!csvContent) return

    setIsImporting(true)
    const importResult = await importStaffFromCSV(csvContent, role)
    setResult(importResult)
    setIsImporting(false)
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Link href="/admin/users" className="text-gray-500 hover:text-gray-700 flex items-center gap-2 mb-4 text-sm">
        <ArrowLeft className="w-4 h-4" /> Back to Users
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">Import Staff Profiles</h1>
      <p className="text-gray-500 mb-6">
        Bulk import staff from a CSV file. Existing users will be updated (only empty fields will be filled).
      </p>

      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Upload CSV File
        </h2>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.txt"
          onChange={handleFileSelect}
          className="hidden"
        />

        {!file ? (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-12 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors flex flex-col items-center justify-center gap-2 text-gray-500"
          >
            <FileText className="w-10 h-10" />
            <span className="font-medium">Click to upload CSV file</span>
            <span className="text-sm">or drag and drop</span>
          </button>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <FileText className="w-8 h-8 text-gray-400" />
              <div className="flex-1">
                <p className="font-medium text-gray-900">{file.name}</p>
                <p className="text-sm text-gray-500">
                  {preview?.rowCount || 0} rows detected
                </p>
              </div>
              <button
                onClick={() => {
                  setFile(null)
                  setCsvContent(null)
                  setPreview(null)
                  setResult(null)
                }}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Remove
              </button>
            </div>

            {preview && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="font-medium text-blue-900 mb-2">Detected Columns:</h3>
                <div className="flex flex-wrap gap-2">
                  {preview.headers.slice(0, 10).map((h, i) => (
                    <span key={i} className="px-2 py-1 bg-white text-blue-800 text-xs rounded border border-blue-200">
                      {h}
                    </span>
                  ))}
                  {preview.headers.length > 10 && (
                    <span className="px-2 py-1 text-blue-800 text-xs">
                      +{preview.headers.length - 10} more
                    </span>
                  )}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Role for Imported Staff
              </label>
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

            <button
              onClick={handleImport}
              disabled={isImporting}
              className="px-6 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isImporting ? (
                <>Processing...</>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Import {preview?.rowCount || 0} Staff Members
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

          {result.uncertainFields.length > 0 && (
            <div className="mb-4 p-4 bg-yellow-50 rounded-lg">
              <h3 className="font-medium text-yellow-900 mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Uncertain Fields ({result.uncertainFields.length})
              </h3>
              <p className="text-sm text-yellow-800 mb-3">
                These fields had "?" values and were not imported. Please review and update manually.
              </p>
              <div className="max-h-40 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left">
                      <th className="pb-2 font-medium">Email</th>
                      <th className="pb-2 font-medium">Uncertain Field</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.uncertainFields.slice(0, 10).map((item, i) => (
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
            onClick={() => router.push('/admin/users')}
            className="mt-4 px-6 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700"
          >
            View All Users
          </button>
        </div>
      )}

      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-medium text-gray-900 mb-2">CSV Format Guidelines</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• First row should contain column headers</li>
          <li>• Include &quot;Full Legal Name&quot; and &quot;Email Address&quot; columns (required)</li>
          <li>• For multiple values (e.g., multiple emails), use the first value only</li>
          <li>• Yes/No fields accept: y, Y, yes, YES, n, N, no, NO</li>
          <li>• Use ? for uncertain values (will be flagged for review)</li>
          <li>• Dates can be: YYYY-MM-DD, DD-Mon-YY, or YYYY-MM</li>
          <li>• Existing users: only empty fields will be updated</li>
        </ul>
      </div>
    </div>
  )
}
