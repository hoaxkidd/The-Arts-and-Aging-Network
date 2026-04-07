import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { TimesheetList } from "@/components/admin/financials/TimesheetList"
import { MileageList } from "@/components/admin/financials/MileageList"
import { ExpenseRequestList } from "@/components/admin/financials/ExpenseRequestList"

export const dynamic = 'force-dynamic'

// Client Wrapper Component
import { FinancialsHubClient } from "./FinancialsHubClient"

export default async function FinancialsHubPage() {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') redirect('/dashboard')

  // Fetch all data in parallel
  const [timesheets, mileageEntries, expenseRequests] = await Promise.all([
    prisma.timesheet.findMany({
        take: 50,
        orderBy: { weekStart: 'desc' },
        include: { 
          user: { select: { id: true, name: true, preferredName: true, image: true } },
          entries: { select: { hoursWorked: true } }
        }
    }),
    prisma.mileageEntry.findMany({
        take: 50,
        orderBy: [{ status: 'asc' }, { date: 'desc' }],
        include: { user: { select: { id: true, name: true, preferredName: true, image: true } } }
    }),
    prisma.expenseRequest.findMany({
        take: 50,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, name: true, email: true } } }
    })
  ])

  // Calculate totals for timesheets
  const timesheetsWithTotals = timesheets.map(t => ({
    ...t,
    totalHours: t.entries.reduce((sum, e) => sum + e.hoursWorked, 0)
  }))

  return (
    <FinancialsHubClient 
        timesheets={timesheetsWithTotals}
        mileageEntries={mileageEntries}
        expenseRequests={expenseRequests}
    />
  )
}
