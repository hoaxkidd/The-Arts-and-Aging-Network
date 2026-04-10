import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { Prisma } from "@prisma/client"
import { CheckCircle, XCircle, Clock, AlertCircle, Users, Home } from "lucide-react"
import { cn } from "@/lib/utils"
import { STYLES } from "@/lib/styles"
import Link from "next/link"
import { ManualReminderTrigger } from "@/components/admin/ManualReminderTrigger"
import { EmailReminderFilters } from "@/components/admin/EmailReminderFilters"
import { InlineStatStrip } from '@/components/ui/InlineStatStrip'
import { EmailReminderRowActions } from '@/components/admin/EmailReminderRowActions'
import { EmailReminderBulkActions } from '@/components/admin/EmailReminderBulkActions'
import { parseReminderPolicyConfig, REMINDER_POLICY_TEMPLATE_TYPE } from '@/lib/reminder-policy'
import { ReminderPolicyPanel } from '@/components/admin/ReminderPolicyPanel'

export const dynamic = 'force-dynamic'

function formatReminderTiming(reminderType: string) {
  const base = reminderType
    .replace(/^SAMPLE_/, '')
    .replace(/^HOME_ADMIN_REMINDER_/, 'HOME_ADMIN_')
    .replace(/^STAFF_REMINDER_/, 'STAFF_')

  const daysMatch = base.match(/_(\d+)D$/)
  const days = daysMatch ? Number(daysMatch[1]) : null

  if (base.startsWith('HOME_ADMIN')) {
    if (days !== null) return `Home Admin • ${days} day${days === 1 ? '' : 's'} before`
    return 'Home Admin reminder'
  }

  if (base.startsWith('STAFF')) {
    if (days !== null) return `Staff • ${days} day${days === 1 ? '' : 's'} before`
    return 'Staff reminder'
  }

  return reminderType
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (ch) => ch.toUpperCase())
}

