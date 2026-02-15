'use client'

import { useState } from 'react'
import { Check, X, MessageCircle, Loader2 } from 'lucide-react'
import { approveConversationRequest, denyConversationRequest } from '@/app/actions/conversation-requests'
import { useRouter } from 'next/navigation'

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
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-500">No pending requests</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {requests.map((request) => (
        <div key={request.id} className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start gap-4">
              {/* Requester */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-white flex items-center justify-center font-semibold text-lg">
                  {(request.requester.preferredName || request.requester.name)?.[0]?.toUpperCase() || 'U'}
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {request.requester.preferredName || request.requester.name}
                  </p>
                  <p className="text-xs text-gray-500">{request.requester.role}</p>
                </div>
              </div>

              <div className="text-gray-400 mt-4">→</div>

              {/* Requested */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-white flex items-center justify-center font-semibold text-lg">
                  {(request.requested.preferredName || request.requested.name)?.[0]?.toUpperCase() || 'U'}
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {request.requested.preferredName || request.requested.name}
                  </p>
                  <p className="text-xs text-gray-500">{request.requested.role}</p>
                </div>
              </div>
            </div>

            <span className="text-xs text-gray-500">
              {new Date(request.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit'
              })}
            </span>
          </div>

          {request.message && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-700">{request.message}</p>
            </div>
          )}

          {denyingId === request.id ? (
            <div className="space-y-3">
              <textarea
                value={denyNote}
                onChange={(e) => setDenyNote(e.target.value)}
                placeholder="Reason for denial (optional)..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDeny(request.id)}
                  disabled={processing === request.id}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
                >
                  {processing === request.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Confirm Deny'
                  )}
                </button>
                <button
                  onClick={() => {
                    setDenyingId(null)
                    setDenyNote('')
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleApprove(request.id)}
                disabled={processing === request.id}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
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
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
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
