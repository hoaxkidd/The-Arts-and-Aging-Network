import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { HistoryTabs } from "./HistoryTabs"

export default async function HistoryPage() {
  const session = await auth()
  const userId = session?.user?.id

  // 1. Fetch Entry History (existing logic)
  const timeEntries = await prisma.timeEntry.findMany({
    where: { userId },
    orderBy: { date: 'desc' },
    take: 50
  })

  const expenseRequests = await prisma.expenseRequest.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50
  })

  const history = [
    ...timeEntries.map(e => ({ ...e, type: 'TIME_ENTRY', date: e.date })),
    ...expenseRequests.map(({ amount, ...e }) => ({ ...e, type: 'REQUEST', date: e.createdAt, amount: amount ?? undefined }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  // 2. Fetch Timesheet History (new logic)
  const timesheets = await prisma.timesheet.findMany({
    where: { userId },
    orderBy: { weekStart: 'desc' },
    include: {
      entries: { select: { hoursWorked: true } }
    },
    take: 20
  })

  const timesheetsWithTotals = timesheets.map(t => ({
    ...t,
    totalHours: t.entries.reduce((sum, e) => sum + e.hoursWorked, 0)
  }))

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My History</h1>
        <p className="text-gray-500 text-sm">View your past timesheets and daily logs</p>
      </div>

      <HistoryTabs 
        historyEntries={history} 
        timesheets={timesheetsWithTotals} 
      />
    </div>
  )
}
