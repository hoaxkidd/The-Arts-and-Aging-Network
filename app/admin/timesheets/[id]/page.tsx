import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { redirect, notFound } from "next/navigation"
import { Clock, ArrowLeft, CheckCircle, XCircle, Calendar, User, DollarSign } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { STYLES } from "@/lib/styles"
import { TimesheetReviewActions } from "./TimesheetReviewActions"

type Props = {
  params: Promise<{ id: string }>
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  })
}

function formatTime(date: Date | string | null): string {
  if (!date) return '--:--'
  const d = new Date(date)
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}

export default async function TimesheetReviewPage({ params }: Props) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  // Verify admin
  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id }
  })
  if (currentUser?.role !== 'ADMIN') redirect('/dashboard')

  const timesheet = await prisma.timesheet.findUnique({
    where: { id },
    include: {
      user: {
        select: { id: true, name: true, preferredName: true, email: true, image: true, position: true }
      },
      entries: {
        orderBy: { date: 'asc' }
      }
    }
  })

  if (!timesheet) notFound()

  const displayName = timesheet.user.preferredName || timesheet.user.name || 'Unknown'
  const totalHours = timesheet.entries.reduce((sum, e) => sum + e.hoursWorked, 0)
  const weekStart = new Date(timesheet.weekStart)

  // Group entries by date
  const entriesByDate: Record<string, typeof timesheet.entries> = {}
  timesheet.entries.forEach(entry => {
    const dateKey = new Date(entry.date).toISOString().split('T')[0]
    if (!entriesByDate[dateKey]) entriesByDate[dateKey] = []
    entriesByDate[dateKey].push(entry)
  })

  // Get all 7 days of the week
  const weekDays: Date[] = []
  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStart)
    day.setDate(weekStart.getDate() + i)
    weekDays.push(day)
  }

  // Group by funding class
  const byFundingClass: Record<string, number> = {}
  timesheet.entries.forEach(entry => {
    const fc = entry.fundingClass || 'Unspecified'
    byFundingClass[fc] = (byFundingClass[fc] || 0) + entry.hoursWorked
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/admin/financials"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Timesheets
        </Link>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            {timesheet.user.image ? (
              <img
                src={timesheet.user.image}
                alt={displayName}
                className="w-14 h-14 rounded-full object-cover border-2 border-gray-100"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 text-xl font-bold">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold text-gray-900">{displayName}'s Timesheet</h1>
              <p className="text-gray-500">
                Week of {formatDate(weekStart)} • {timesheet.user.position || 'Staff'}
              </p>
            </div>
          </div>

          <span className={cn(
            "px-3 py-1 rounded-full text-sm font-medium",
            timesheet.status === 'SUBMITTED' ? 'bg-yellow-100 text-yellow-700' :
            timesheet.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
            'bg-gray-100 text-gray-600'
          )}>
            {timesheet.status}
          </span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className={cn(STYLES.card, "p-4")}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalHours.toFixed(1)}</p>
              <p className="text-sm text-gray-500">Total Hours</p>
            </div>
          </div>
        </div>

        <div className={cn(STYLES.card, "p-4")}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{timesheet.entries.length}</p>
              <p className="text-sm text-gray-500">Entries</p>
            </div>
          </div>
        </div>

        <div className={cn(STYLES.card, "p-4")}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{Object.keys(byFundingClass).length}</p>
              <p className="text-sm text-gray-500">Funding Classes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Funding Breakdown */}
      {Object.keys(byFundingClass).length > 0 && (
        <div className={cn(STYLES.card, "p-4")}>
          <h3 className="font-semibold text-gray-900 mb-3">Hours by Funding Class</h3>
          <div className="flex flex-wrap gap-3">
            {Object.entries(byFundingClass).map(([fc, hours]) => (
              <div key={fc} className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200">
                <span className="text-sm font-medium text-gray-700">{fc}</span>
                <span className="text-sm text-gray-900 font-bold">{hours.toFixed(1)}h</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Entries by Day */}
      <div className={cn(STYLES.card, "p-0 overflow-hidden")}>
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Daily Entries</h3>
        </div>

        <div className="divide-y divide-gray-100">
          {weekDays.map(day => {
            const dateKey = day.toISOString().split('T')[0]
            const dayEntries = entriesByDate[dateKey] || []
            const dayHours = dayEntries.reduce((sum, e) => sum + e.hoursWorked, 0)

            return (
              <div key={dateKey} className="px-6 py-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">{formatDate(day)}</span>
                  <span className={cn(
                    "text-sm font-medium",
                    dayHours > 0 ? 'text-primary-600' : 'text-gray-400'
                  )}>
                    {dayHours > 0 ? `${dayHours.toFixed(1)}h` : 'No entries'}
                  </span>
                </div>

                {dayEntries.length > 0 && (
                  <div className="space-y-2">
                    {dayEntries.map(entry => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-gray-600 font-mono">
                            {formatTime(entry.checkInTime)} - {formatTime(entry.checkOutTime)}
                          </span>
                          <span className="font-medium text-gray-900">{entry.hoursWorked}h</span>
                          {entry.programName && (
                            <span className="text-sm text-gray-500">{entry.programName}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {entry.fundingClass && (
                            <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded">
                              {entry.fundingClass}
                            </span>
                          )}
                          {entry.notes && (
                            <span className="text-xs text-gray-400" title={entry.notes}>
                              📝
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Review Actions */}
      {timesheet.status === 'SUBMITTED' && (
        <TimesheetReviewActions timesheetId={timesheet.id} />
      )}

      {/* Approved/Rejected info */}
      {timesheet.status === 'APPROVED' && timesheet.approvedAt && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <div>
            <p className="font-medium text-green-800">Approved</p>
            <p className="text-sm text-green-600">
              {new Date(timesheet.approvedAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit'
              })}
            </p>
          </div>
        </div>
      )}

      {timesheet.rejectionNote && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="font-medium text-red-800 mb-1">Revision Note</p>
          <p className="text-sm text-red-600">{timesheet.rejectionNote}</p>
        </div>
      )}
    </div>
  )
}
