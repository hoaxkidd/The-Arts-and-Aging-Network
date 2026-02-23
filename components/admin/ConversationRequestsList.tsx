'use client'

import { useState } from 'react'
import { Check, X, MessageCircle, Loader2, XCircle } from 'lucide-react'
import { approveConversationRequest, denyConversationRequest } from '@/app/actions/conversation-requests'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { STYLES } from '@/lib/styles'

type ConversationRequest = {
  id: string
  message: string | null
  createdAt: Date
  requester: {
    id: string
    name: string | null
    preferredName: string | null
    image: string | null
    role: string
  }
  requested: {
    id: string
    name: string | null
    preferredName: string | null
    image: string | null
    role: string
  }
}

type Props = {
  requests: ConversationRequest[]
}

export function ConversationRequestsList({ requests }: Props) {
  const [processing, setProcessing] = useState<string | null>(null)
  const [denyingId, setDenyingId] = useState<string | null>(null)
  const [denyNote, setDenyNote] = useState('')
  const router = useRouter()

  async function handleApprove(requestId: string) {
    setProcessing(requestId)
    const result = await approveConversationRequest(requestId)
    if ('error' in result) {
      alert(result.error)
    } else {
      router.refresh()
    }
    setProcessing(null)
  }

  async function handleDeny(requestId: string) {
    setProcessing(requestId)
    const result = await denyConversationRequest(requestId, denyNote)
    if ('error' in result) {
      alert(result.error)
    } else {
      setDenyingId(null)
      setDenyNote('')
      router.refresh()
    }
    setProcessing(null)
  }

  if (requests.length === 0) {
    return (
      <div className={cn(STYLES.card, "p-12 text-center")}>
        <div className={STYLES.emptyIcon}>
          <MessageCircle className="w-10 h-10 text-gray-300" />
        </div>
        <p className={STYLES.emptyTitle}>No pending requests</p>
        <p className={STYLES.emptyDescription}>1-on-1 conversation requests will appear here</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {requests.map((request) => (
        <div key={request.id} className={cn(STYLES.card, "p-5 sm:p-6")}>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex flex-wrap items-start gap-4 min-w-0">
              {/* Requester */}
              <div className="flex items-center gap-3">
                {request.requester.image ? (
                  <img src={request.requester.image} alt="" className="w-12 h-12 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-white flex items-center justify-center font-semibold text-lg shrink-0">
                    {(request.requester.preferredName || request.requester.name)?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
                <div>
                  <p className="font-medium text-gray-900">
                    {request.requester.preferredName || request.requester.name}
                  </p>
                  <p className="text-xs text-gray-500">{request.requester.role}</p>
                </div>
              </div>

              <div className="hidden sm:block text-gray-400 self-center">→</div>

              {/* Requested */}
              <div className="flex items-center gap-3">
                {request.requested.image ? (
                  <img src={request.requested.image} alt="" className="w-12 h-12 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-white flex items-center justify-center font-semibold text-lg shrink-0">
                    {(request.requested.preferredName || request.requested.name)?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
                <div>
                  <p className="font-medium text-gray-900">
                    {request.requested.preferredName || request.requested.name}
                  </p>
                  <p className="text-xs text-gray-500">{request.requested.role}</p>
                </div>
              </div>
            </div>

            <span className="text-xs text-gray-500 shrink-0">
              {new Date(request.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit'
              })}
            </span>
          </div>

          {request.message && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-700">{request.message}</p>
            </div>
          )}

          {denyingId === request.id ? (
            <div className="mt-4 space-y-3">
              <textarea
                value={denyNote}
                onChange={(e) => setDenyNote(e.target.value)}
                placeholder="Reason for denial (optional)..."
                rows={2}
                className={cn(STYLES.input, "min-h-[80px] resize-none")}
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDeny(request.id)}
                  disabled={processing === request.id}
                  className={cn(STYLES.btn, STYLES.btnDanger, "flex items-center gap-2")}
                >
                  {processing === request.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <XCircle className="w-4 h-4" />
                      Confirm Deny
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setDenyingId(null)
                    setDenyNote('')
                  }}
                  className={cn(STYLES.btn, STYLES.btnSecondary)}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleApprove(request.id)}
                disabled={processing === request.id}
                className={cn(STYLES.btn, "bg-green-600 hover:bg-green-700 text-white flex items-center gap-2 disabled:opacity-50")}
              >
                {processing === request.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Approve
                  </>
                )}
              </button>
              <button
                onClick={() => setDenyingId(request.id)}
                disabled={processing === request.id}
                className={cn(STYLES.btn, STYLES.btnDanger, "flex items-center gap-2 disabled:opacity-50")}
              >
                <X className="w-4 h-4" />
                Deny
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
