import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { DollarSign, Clock, MapPin, FileText } from "lucide-react"
import { TabNavigation } from "@/components/admin/shared/TabNavigation"
import { TimesheetList } from "@/components/admin/financials/TimesheetList"
import { MileageList } from "@/components/admin/financials/MileageList"
import { ExpenseRequestList } from "@/components/admin/financials/ExpenseRequestList"

// Client Wrapper Component
import { FinancialsHubClient } from "./FinancialsHubClient"

export default async function FinancialsHubPage() {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') redirect('/dashboard')

  // Fetch all data in parallel
  const [timesheets, mileageEntries, expenseRequests] = await Promise.all([
    prisma.timesheet.findMany({
        orderBy: { weekStart: 'desc' },
        include: { 
          user: { select: { id: true, name: true, preferredName: true, image: true } },
          entries: { select: { hoursWorked: true } }
        }
    }),
    prisma.mileageEntry.findMany({
        orderBy: [{ status: 'asc' }, { date: 'desc' }],
        include: { user: { select: { id: true, name: true, preferredName: true, image: true } } }
    }),
    prisma.expenseRequest.findMany({
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
