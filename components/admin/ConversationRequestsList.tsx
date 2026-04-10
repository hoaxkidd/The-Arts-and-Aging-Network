'use client'

import { useState, type MouseEvent } from 'react'
import { Check, X, MessageCircle, Loader2, Eye, MoreVertical, Trash2 } from 'lucide-react'
import { approveConversationRequest, deleteConversationRequest, denyConversationRequest } from '@/app/actions/conversation-requests'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { STYLES } from '@/lib/styles'
import { notify } from '@/lib/notify'
import { getRelativeTime } from '@/lib/date-utils'

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

function formatRoleLabel(role: string): string {
  return role.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase())
}

function formatDateTime(value: Date): string {
  const date = new Date(value)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const month = months[date.getUTCMonth()]
  const day = date.getUTCDate()
  const year = date.getUTCFullYear()
  const hours24 = date.getUTCHours()
  const minutes = String(date.getUTCMinutes()).padStart(2, '0')
  const ampm = hours24 >= 12 ? 'PM' : 'AM'
  const hour12 = hours24 % 12 === 0 ? 12 : hours24 % 12
  return `${month} ${day}, ${year} at ${hour12}:${minutes} ${ampm}`
}

function menuPositionFromRect(rect: DOMRect) {
  const menuWidth = 176
  const menuHeight = 184
  const left = Math.max(8, rect.right - menuWidth)
  const top = Math.max(8, Math.min(rect.bottom + 4, window.innerHeight - menuHeight - 8))
  return { top, left }
}

