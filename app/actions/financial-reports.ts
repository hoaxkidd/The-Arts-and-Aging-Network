'use server'

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function toCsvRow(values: unknown[]): string {
  return values.map(escapeCsvValue).join(',')
}

function getMonthRange(year: number, month: number) {
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 1)
  return { start, end }
}

function formatMonthLabel(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`
}

export async function exportPayrollCsv(month: number, year: number) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') return { error: 'Unauthorized' }

  const { start, end } = getMonthRange(year, month)

  const [timesheetEntries, mileageEntries, expenseRequests] = await Promise.all([
    prisma.timesheetEntry.findMany({
      where: {
        date: { gte: start, lt: end },
        timesheet: { status: 'APPROVED' },
      },
      include: {
        user: { select: { name: true, preferredName: true, email: true } },
      },
      orderBy: { date: 'asc' },
    }),
    prisma.mileageEntry.findMany({
      where: {
        date: { gte: start, lt: end },
        status: 'APPROVED',
      },
      include: {
        user: { select: { name: true, preferredName: true, email: true } },
      },
      orderBy: { date: 'asc' },
    }),
    prisma.expenseRequest.findMany({
      where: {
        createdAt: { gte: start, lt: end },
        status: 'APPROVED',
      },
      include: {
        user: { select: { name: true, preferredName: true, email: true } },
      },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  const rows: string[] = []
  rows.push(toCsvRow(['Entry Type', 'Date', 'Staff Name', 'Staff Email', 'Reference ID', 'Hours Worked', 'Kilometers', 'Amount', 'Funding Class', 'Description']))

  for (const entry of timesheetEntries) {
    rows.push(toCsvRow([
      'TIMESHEET',
      entry.date.toISOString().slice(0, 10),
      entry.user.preferredName || entry.user.name || 'Unknown',
      entry.user.email || '',
      entry.id,
      entry.hoursWorked,
      '',
      '',
      entry.fundingClass || '',
      entry.notes || '',
    ]))
  }

  for (const entry of mileageEntries) {
    rows.push(toCsvRow([
      'MILEAGE',
      entry.date.toISOString().slice(0, 10),
      entry.user.preferredName || entry.user.name || 'Unknown',
      entry.user.email || '',
      entry.id,
      '',
      entry.kilometers,
      '',
      entry.fundingClass || '',
      `${entry.startLocation} -> ${entry.endLocation}${entry.purpose ? ` (${entry.purpose})` : ''}`,
    ]))
  }

  for (const entry of expenseRequests) {
    rows.push(toCsvRow([
      'EXPENSE',
      entry.createdAt.toISOString().slice(0, 10),
      entry.user.preferredName || entry.user.name || 'Unknown',
      entry.user.email || '',
      entry.id,
      '',
      '',
      entry.amount ?? '',
      '',
      `${entry.category}: ${entry.description}`,
    ]))
  }

  return {
    csv: `${rows.join('\n')}\n`,
    filename: `payroll-export-${formatMonthLabel(year, month)}.csv`,
  }
}

export async function exportMonthlyExpenseReportCsv(month: number, year: number) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') return { error: 'Unauthorized' }

  const { start, end } = getMonthRange(year, month)

  const [approvedExpenses, pendingExpenses, approvedMileage, approvedTimesheetEntries] = await Promise.all([
    prisma.expenseRequest.findMany({
      where: {
        createdAt: { gte: start, lt: end },
        status: 'APPROVED',
      },
      include: { user: { select: { name: true, preferredName: true, email: true } } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.expenseRequest.count({
      where: {
        createdAt: { gte: start, lt: end },
        status: 'PENDING',
      },
    }),
    prisma.mileageEntry.findMany({
      where: {
        date: { gte: start, lt: end },
        status: 'APPROVED',
      },
      include: { user: { select: { name: true, preferredName: true, email: true } } },
      orderBy: { date: 'asc' },
    }),
    prisma.timesheetEntry.findMany({
      where: {
        date: { gte: start, lt: end },
        timesheet: { status: 'APPROVED' },
      },
      include: { user: { select: { name: true, preferredName: true, email: true } } },
      orderBy: { date: 'asc' },
    }),
  ])

  const approvedExpenseTotal = approvedExpenses.reduce((sum, r) => sum + (r.amount || 0), 0)
  const approvedMileageTotal = approvedMileage.reduce((sum, r) => sum + r.kilometers, 0)
  const approvedHoursTotal = approvedTimesheetEntries.reduce((sum, r) => sum + r.hoursWorked, 0)

  const byCategory = new Map<string, { count: number; total: number }>()
  for (const req of approvedExpenses) {
    const category = req.category || 'UNCATEGORIZED'
    const current = byCategory.get(category) || { count: 0, total: 0 }
    current.count += 1
    current.total += req.amount || 0
    byCategory.set(category, current)
  }

  const lines: string[] = []
  lines.push(toCsvRow(['Report Month', formatMonthLabel(year, month)]))
  lines.push(toCsvRow(['Generated At', new Date().toISOString()]))
  lines.push('')
  lines.push(toCsvRow(['Summary Metric', 'Value']))
  lines.push(toCsvRow(['Approved Expense Count', approvedExpenses.length]))
  lines.push(toCsvRow(['Approved Expense Amount', approvedExpenseTotal.toFixed(2)]))
  lines.push(toCsvRow(['Approved Mileage Entries', approvedMileage.length]))
  lines.push(toCsvRow(['Approved Mileage Kilometers', approvedMileageTotal.toFixed(2)]))
  lines.push(toCsvRow(['Approved Timesheet Hours', approvedHoursTotal.toFixed(2)]))
  lines.push(toCsvRow(['Pending Expense Requests', pendingExpenses]))
  lines.push('')
  lines.push(toCsvRow(['Expense Category Breakdown']))
  lines.push(toCsvRow(['Category', 'Count', 'Total Amount']))
  for (const [category, stats] of byCategory.entries()) {
    lines.push(toCsvRow([category, stats.count, stats.total.toFixed(2)]))
  }
  lines.push('')
  lines.push(toCsvRow(['Approved Expense Details']))
  lines.push(toCsvRow(['Date', 'Staff Name', 'Staff Email', 'Category', 'Amount', 'Description', 'Receipt URL']))
  for (const req of approvedExpenses) {
    lines.push(toCsvRow([
      req.createdAt.toISOString().slice(0, 10),
      req.user.preferredName || req.user.name || 'Unknown',
      req.user.email || '',
      req.category,
      (req.amount || 0).toFixed(2),
      req.description,
      req.receiptUrl || '',
    ]))
  }

  return {
    csv: `${lines.join('\n')}\n`,
    filename: `monthly-expense-report-${formatMonthLabel(year, month)}.csv`,
  }
}
