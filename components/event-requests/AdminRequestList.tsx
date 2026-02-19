'use client'

import { useState, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Calendar,
  Building2,
  Search,
  CheckCircle,
  XCircle,
  Loader2,
  Eye,
  FileText
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { STYLES } from '@/lib/styles'
import { approveEventRequest, rejectEventRequest } from '@/app/actions/event-requests'
import { triggerNotificationRefresh } from '@/lib/notification-refresh'

type Request = {
  id: string
  type: 'REQUEST_EXISTING' | 'CREATE_CUSTOM'
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  requestedAt: string
  rejectionReason: string | null
  notes: string | null
  customTitle: string | null
  customDescription: string | null
  customStartDateTime: string | null
  customLocationName: string | null
  expectedAttendees: number | null
  existingEvent: { id: string; title: string; startDateTime: string; location: { name: string } | null } | null
  approvedEvent: { id: string; title: string } | null
  geriatricHome: { id: string; name: string }
  formSubmission?: { id: string; formData: string; template: { title: string } } | null
}

function RejectModal({
  isOpen,
  onClose,
  onConfirm,
  isPending,
  requestTitle
}: {
  isOpen: boolean
  onClose: () => void
  onConfirm: (reason: string) => void
  isPending: boolean
  requestTitle: string
}) {
  const [reason, setReason] = useState('')
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h3 className="font-semibold text-gray-900 mb-2">Decline Request</h3>
        <p className="text-sm text-gray-600 mb-4">Reason for declining "{requestTitle}"</p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className={cn(STYLES.input, "h-24 resize-none")}
          placeholder="Enter reason..."
          autoFocus
        />
        <div className="flex gap-3 mt-4">
          <button onClick={onClose} disabled={isPending} className={cn(STYLES.btn, STYLES.btnSecondary, "flex-1")}>
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={isPending || !reason.trim()}
            className={cn(STYLES.btn, STYLES.btnDanger, "flex-1 flex items-center justify-center gap-2")}
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
            Decline
          </button>
        </div>
      </div>
    </div>
  )
}

