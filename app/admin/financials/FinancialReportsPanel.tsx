'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
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
  const controlsRef = useRef<HTMLDivElement | null>(null)
  const lastOverflowRef = useRef<boolean | null>(null)

  // #region agent log
  useEffect(() => {
    fetch('http://127.0.0.1:7481/ingest/e565b430-778f-46bb-8e20-b2dc3873bccf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'c2c6c5' },
      body: JSON.stringify({
        sessionId: 'c2c6c5',
        runId: 'pre-fix',
        hypothesisId: 'H_render',
        location: 'app/admin/financials/FinancialReportsPanel.tsx:render',
        message: 'FinancialReportsPanel mounted',
        data: { period, disabled },
        timestamp: Date.now(),
      }),
    }).catch(() => {})
  }, [])
  // #endregion

  // #region agent log
  useEffect(() => {
    const el = controlsRef.current
    if (!el) return

    const report = () => {
      const nextOverflow = el.scrollWidth > el.clientWidth
      if (lastOverflowRef.current === nextOverflow) return
      lastOverflowRef.current = nextOverflow
      fetch('http://127.0.0.1:7481/ingest/e565b430-778f-46bb-8e20-b2dc3873bccf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'c2c6c5' },
        body: JSON.stringify({
          sessionId: 'c2c6c5',
          runId: 'pre-fix',
          hypothesisId: 'H_overflow',
          location: 'app/admin/financials/FinancialReportsPanel.tsx:controls',
          message: 'Exports controls overflow state changed',
          data: {
            overflow: nextOverflow,
            clientWidth: el.clientWidth,
            scrollWidth: el.scrollWidth,
            windowInnerWidth: typeof window !== 'undefined' ? window.innerWidth : null,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {})
    }

    report()
    const ro = new ResizeObserver(report)
    ro.observe(el)
    window.addEventListener('resize', report)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', report)
    }
  }, [])
  // #endregion

  return (
    <div className="mb-4 rounded-lg border border-gray-200 bg-white p-3 sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 sm:max-w-md">
          <p className="text-sm font-semibold text-gray-900">Financial Exports</p>
          <p className="text-xs text-gray-500">Download payroll CSV and monthly expense reports</p>
        </div>

        <div className="w-full sm:w-auto">
          <div
            ref={controlsRef}
            className="flex flex-row flex-nowrap items-end justify-end gap-2 min-w-[34rem]"
          >
            <div className="flex flex-col gap-1 shrink-0">
              <label htmlFor="financial-export-month" className="text-xs font-medium text-gray-600">
                Month
              </label>
              <MonthPicker
                id="financial-export-month"
                value={period}
                onChange={setPeriod}
                disabled={disabled}
              />
            </div>

            <div className="flex min-w-0 flex-row flex-nowrap items-center gap-2">
              <button
                type="button"
                onClick={handlePayrollExport}
                disabled={disabled}
                className={cn(STYLES.btn, STYLES.btnPrimary, STYLES.btnToolbar, 'shrink-0')}
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
                className={cn(STYLES.btn, STYLES.btnSecondary, STYLES.btnToolbar, 'shrink-0')}
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
