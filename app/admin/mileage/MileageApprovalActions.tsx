'use client'

import { useState } from 'react'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { approveMileageEntry, rejectMileageEntry } from '@/app/actions/mileage'
import { useRouter } from 'next/navigation'

type Props = {
  entryId: string
}

export function MileageApprovalActions({ entryId }: Props) {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)
  const [showRejectInput, setShowRejectInput] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  async function handleApprove() {
    setIsPending(true)
    const result = await approveMileageEntry(entryId)
    if (result.error) {
      alert(result.error)
    } else {
      router.refresh()
    }
    setIsPending(false)
  }

  async function handleReject() {
    if (!rejectReason.trim()) {
      alert('Please provide a reason for rejection')
      return
    }
    setIsPending(true)
    const result = await rejectMileageEntry(entryId, rejectReason)
    if (result.error) {
      alert(result.error)
    } else {
      router.refresh()
    }
    setIsPending(false)
  }

  if (showRejectInput) {
    return (
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="Reason..."
          className="w-32 px-2 py-1 text-sm border border-gray-300 rounded"
          autoFocus
        />
        <button
          onClick={handleReject}
          disabled={isPending}
          className="p-1.5 text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
          title="Confirm Reject"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
        </button>
        <button
          onClick={() => {
            setShowRejectInput(false)
            setRejectReason('')
          }}
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleApprove}
        disabled={isPending}
        className="p-1.5 text-green-600 hover:bg-green-50 rounded disabled:opacity-50 transition-colors"
        title="Approve"
      >
        {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
      </button>
      <button
        onClick={() => setShowRejectInput(true)}
        disabled={isPending}
        className="p-1.5 text-red-600 hover:bg-red-50 rounded disabled:opacity-50 transition-colors"
        title="Reject"
      >
        <XCircle className="w-5 h-5" />
      </button>
    </div>
  )
}
