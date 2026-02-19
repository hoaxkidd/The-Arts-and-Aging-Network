'use client'

import { useState, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Building2,
  Search,
  CheckCircle,
  XCircle,
  Loader2,
  Eye,
  FileText,
  X
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
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div className="relative bg-white rounded-xl border border-gray-200 shadow-xl w-full max-w-md overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 bg-gray-50/80">
          <h3 className="font-semibold text-gray-900">Decline request</h3>
          <p className="text-sm text-gray-500 mt-0.5">Reason for declining &quot;{requestTitle}&quot;</p>
        </div>
        <div className="p-5 space-y-4">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className={cn(STYLES.input, "min-h-[100px] resize-none")}
            placeholder="Enter reason..."
            autoFocus
          />
          <div className="flex gap-3 pt-1">
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

  const hasActiveFilters = searchQuery !== '' || filterStatus !== 'ALL'
  const clearFilters = () => {
    setSearchQuery('')
    setFilterStatus('PENDING')
  }

  return (
    <div className="space-y-4">
      {/* Search and filters - same pattern as User Management */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by event or home..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(STYLES.input, "pl-10")}
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
          className={cn(STYLES.input, STYLES.select, "w-full sm:w-40")}
        >
          <option value="ALL">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
            Clear
          </button>
        )}
      </div>

      <div className="text-sm text-gray-600">
        Showing {filtered.length} of {requests.length} request{requests.length !== 1 ? 's' : ''}
      </div>

      {/* Table - single card like User Management */}
      <div className={cn(STYLES.card, "overflow-hidden p-0")}>
        <div className={cn("table-scroll-wrapper", "max-h-[calc(100vh-320px)]")}>
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
            <tbody className="bg-white divide-y divide-gray-200">
              {filtered.map((req) => {
                const isCustom = req.type === 'CREATE_CUSTOM'
                const title = isCustom ? req.customTitle : req.existingEvent?.title
                const date = isCustom ? req.customStartDateTime : req.existingEvent?.startDateTime
                const loading = isPending && actionId === req.id
                return (
                  <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <Link
                        href={`/admin/homes/${req.geriatricHome.id}`}
                        className="flex items-center gap-2 text-sm font-medium text-gray-900 hover:text-primary-600"
                      >
                        <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        {req.geriatricHome.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <Link href={`/admin/event-requests/${req.id}`} className="font-medium text-primary-600 hover:underline">
                        {title}
                      </Link>
                      {req.formSubmission && (
                        <div className="flex items-center gap-1 mt-0.5 text-xs text-gray-500">
                          <FileText className="w-3 h-3" /> {req.formSubmission.template.title}
                        </div>
                      )}
                      {req.notes && <p className="text-xs text-gray-500 mt-0.5 truncate max-w-xs" title={req.notes}>{req.notes}</p>}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{isCustom ? 'Custom' : 'Existing'}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {date ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-3 py-1 inline-flex text-xs font-semibold rounded-full border",
                        req.status === 'PENDING' && "bg-amber-100 text-amber-800 border-amber-200",
                        req.status === 'APPROVED' && "bg-green-100 text-green-800 border-green-200",
                        req.status === 'REJECTED' && "bg-red-100 text-red-800 border-red-200"
                      )}>
                        {req.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/event-requests/${req.id}`}
                          className="text-primary-600 hover:text-primary-900 inline-flex items-center gap-1 hover:bg-primary-50 px-2 py-1 rounded"
                        >
                          <Eye className="w-4 h-4" /> View
                        </Link>
                        {req.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleApprove(req.id)}
                              disabled={loading}
                              className="text-green-600 hover:bg-green-50 inline-flex items-center gap-1 px-2 py-1 rounded disabled:opacity-50"
                              title="Approve"
                            >
                              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => setRejectingRequest(req)}
                              disabled={loading}
                              className="text-red-600 hover:bg-red-50 inline-flex items-center gap-1 px-2 py-1 rounded disabled:opacity-50"
                              title="Decline"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {req.status === 'APPROVED' && req.approvedEvent && (
                          <Link href={`/events/${req.approvedEvent.id}`} className="text-gray-500 hover:text-primary-600 hover:bg-gray-100 inline-flex items-center gap-1 px-2 py-1 rounded">
                            <Eye className="w-4 h-4" /> Event
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    {searchQuery || filterStatus !== 'ALL' ? 'No requests match your filters.' : 'No event requests to review.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

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
