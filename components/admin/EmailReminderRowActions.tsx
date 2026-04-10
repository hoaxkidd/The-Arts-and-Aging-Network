'use client'

import { useMemo, useState, useTransition, type MouseEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Clock3, Eye, Loader2, MoreVertical, Pencil, RefreshCw, X } from 'lucide-react'
import { cancelEmailReminder, rescheduleEmailReminder, retryEmailReminder } from '@/app/actions/email-reminders'
import { notify } from '@/lib/notify'
import { cn } from '@/lib/utils'

type EmailReminderRowActionsProps = {
  reminderId: string
  status: string
  eventTitle: string
  recipientName: string
  reminderType: string
  scheduledFor: string
  sentAt: string | null
  error: string | null
}

export function EmailReminderRowActions({
  reminderId,
  status,
  eventTitle,
  recipientName,
  reminderType,
  scheduledFor,
  sentAt,
  error,
}: EmailReminderRowActionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [rescheduleOpen, setRescheduleOpen] = useState(false)
  const [quickViewOpen, setQuickViewOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null)
  const [rescheduleValue, setRescheduleValue] = useState('')

  const canRetry = status === 'FAILED'
  const canCancel = status === 'PENDING'
  const canReschedule = status === 'PENDING' || status === 'FAILED'
  const canEdit = canReschedule

  const initialValue = useMemo(() => {
    const d = new Date(scheduledFor)
    if (Number.isNaN(d.getTime())) return ''
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    return local.toISOString().slice(0, 16)
  }, [scheduledFor])

  const runRetry = () => {
    startTransition(async () => {
      const result = await retryEmailReminder(reminderId)
      if (result.error) {
        notify.error({ title: 'Retry failed', description: result.error })
        return
      }
      setMenuOpen(false)
      notify.success({ title: 'Reminder queued for retry' })
      router.refresh()
    })
  }

  const runCancel = () => {
    startTransition(async () => {
      const result = await cancelEmailReminder(reminderId)
      if (result.error) {
        notify.error({ title: 'Cancel failed', description: result.error })
        return
      }
      setMenuOpen(false)
      notify.success({ title: 'Reminder cancelled' })
      router.refresh()
    })
  }

  const runReschedule = () => {
    if (!rescheduleValue) {
      notify.warning({ title: 'Pick a date/time before rescheduling' })
      return
    }

    startTransition(async () => {
      const nextDate = new Date(rescheduleValue)
      const result = await rescheduleEmailReminder(reminderId, nextDate.toISOString())
      if (result.error) {
        notify.error({ title: 'Reschedule failed', description: result.error })
        return
      }
      setMenuOpen(false)
      setRescheduleOpen(false)
      notify.success({ title: 'Reminder rescheduled' })
      router.refresh()
    })
  }

  const openMenu = (event: MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const menuWidth = 176
    const menuHeight = 172
    const left = Math.max(8, rect.right - menuWidth)
    const top = Math.max(8, Math.min(rect.bottom + 4, window.innerHeight - menuHeight - 8))
    setMenuPosition({ top, left })
    setMenuOpen(true)
  }

  const formatDateTime = (value: string | null) => {
    if (!value) return '-'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '-'
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  return (
    <>
      <div className="relative inline-flex items-center">
        <button
          type="button"
          onClick={(event) => {
            if (menuOpen) {
              setMenuOpen(false)
              return
            }
            openMenu(event)
          }}
          disabled={isPending}
          className="inline-flex h-8 w-8 items-center justify-center rounded border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-label="Reminder actions"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreVertical className="h-4 w-4" />}
        </button>

        {menuOpen ? (
          <>
            <button
              type="button"
              className="fixed inset-0 z-10"
              aria-label="Close reminder actions"
              onClick={() => setMenuOpen(false)}
            />
            <div
              role="menu"
              aria-label="Reminder actions"
              className="fixed z-20 w-44 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg"
              style={{ top: menuPosition?.top ?? 0, left: menuPosition?.left ?? 0 }}
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false)
                  setQuickViewOpen(true)
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
              >
                <Eye className="h-4 w-4" />
                Quick view
              </button>

              {canEdit ? (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setRescheduleValue(initialValue)
                    setMenuOpen(false)
                    setRescheduleOpen(true)
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </button>
              ) : null}

              {canRetry ? (
                <button
                  type="button"
                  role="menuitem"
                  onClick={runRetry}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  <RefreshCw className="h-4 w-4" />
                  Retry
                </button>
              ) : null}

                {canReschedule ? (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setRescheduleValue(initialValue)
                      setMenuOpen(false)
                      setRescheduleOpen(true)
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Clock3 className="h-4 w-4" />
                    Reschedule
                  </button>
                ) : null}

              {canCancel ? (
                <button
                  type="button"
                  role="menuitem"
                  onClick={runCancel}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </button>
              ) : null}
            </div>
          </>
        ) : null}
      </div>

      {rescheduleOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setRescheduleOpen(false)} />
          <div className="relative w-full max-w-md rounded-lg border border-gray-200 bg-white p-4 shadow-xl">
            <h3 className="text-sm font-semibold text-gray-900">Reschedule reminder</h3>
            <p className="mt-1 text-xs text-gray-500">Pick the next date and time for this reminder.</p>
            <input
              type="datetime-local"
              value={rescheduleValue}
              onChange={(e) => setRescheduleValue(e.target.value)}
              className={cn('mt-3 w-full rounded border border-gray-300 px-2 py-2 text-sm')}
            />
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRescheduleOpen(false)}
                className="rounded px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
              >
                Close
              </button>
              <button
                type="button"
                onClick={runReschedule}
                disabled={isPending}
                className="inline-flex items-center gap-1 rounded bg-primary-600 px-3 py-2 text-sm text-white hover:bg-primary-700 disabled:opacity-60"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {quickViewOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setQuickViewOpen(false)} />
          <div className="relative w-full max-w-lg rounded-lg border border-gray-200 bg-white p-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Reminder quick view</h3>
              <button
                type="button"
                onClick={() => setQuickViewOpen(false)}
                className="rounded p-1 text-gray-500 hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-gray-700">
              <div className="rounded border border-gray-200 bg-gray-50 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-gray-500">Event</p>
                <p className="font-medium text-gray-900">{eventTitle}</p>
              </div>
              <div className="rounded border border-gray-200 bg-gray-50 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-gray-500">Recipient</p>
                <p className="font-medium text-gray-900">{recipientName}</p>
              </div>
              <div className="rounded border border-gray-200 bg-gray-50 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-gray-500">Timing</p>
                <p className="font-medium text-gray-900">{reminderType}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded border border-gray-200 bg-gray-50 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-gray-500">Scheduled</p>
                  <p className="font-medium text-gray-900">{formatDateTime(scheduledFor)}</p>
                </div>
                <div className="rounded border border-gray-200 bg-gray-50 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-gray-500">Sent</p>
                  <p className="font-medium text-gray-900">{formatDateTime(sentAt)}</p>
                </div>
              </div>
              <div className="rounded border border-gray-200 bg-gray-50 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-gray-500">Status</p>
                <p className="font-medium text-gray-900">{status}</p>
                {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
