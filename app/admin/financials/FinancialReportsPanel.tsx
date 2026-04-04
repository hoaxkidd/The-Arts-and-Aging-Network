'use client'

import { useMemo, useState } from 'react'
import { Download, FileSpreadsheet, Loader2 } from 'lucide-react'
import { exportMonthlyExpenseReportCsv, exportPayrollCsv } from '@/app/actions/financial-reports'

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function FinancialReportsPanel() {
  const today = useMemo(() => new Date(), [])
  const [monthValue, setMonthValue] = useState(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  )
  const [exportingPayroll, setExportingPayroll] = useState(false)
  const [exportingReport, setExportingReport] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [year, month] = monthValue.split('-').map((value) => Number(value))

  async function handlePayrollExport() {
    setExportingPayroll(true)
    setError(null)
    const result = await exportPayrollCsv(month, year)
    setExportingPayroll(false)
    if ('error' in result) {
      setError(result.error || 'Failed to export payroll CSV')
      return
    }
    downloadCsv(result.filename, result.csv)
  }

  async function handleMonthlyExpenseReport() {
    setExportingReport(true)
    setError(null)
    const result = await exportMonthlyExpenseReportCsv(month, year)
    setExportingReport(false)
    if ('error' in result) {
      setError(result.error || 'Failed to export monthly expense report')
      return
    }
    downloadCsv(result.filename, result.csv)
  }

  return (
    <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900">Financial Exports</p>
          <p className="text-xs text-gray-500">Download payroll CSV and monthly expense reports</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="text-xs text-gray-600">
            Month
            <input
              type="month"
              value={monthValue}
              onChange={(e) => setMonthValue(e.target.value)}
              className="ml-2 rounded-md border border-gray-300 px-2 py-1 text-sm"
            />
          </label>
          <button
            onClick={handlePayrollExport}
            disabled={exportingPayroll || exportingReport}
            className="inline-flex items-center gap-2 rounded-md bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
          >
            {exportingPayroll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Export Payroll CSV
          </button>
          <button
            onClick={handleMonthlyExpenseReport}
            disabled={exportingPayroll || exportingReport}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            {exportingReport ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
            Monthly Expense Report
          </button>
        </div>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  )
}