function formatCompactDateTime(value: Date | null) {
  if (!value) return '-'
  return value.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatReminderStatus(status: string) {
  if (status === 'PENDING') return 'Pending'
  if (status === 'SENT') return 'Sent'
  if (status === 'FAILED') return 'Failed'
  if (status === 'CANCELLED') return 'Cancelled'
  return status
}

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
  const where: Prisma.EmailReminderWhereInput = {}
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

  const policyTemplate = await prisma.emailTemplate.findUnique({
    where: { type: REMINDER_POLICY_TEMPLATE_TYPE },
    select: { content: true },
  })
  const reminderPolicyConfig = parseReminderPolicyConfig(policyTemplate?.content)

  // Get recipient details for each reminder
  const recipientIds = Array.from(new Set(reminders.map((reminder) => reminder.recipientId).filter((id): id is string => !!id)))
  const recipients = recipientIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: recipientIds } },
        select: { id: true, name: true, preferredName: true },
      })
    : []
  const recipientMap = new Map(recipients.map((recipient) => [recipient.id, recipient]))

  const remindersWithRecipients = reminders.map((reminder) => {
    const recipient = reminder.recipientId ? recipientMap.get(reminder.recipientId) : null
    return {
      ...reminder,
      recipientName: recipient?.preferredName || recipient?.name || 'Unknown',
    }
  })

  // Calculate stats
  const stats = {
    total: reminders.length,
    pending: reminders.filter(r => r.status === 'PENDING').length,
    sent: reminders.filter(r => r.status === 'SENT').length,
    failed: reminders.filter(r => r.status === 'FAILED').length,
    cancelled: reminders.filter(r => r.status === 'CANCELLED').length
  }

  const pendingReminderIds = remindersWithRecipients
    .filter((reminder) => reminder.status === 'PENDING')
    .map((reminder) => reminder.id)

  const failedReminderIds = remindersWithRecipients
    .filter((reminder) => reminder.status === 'FAILED')
    .map((reminder) => reminder.id)

  return (
      <div className="h-full flex flex-col min-w-0">
      <InlineStatStrip
        className="mb-4"
        items={[
          { label: 'Total', value: stats.total },
          { label: 'Pending', value: stats.pending, tone: 'warning' },
          { label: 'Sent', value: stats.sent, tone: 'success' },
          { label: 'Failed', value: stats.failed, tone: 'danger' },
          { label: 'Cancelled', value: stats.cancelled },
        ]}
      />

      <div className="mb-4 rounded-lg border border-gray-200 bg-white p-3">
        <div className="flex flex-wrap md:flex-nowrap items-center gap-2">
          <EmailReminderFilters
            currentStatus={statusFilter}
            currentType={typeFilter}
            compact
          />
          <ManualReminderTrigger compact />
          <EmailReminderBulkActions pendingIds={pendingReminderIds} failedIds={failedReminderIds} />
        </div>
      </div>

      {/* Reminders Table */}
      <div className="flex-1 min-h-0 min-w-0 bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="table-scroll-wrapper max-h-[calc(100vh-320px)] min-w-0">
        <table className={cn(STYLES.table, 'table-fixed min-w-[1240px]')}>
          <thead className="bg-gray-50">
            <tr className={STYLES.tableHeadRow}>
              <th className={cn(STYLES.tableHeader, 'w-[260px]')}>Event</th>
              <th className={cn(STYLES.tableHeader, 'w-[200px]')}>Recipient</th>
              <th className={cn(STYLES.tableHeader, 'w-[130px]')}>Type</th>
              <th className={cn(STYLES.tableHeader, 'w-[230px]')}>Timing</th>
              <th className={cn(STYLES.tableHeader, 'w-[150px]')}>Scheduled</th>
              <th className={cn(STYLES.tableHeader, 'w-[130px]')}>Status</th>
              <th className={cn(STYLES.tableHeader, 'w-[150px]')}>Sent</th>
              <th className={cn(STYLES.tableHeader, 'w-[90px]')}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {remindersWithRecipients.length === 0 ? (
              <tr>
                <td colSpan={8} className={cn(STYLES.tableCell, "text-center py-12")}>
                  No reminders found
                </td>
              </tr>
            ) : (
              remindersWithRecipients.map((reminder) => (
                <tr key={reminder.id} className={STYLES.tableRow}>
                  <td className={STYLES.tableCell}>
                    <Link
                      href={`/events/${reminder.event.id}`}
                      className="block max-w-[230px] truncate text-sm font-medium text-primary-600 hover:text-primary-700"
                      title={reminder.event.title}
                    >
                      {reminder.event.title}
                    </Link>
                    {reminder.event.geriatricHome && (
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <Home className="w-3 h-3" />
                        {reminder.event.geriatricHome.name}
                      </p>
                    )}
                    <p className="text-xs text-gray-400" title={formatCompactDateTime(reminder.event.startDateTime)}>
                      {formatCompactDateTime(reminder.event.startDateTime)}
                    </p>
                  </td>
                  <td className={STYLES.tableCell}>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-medium">
                        {reminder.recipientName[0] || '?'}
                      </div>
                      <span className="max-w-[150px] truncate text-sm text-gray-900" title={reminder.recipientName}>{reminder.recipientName}</span>
                    </div>
                  </td>
                  <td className={STYLES.tableCell}>
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
                  <td className={STYLES.tableCell}>
                    <span
                      className="inline-flex max-w-[220px] items-center rounded bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 whitespace-nowrap truncate"
                      title={formatReminderTiming(reminder.reminderType)}
                    >
                      {formatReminderTiming(reminder.reminderType)}
                    </span>
                  </td>
                  <td className={cn(STYLES.tableCell, 'whitespace-nowrap')}>
                    <span className="text-sm text-gray-900" title={formatCompactDateTime(reminder.scheduledFor)}>
                      {formatCompactDateTime(reminder.scheduledFor)}
                    </span>
                  </td>
                  <td className={STYLES.tableCell}>
                    <span className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap",
                      reminder.status === 'SENT' && "bg-green-100 text-green-700",
                      reminder.status === 'PENDING' && "bg-yellow-100 text-yellow-700",
                      reminder.status === 'FAILED' && "bg-red-100 text-red-700",
                      reminder.status === 'CANCELLED' && "bg-gray-100 text-gray-600"
                    )}>
                      {reminder.status === 'SENT' && <CheckCircle className="w-3 h-3" />}
                      {reminder.status === 'PENDING' && <Clock className="w-3 h-3" />}
                      {reminder.status === 'FAILED' && <XCircle className="w-3 h-3" />}
                      {reminder.status === 'CANCELLED' && <AlertCircle className="w-3 h-3" />}
                      {formatReminderStatus(reminder.status)}
                    </span>
                    {reminder.error && (
                      <p className="text-xs text-red-500 mt-1 max-w-xs truncate" title={reminder.error}>
                        {reminder.error}
                      </p>
                    )}
                  </td>
                  <td className={cn(STYLES.tableCell, 'whitespace-nowrap')}>
                    {reminder.sentAt ? (
                      <span className="text-sm text-gray-900" title={formatCompactDateTime(reminder.sentAt)}>
                        {formatCompactDateTime(reminder.sentAt)}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                  <td className={STYLES.tableCell}>
                    <EmailReminderRowActions
                      reminderId={reminder.id}
                      status={reminder.status}
                      eventTitle={reminder.event.title}
                      recipientName={reminder.recipientName}
                      reminderType={formatReminderTiming(reminder.reminderType)}
                      scheduledFor={reminder.scheduledFor.toISOString()}
                      sentAt={reminder.sentAt?.toISOString() || null}
                      error={reminder.error || null}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>

      <ReminderPolicyPanel config={reminderPolicyConfig} />
    </div>
  )
}
