'use client'

import { useState } from 'react'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { approveTimesheet, rejectTimesheet } from '@/app/actions/timesheet'
import { useRouter } from 'next/navigation'
import { triggerNotificationRefresh } from '@/lib/notification-refresh'

type Props = {
  timesheetId: string
}

export function TimesheetReviewActions({ timesheetId }: Props) {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [rejectNotes, setRejectNotes] = useState('')

  async function handleApprove() {
    if (!confirm('Approve this timesheet?')) return
    setIsPending(true)
    const result = await approveTimesheet(timesheetId)
    if (result.error) {
      alert(result.error)
      setIsPending(false)
    } else {
      triggerNotificationRefresh()
      router.push('/admin/financials')
      router.refresh()
    }
  }

  async function handleReject() {
    if (!rejectNotes.trim()) {
      alert('Please provide a reason for rejection')
      return
    }
    setIsPending(true)
    const result = await rejectTimesheet(timesheetId, rejectNotes)
    if (result.error) {
      alert(result.error)
      setIsPending(false)
    } else {
      triggerNotificationRefresh()
      router.push('/admin/financials')
      router.refresh()
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="font-semibold text-gray-900 mb-4">Review Actions</h3>

      {!showRejectForm ? (
        <div className="flex items-center gap-3">
          <button
            onClick={handleApprove}
            disabled={isPending}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
            Approve Timesheet
          </button>

          <button
            onClick={() => setShowRejectForm(true)}
            disabled={isPending}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-red-300 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
          >
            <XCircle className="w-4 h-4" />
            Request Revision
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Revision Notes
            </label>
            <textarea
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              placeholder="Explain what needs to be corrected..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleReject}
              disabled={isPending || !rejectNotes.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <XCircle className="w-4 h-4" />
              )}
              Send Back for Revision
            </button>

            <button
              onClick={() => {
                setShowRejectForm(false)
                setRejectNotes('')
              }}
              disabled={isPending}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