export function ConversationRequestsList({ requests }: Props) {
  const [processing, setProcessing] = useState<string | null>(null)
  const [selectedRequest, setSelectedRequest] = useState<ConversationRequest | null>(null)
  const [denyNote, setDenyNote] = useState('')
  const [actionMenu, setActionMenu] = useState<{ id: string; top: number; left: number } | null>(null)
  const router = useRouter()

  function openActionMenu(event: MouseEvent<HTMLButtonElement>, requestId: string) {
    const rect = event.currentTarget.getBoundingClientRect()
    const { top, left } = menuPositionFromRect(rect)
    setActionMenu((prev) => (prev?.id === requestId ? null : { id: requestId, top, left }))
  }

  async function handleApprove(requestId: string) {
    setProcessing(requestId)
    const result = await approveConversationRequest(requestId)
    if ('error' in result) {
      notify.error({ title: 'Approval failed', description: result.error })
    } else {
      notify.success({ title: 'Request approved', description: 'The requester can now message this user.' })
      if (selectedRequest?.id === requestId) {
        setSelectedRequest(null)
      }
      router.refresh()
    }
    setProcessing(null)
  }

  async function handleDeny(requestId: string) {
    setProcessing(requestId)
    const result = await denyConversationRequest(requestId, denyNote)
    if ('error' in result) {
      notify.error({ title: 'Deny failed', description: result.error })
    } else {
      if (selectedRequest?.id === requestId) {
        setSelectedRequest(null)
      }
      setDenyNote('')
      notify.success({ title: 'Request denied' })
      router.refresh()
    }
    setProcessing(null)
  }

  async function handleDelete(requestId: string) {
    setProcessing(requestId)
    const result = await deleteConversationRequest(requestId)
    if ('error' in result) {
      notify.error({ title: 'Delete failed', description: result.error })
    } else {
      if (selectedRequest?.id === requestId) {
        setSelectedRequest(null)
      }
      setDenyNote('')
      notify.success({ title: 'Request deleted', description: 'The requester was notified.' })
      router.refresh()
    }
    setProcessing(null)
  }

  if (requests.length === 0) {
    return (
      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Pending Requests</h2>
          <p className="text-sm text-gray-500">Review and action conversation starts that require admin approval.</p>
        </div>
        <div className={cn(STYLES.card, "p-0 overflow-hidden") }>
          <div className="rounded-lg border border-dashed border-gray-300 bg-gradient-to-br from-gray-50 to-white p-5 text-center">
            <div className={cn(STYLES.emptyIcon, 'mx-auto mb-2 h-12 w-12 bg-white border border-gray-200')}>
              <MessageCircle className="w-6 h-6 text-gray-400" />
            </div>
            <p className={cn(STYLES.emptyTitle, 'text-base')}>No pending requests</p>
            <p className={STYLES.emptyDescription}>New 1-on-1 conversation requests will appear here.</p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Pending Requests</h2>
          <p className="text-sm text-gray-500">Approve or deny conversation starts that require admin review.</p>
        </div>
        <span className={cn(STYLES.badge, STYLES.badgeWarning)}>{requests.length} pending</span>
      </div>

      <div className={cn(STYLES.card, 'p-0 overflow-hidden')}>
        <div className="table-scroll-wrapper max-h-[480px]">
          <table className={STYLES.table}>
            <thead className="bg-gray-50">
              <tr className={STYLES.tableHeadRow}>
                <th className={STYLES.tableHeader}>Requester</th>
                <th className={STYLES.tableHeader}>Requested</th>
                <th className={STYLES.tableHeader}>Submitted</th>
                <th className={STYLES.tableHeader}>Message</th>
                <th className={STYLES.tableHeader}>Status</th>
                <th className={cn(STYLES.tableHeader, 'text-right')}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {requests.map((request) => {
                const requesterName = request.requester.preferredName || request.requester.name || 'Unknown user'
                const requestedName = request.requested.preferredName || request.requested.name || 'Unknown user'
                return (
                  <tr
                    key={request.id}
                    className={cn(STYLES.tableRow, 'cursor-pointer')}
                    onClick={() => {
                      setSelectedRequest(request)
                      setDenyNote('')
                    }}
                  >
                    <td className={STYLES.tableCell}>
                      <div>
                        <p className="font-medium text-gray-900">{requesterName}</p>
                        <p className="text-xs text-gray-500">{formatRoleLabel(request.requester.role)}</p>
                      </div>
                    </td>
                    <td className={STYLES.tableCell}>
                      <div>
                        <p className="font-medium text-gray-900">{requestedName}</p>
                        <p className="text-xs text-gray-500">{formatRoleLabel(request.requested.role)}</p>
                      </div>
                    </td>
                    <td className={STYLES.tableCell}>
                      <p className="text-gray-800">{formatDateTime(request.createdAt)}</p>
                      <p className="text-xs text-gray-500" suppressHydrationWarning>{getRelativeTime(request.createdAt)}</p>
                    </td>
                    <td className={cn(STYLES.tableCell, 'max-w-[320px] truncate')} title={request.message || undefined}>
                      {request.message || <span className="text-gray-400">No initial message</span>}
                    </td>
                    <td className={STYLES.tableCell}>
                      <span className={cn(STYLES.badge, STYLES.badgeWarning)}>Pending</span>
                    </td>
                    <td className={cn(STYLES.tableCell, 'text-right')}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          openActionMenu(e, request.id)
                        }}
                        className={cn(STYLES.btnIcon, 'inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white hover:bg-gray-50')}
                        aria-label="Open quick actions"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {actionMenu && (
        <>
          <div className="fixed inset-0 z-[95]" onClick={() => setActionMenu(null)} />
          <div
            className="fixed z-[100] w-44 rounded-lg border border-gray-200 bg-white p-1.5 shadow-xl"
            style={{ top: actionMenu.top, left: actionMenu.left }}
          >
            <button
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
              onClick={() => {
                const request = requests.find((entry) => entry.id === actionMenu.id)
                if (request) {
                  setSelectedRequest(request)
                  setDenyNote('')
                }
                setActionMenu(null)
              }}
            >
              <Eye className="h-4 w-4" />
              View details
            </button>
            <button
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
              disabled={processing === actionMenu.id}
              onClick={() => {
                void handleApprove(actionMenu.id)
                setActionMenu(null)
              }}
            >
              <Check className="h-4 w-4" />
              Approve
            </button>
            <button
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
              disabled={processing === actionMenu.id}
              onClick={() => {
                void handleDeny(actionMenu.id)
                setActionMenu(null)
              }}
            >
              <X className="h-4 w-4" />
              Deny
            </button>
            <button
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
              disabled={processing === actionMenu.id}
              onClick={() => {
                void handleDelete(actionMenu.id)
                setActionMenu(null)
              }}
            >
              <Trash2 className="h-4 w-4" />
              Delete request
            </button>
          </div>
        </>
      )}

      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedRequest(null)} />
          <div className="relative w-full max-w-2xl rounded-xl bg-white shadow-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Conversation Request</h3>
                <p className="text-sm text-gray-500">Review details before approving or denying.</p>
              </div>
              <button
                onClick={() => setSelectedRequest(null)}
                className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-gray-200 p-3">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Requester</p>
                  <p className="text-sm font-medium text-gray-900 mt-1">
                    {selectedRequest.requester.preferredName || selectedRequest.requester.name}
                  </p>
                  <p className="text-xs text-gray-500">{formatRoleLabel(selectedRequest.requester.role)}</p>
                </div>
                <div className="rounded-lg border border-gray-200 p-3">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Requested</p>
                  <p className="text-sm font-medium text-gray-900 mt-1">
                    {selectedRequest.requested.preferredName || selectedRequest.requested.name}
                  </p>
                  <p className="text-xs text-gray-500">{formatRoleLabel(selectedRequest.requested.role)}</p>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 p-3 bg-gray-50">
                <p className="text-xs uppercase tracking-wide text-gray-500">Submitted</p>
                <p className="text-sm text-gray-800 mt-1">
                  {formatDateTime(selectedRequest.createdAt)} (<span suppressHydrationWarning>{getRelativeTime(selectedRequest.createdAt)}</span>)
                </p>
              </div>

              <div className="rounded-lg border border-gray-200 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Initial message</p>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">
                  {selectedRequest.message || 'No initial message provided.'}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Denial note (optional)</label>
                <textarea
                  value={denyNote}
                  onChange={(e) => setDenyNote(e.target.value)}
                  placeholder="Add a reason if denying this request..."
                  rows={3}
                  className={cn(STYLES.input, 'min-h-[96px] resize-y')}
                />
              </div>
            </div>

            <div className="px-5 py-4 border-t border-gray-200 bg-gray-50 flex flex-wrap items-center justify-end gap-2">
              <button
                onClick={() => setSelectedRequest(null)}
                className={cn(STYLES.btn, STYLES.btnSecondary)}
                disabled={processing === selectedRequest.id}
              >
                Close
              </button>
              <button
                onClick={() => handleDeny(selectedRequest.id)}
                disabled={processing === selectedRequest.id}
                className={cn(STYLES.btn, STYLES.btnDanger, 'min-w-[110px]')}
              >
                {processing === selectedRequest.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Deny'}
              </button>
              <button
                onClick={() => handleDelete(selectedRequest.id)}
                disabled={processing === selectedRequest.id}
                className={cn(STYLES.btn, STYLES.btnDanger, 'min-w-[110px]')}
              >
                {processing === selectedRequest.id ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </>
                )}
              </button>
              <button
                onClick={() => handleApprove(selectedRequest.id)}
                disabled={processing === selectedRequest.id}
                className={cn(STYLES.btn, 'bg-green-600 hover:bg-green-700 text-white min-w-[110px]')}
              >
                {processing === selectedRequest.id ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                  <>
                    <Check className="w-4 h-4" />
                    Approve
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
