'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, RotateCcw, XCircle } from 'lucide-react'
import { bulkCancelEmailReminders, bulkRetryEmailReminders } from '@/app/actions/email-reminders'
import { notify } from '@/lib/notify'

type EmailReminderBulkActionsProps = {
  pendingIds: string[]
  failedIds: string[]
}

export function EmailReminderBulkActions({ pendingIds, failedIds }: EmailReminderBulkActionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleBulkCancel = () => {
    startTransition(async () => {
      const result = await bulkCancelEmailReminders(pendingIds)
      if (result.error) {
        notify.error({ title: 'Bulk cancel failed', description: result.error })
        return
      }

      notify.success({
        title: 'Pending reminders cancelled',
        description: `${result.cancelledCount} of ${result.selectedCount} selected reminders cancelled.`,
      })
      router.refresh()
    })
  }

  const handleBulkRetry = () => {
    startTransition(async () => {
      const result = await bulkRetryEmailReminders(failedIds)
      if (result.error) {
        notify.error({ title: 'Bulk retry failed', description: result.error })
        return
      }

      notify.success({
        title: 'Failed reminders re-queued',
        description: `${result.retriedCount} of ${result.selectedCount} selected reminders re-queued.`,
      })
      router.refresh()
    })
  }

  return (
    <div className="flex flex-wrap md:flex-nowrap items-center gap-2">
      <button
        type="button"
        onClick={handleBulkCancel}
        disabled={isPending || pendingIds.length === 0}
        className="inline-flex h-9 items-center gap-1 rounded border border-red-200 bg-white px-3 text-xs font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
        title={pendingIds.length === 0 ? 'No pending reminders in current filter' : `Cancel ${pendingIds.length} pending reminders`}
      >
        {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
        Cancel pending ({pendingIds.length})
      </button>

      <button
        type="button"
        onClick={handleBulkRetry}
        disabled={isPending || failedIds.length === 0}
        className="inline-flex h-9 items-center gap-1 rounded border border-amber-200 bg-white px-3 text-xs font-medium text-amber-700 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
        title={failedIds.length === 0 ? 'No failed reminders in current filter' : `Retry ${failedIds.length} failed reminders`}
      >
        {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
        Retry failed ({failedIds.length})
      </button>
    </div>
  )
}
