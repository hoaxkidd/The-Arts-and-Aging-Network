'use client'

import { useMemo, useState } from 'react'
import { Download, FileSpreadsheet, Loader2 } from 'lucide-react'
import { exportMonthlyExpenseReportCsv, exportPayrollCsv } from '@/app/actions/financial-reports'
import { MonthPicker } from '@/components/ui/MonthPicker'
import { STYLES } from '@/lib/styles'
import { cn } from '@/lib/utils'

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
  const [period, setPeriod] = useState(() => ({
    year: today.getFullYear(),
    month: today.getMonth() + 1,
  }))
  const [exportingPayroll, setExportingPayroll] = useState(false)
  const [exportingReport, setExportingReport] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { year, month } = period

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

  const disabled = exportingPayroll || exportingReport

  return (
    <div className="mb-4 rounded-lg border border-gray-200 bg-white p-3 sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1 sm:max-w-md">
          <p className="text-sm font-semibold text-gray-900">Financial Exports</p>
          <p className="text-xs text-gray-500 sm:truncate">
            Download payroll CSV and monthly expense reports
          </p>
        </div>

        <div className="shrink-0">
          <div className="flex flex-row flex-nowrap items-end justify-end gap-2">
            <div className="shrink-0">
              <MonthPicker
                id="financial-export-month"
                value={period}
                onChange={setPeriod}
                disabled={disabled}
              />
            </div>

            <div className="flex flex-row flex-nowrap items-center gap-2">
              <button
                type="button"
                onClick={handlePayrollExport}
                disabled={disabled}
                aria-label="Export Payroll CSV"
                className={cn(
                  STYLES.btn,
                  STYLES.btnPrimary,
                  STYLES.btnToolbar,
                  'shrink-0 w-9 px-0 sm:w-auto sm:px-2.5'
                )}
              >
                {exportingPayroll ? (
                  <Loader2 className={cn(STYLES.btnToolbarIcon, 'animate-spin')} />
                ) : (
                  <Download className={STYLES.btnToolbarIcon} />
                )}
                <span className="hidden sm:inline">Export Payroll CSV</span>
              </button>
              <button
                type="button"
                onClick={handleMonthlyExpenseReport}
                disabled={disabled}
                aria-label="Monthly Expense Report"
                className={cn(
                  STYLES.btn,
                  STYLES.btnSecondary,
                  STYLES.btnToolbar,
                  'shrink-0 w-9 px-0 sm:w-auto sm:px-2.5'
                )}
              >
                {exportingReport ? (
                  <Loader2 className={cn(STYLES.btnToolbarIcon, 'animate-spin')} />
                ) : (
                  <FileSpreadsheet className={STYLES.btnToolbarIcon} />
                )}
                <span className="hidden sm:inline">Monthly Expense Report</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
    </div>
  )
}