export function AdminRequestList({ requests }: { requests: Request[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [actionId, setActionId] = useState<string | null>(null)
  const [rejectingRequest, setRejectingRequest] = useState<Request | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING')

  const filtered = useMemo(() => {
    return requests.filter(req => {
      const title = req.type === 'CREATE_CUSTOM' ? req.customTitle : req.existingEvent?.title
      const matchSearch = !searchQuery ||
        title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.geriatricHome.name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchStatus = filterStatus === 'ALL' || req.status === filterStatus
      return matchSearch && matchStatus
    })
  }, [requests, searchQuery, filterStatus])

  const handleApprove = (requestId: string) => {
    setActionId(requestId)
    startTransition(async () => {
      const result = await approveEventRequest(requestId)
      if (result.error) alert(result.error)
      else triggerNotificationRefresh()
      router.refresh()
      setActionId(null)
    })
  }

  const handleReject = (reason: string) => {
    if (!rejectingRequest) return
    setActionId(rejectingRequest.id)
    startTransition(async () => {
      const result = await rejectEventRequest(rejectingRequest.id, reason)
      if (result.error) alert(result.error)
      else triggerNotificationRefresh()
      setRejectingRequest(null)
      router.refresh()
      setActionId(null)
    })
  }

  const isDetailView = requests.length === 1
  const req = filtered[0]

  // Detail view: single request, full info
  if (isDetailView && req) {
    const isCustom = req.type === 'CREATE_CUSTOM'
    const title = isCustom ? req.customTitle : req.existingEvent?.title
    const date = isCustom ? req.customStartDateTime : req.existingEvent?.startDateTime
    const location = isCustom ? req.customLocationName : req.existingEvent?.location?.name

    return (
      <div className="space-y-4">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <span className={cn(
              "px-2 py-0.5 rounded text-xs font-medium",
              req.status === 'PENDING' && "bg-yellow-100 text-yellow-700",
              req.status === 'APPROVED' && "bg-green-100 text-green-700",
              req.status === 'REJECTED' && "bg-red-100 text-red-700"
            )}>
              {req.status}
            </span>
            <span className="text-xs text-gray-500">{new Date(req.requestedAt).toLocaleDateString()}</span>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                <Building2 className="w-4 h-4" />
                <Link href={`/admin/homes/${req.geriatricHome.id}`} className="hover:text-primary-600">{req.geriatricHome.name}</Link>
              </div>
              <h3 className="font-semibold text-gray-900">{title}</h3>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-gray-600">
                {date && <span>{new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>}
                {location && <span>{location}</span>}
                {req.expectedAttendees != null && <span>{req.expectedAttendees} expected</span>}
              </div>
            </div>
            {req.notes && (
              <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                <span className="font-medium">Note: </span>{req.notes}
              </div>
            )}
            {req.formSubmission && (
              <div className="text-sm bg-primary-50/50 border border-primary-100 rounded-lg p-3">
                <div className="flex items-center gap-2 font-medium text-gray-900 mb-2">
                  <FileText className="w-4 h-4 text-primary-600" />
                  {req.formSubmission.template.title}
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {(() => {
                    try {
                      const data = JSON.parse(req.formSubmission.formData) as Record<string, unknown>
                      return Object.entries(data)
                        .filter(([, val]) => val !== undefined && val !== null && val !== '')
                        .map(([key, val]) => {
                          const raw = Array.isArray(val) ? val.join(', ')
                            : typeof val === 'object' && val !== null && '_value' in val
                              ? String((val as Record<string, unknown>)._value) +
                                ((val as Record<string, unknown>)._other ? ` (Other: ${(val as Record<string, unknown>)._other})` : '')
                              : typeof val === 'object' && val !== null && '_options' in val
                                ? ((val as Record<string, unknown>)._options as string[])?.join(', ') +
                                  ((val as Record<string, unknown>)._other ? ` (Other: ${(val as Record<string, unknown>)._other})` : '')
                                : String(val)
                          const display = raw.startsWith('data:') ? '(file uploaded)' : raw
                          return (
                            <div key={key} className="flex gap-2">
                              <span className="text-gray-500 shrink-0">{key}:</span>
                              <span className="text-gray-900 break-words">{display}</span>
                            </div>
                          )
                        })
                    } catch {
                      return <span className="text-gray-500">Unable to parse form data</span>
                    }
                  })()}
                </div>
              </div>
            )}
            {isCustom && req.customDescription && (
              <div className="text-sm text-gray-600">
                <span className="font-medium">Description: </span>{req.customDescription}
              </div>
            )}
            {req.status === 'REJECTED' && req.rejectionReason && (
              <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 rounded-lg p-3">
                {req.rejectionReason}
              </div>
            )}
            <div className="flex gap-2 pt-2">
              {req.status === 'PENDING' && (
                <>
                  <button
                    onClick={() => handleApprove(req.id)}
                    disabled={isPending && actionId === req.id}
                    className={cn(STYLES.btn, "bg-green-600 text-white hover:bg-green-700 flex items-center gap-2")}
                  >
                    {isPending && actionId === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    Approve
                  </button>
                  <button
                    onClick={() => setRejectingRequest(req)}
                    disabled={isPending}
                    className={cn(STYLES.btn, "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100")}
                  >
                    <XCircle className="w-4 h-4" /> Decline
                  </button>
                </>
              )}
              {req.status === 'APPROVED' && req.approvedEvent && (
                <Link href={`/events/${req.approvedEvent.id}`} className={cn(STYLES.btn, STYLES.btnSecondary, "flex items-center gap-2")}>
                  <Eye className="w-4 h-4" /> View Event
                </Link>
              )}
            </div>
          </div>
        </div>
        <RejectModal
          isOpen={!!rejectingRequest}
          onClose={() => setRejectingRequest(null)}
          onConfirm={handleReject}
          isPending={isPending}
          requestTitle={isCustom ? req.customTitle || '' : req.existingEvent?.title || ''}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters - compact */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by event or home..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(STYLES.input, "pl-9")}
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium",
                filterStatus === s
                  ? s === 'PENDING' ? "bg-yellow-500 text-white" :
                    s === 'APPROVED' ? "bg-green-500 text-white" :
                    s === 'REJECTED' ? "bg-red-500 text-white" : "bg-primary-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      <p className="text-sm text-gray-500">
        {filtered.length} request{filtered.length !== 1 ? 's' : ''}
      </p>

      {/* Table */}
      {filtered.length > 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="table-scroll-wrapper max-h-[calc(100vh-360px)]">
            <table className={STYLES.table}>
              <thead className="bg-gray-50">
                <tr>
                  <th className={STYLES.tableHeader}>Home</th>
                  <th className={STYLES.tableHeader}>Event / Title</th>
                  <th className={STYLES.tableHeader}>Type</th>
                  <th className={STYLES.tableHeader}>Date</th>
                  <th className={STYLES.tableHeader}>Status</th>
                  <th className={cn(STYLES.tableHeader, "text-right")}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((req) => {
                  const isCustom = req.type === 'CREATE_CUSTOM'
                  const title = isCustom ? req.customTitle : req.existingEvent?.title
                  const date = isCustom ? req.customStartDateTime : req.existingEvent?.startDateTime
                  const loading = isPending && actionId === req.id
                  return (
                    <tr key={req.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/homes/${req.geriatricHome.id}`}
                          className="flex items-center gap-2 text-sm font-medium text-gray-900 hover:text-primary-600"
                        >
                          <Building2 className="w-3.5 h-3.5 text-gray-400" />
                          {req.geriatricHome.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/event-requests/${req.id}`}
                          className="font-medium text-primary-600 hover:underline"
                        >
                          {title}
                        </Link>
                        {req.formSubmission && (
                          <div className="flex items-center gap-1 mt-0.5 text-xs text-gray-500">
                            <FileText className="w-3 h-3" />
                            {req.formSubmission.template.title}
                          </div>
                        )}
                        {req.notes && (
                          <p className="text-xs text-gray-500 mt-0.5 truncate max-w-xs" title={req.notes}>{req.notes}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium text-gray-600">
                          {isCustom ? 'Custom' : 'Existing'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {date ? (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                            {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "inline-flex px-2 py-0.5 rounded text-xs font-medium",
                          req.status === 'PENDING' && "bg-yellow-100 text-yellow-700",
                          req.status === 'APPROVED' && "bg-green-100 text-green-700",
                          req.status === 'REJECTED' && "bg-red-100 text-red-700"
                        )}>
                          {req.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {req.status === 'PENDING' && (
                            <>
                              <button
                                onClick={() => handleApprove(req.id)}
                                disabled={loading}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg disabled:opacity-50"
                                title="Approve"
                              >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                              </button>
                              <button
                                onClick={() => setRejectingRequest(req)}
                                disabled={loading}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                                title="Decline"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {req.status === 'APPROVED' && req.approvedEvent && (
                            <Link
                              href={`/events/${req.approvedEvent.id}`}
                              className="p-2 text-gray-500 hover:text-primary-600 hover:bg-gray-100 rounded-lg"
                              title="View Event"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-500">
            {searchQuery || filterStatus !== 'ALL'
              ? "No matching requests. Try different filters."
              : "No event requests to review."}
          </p>
        </div>
      )}

      <RejectModal
        isOpen={!!rejectingRequest}
        onClose={() => setRejectingRequest(null)}
        onConfirm={handleReject}
        isPending={isPending}
        requestTitle={
          rejectingRequest?.type === 'CREATE_CUSTOM'
            ? rejectingRequest?.customTitle || ''
            : rejectingRequest?.existingEvent?.title || ''
        }
      />
    </div>
  )
}
