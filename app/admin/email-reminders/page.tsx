import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { Calendar, Mail, CheckCircle, XCircle, Clock, AlertCircle, Users, Home } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { ManualReminderTrigger } from "@/components/admin/ManualReminderTrigger"
import { EmailReminderFilters } from "@/components/admin/EmailReminderFilters"

export default async function EmailRemindersPage({
  searchParams
}: {
  searchParams: Promise<{ status?: string; type?: string }>
}) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') redirect('/dashboard')

  const params = await searchParams
  const statusFilter = params.status || 'ALL'
  const typeFilter = params.type || 'ALL'

  // Build where clause
  const where: any = {}
  if (statusFilter !== 'ALL') {
    where.status = statusFilter
  }
  if (typeFilter !== 'ALL') {
    where.recipientType = typeFilter
  }

  const reminders = await prisma.emailReminder.findMany({
    where,
    include: {
      event: {
        select: {
          id: true,
          title: true,
          startDateTime: true,
          status: true,
          geriatricHome: {
            select: { name: true }
          }
        }
      }
    },
    orderBy: { scheduledFor: 'desc' },
    take: 100
  })

  // Get recipient details for each reminder
  const remindersWithRecipients = await Promise.all(
    reminders.map(async (reminder) => {
      let recipientName = 'Unknown'
      if (reminder.recipientId) {
        const user = await prisma.user.findUnique({
          where: { id: reminder.recipientId },
          select: { name: true, preferredName: true }
        })
        if (user) {
          recipientName = user.preferredName || user.name || 'Unknown'
        }
      }
      return { ...reminder, recipientName }
    })
  )

  // Calculate stats
  const stats = {
    total: reminders.length,
    pending: reminders.filter(r => r.status === 'PENDING').length,
    sent: reminders.filter(r => r.status === 'SENT').length,
    failed: reminders.filter(r => r.status === 'FAILED').length,
    cancelled: reminders.filter(r => r.status === 'CANCELLED').length
  }

  return (
    <div className="h-full flex flex-col p-6">
      <div className="flex-shrink-0 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Email Reminders</h1>
        <p className="text-sm text-gray-500">Monitor automated email reminders for events</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase">Total</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <Mail className="w-8 h-8 text-gray-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-yellow-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-yellow-600 uppercase">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-green-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-green-600 uppercase">Sent</p>
              <p className="text-2xl font-bold text-green-600">{stats.sent}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-red-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-red-600 uppercase">Failed</p>
              <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
            </div>
            <XCircle className="w-8 h-8 text-red-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase">Cancelled</p>
              <p className="text-2xl font-bold text-gray-500">{stats.cancelled}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Manual Trigger */}
      <div className="flex-shrink-0 mb-4">
        <ManualReminderTrigger />
      </div>

      {/* Filters */}
      <div className="flex-shrink-0 mb-4">
        <EmailReminderFilters
          currentStatus={statusFilter}
          currentType={typeFilter}
        />
      </div>

      {/* Reminders Table */}
      <div className="flex-1 min-h-0 bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="table-scroll-wrapper h-full max-h-[calc(100vh-420px)]">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Event</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Recipient</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Timing</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Scheduled For</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Sent At</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {remindersWithRecipients.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">
                  No reminders found
                </td>
              </tr>
            ) : (
              remindersWithRecipients.map((reminder) => (
                <tr key={reminder.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/events/${reminder.event.id}`}
                      className="text-sm font-medium text-primary-600 hover:text-primary-700"
                    >
                      {reminder.event.title}
                    </Link>
                    {reminder.event.geriatricHome && (
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <Home className="w-3 h-3" />
                        {reminder.event.geriatricHome.name}
                      </p>
                    )}
                    <p className="text-xs text-gray-400">
                      {reminder.event.startDateTime.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-medium">
                        {reminder.recipientName[0] || '?'}
                      </div>
                      <span className="text-sm text-gray-900">{reminder.recipientName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium",
                      reminder.recipientType === 'HOME_ADMIN'
                        ? "bg-blue-100 text-blue-700"
                        : "bg-purple-100 text-purple-700"
                    )}>
                      {reminder.recipientType === 'HOME_ADMIN' ? (
                        <><Home className="w-3 h-3" /> Home Admin</>
                      ) : (
                        <><Users className="w-3 h-3" /> Staff</>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600">
                      {reminder.reminderType.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-900">
                      {reminder.scheduledFor.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                    <span className="text-xs text-gray-500 block">
                      {reminder.scheduledFor.toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit'
                      })}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium",
                      reminder.status === 'SENT' && "bg-green-100 text-green-700",
                      reminder.status === 'PENDING' && "bg-yellow-100 text-yellow-700",
                      reminder.status === 'FAILED' && "bg-red-100 text-red-700",
                      reminder.status === 'CANCELLED' && "bg-gray-100 text-gray-600"
                    )}>
                      {reminder.status === 'SENT' && <CheckCircle className="w-3 h-3" />}
                      {reminder.status === 'PENDING' && <Clock className="w-3 h-3" />}
                      {reminder.status === 'FAILED' && <XCircle className="w-3 h-3" />}
                      {reminder.status === 'CANCELLED' && <AlertCircle className="w-3 h-3" />}
                      {reminder.status}
                    </span>
                    {reminder.error && (
                      <p className="text-xs text-red-500 mt-1 max-w-xs truncate" title={reminder.error}>
                        {reminder.error}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {reminder.sentAt ? (
                      <>
                        <span className="text-sm text-gray-900">
                          {reminder.sentAt.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                        <span className="text-xs text-gray-500 block">
                          {reminder.sentAt.toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit'
                          })}
                        </span>
                      </>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* Instructions */}
      <div className="flex-shrink-0 mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-1">Automatic Email Reminders</p>
            <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
              <li>Home admins receive reminders 7 and 5 days before events</li>
              <li>Staff members receive reminders 3 and 1 day before events</li>
              <li>Reminders are processed automatically by the cron job at: <code className="bg-blue-100 px-1 rounded">/api/cron/reminders</code></li>
              <li>Configure the cron job to run every hour for optimal delivery</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
