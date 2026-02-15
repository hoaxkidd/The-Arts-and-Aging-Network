'use client'

import { useState, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Calendar,
  Clock,
  MapPin,
  Building2,
  Search,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  Users,
  Eye,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { STYLES } from '@/lib/styles'
import { approveEventRequest, rejectEventRequest } from '@/app/actions/event-requests'

type Request = {
  id: string
  type: 'REQUEST_EXISTING' | 'CREATE_CUSTOM'
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  requestedAt: string
  reviewedAt: string | null
  rejectionReason: string | null
  notes: string | null
  expectedAttendees: number | null
  customTitle: string | null
  customDescription: string | null
  customStartDateTime: string | null
  customEndDateTime: string | null
  customLocationName: string | null
  customLocationAddress: string | null
  geriatricHome: {
    id: string
    name: string
    address: string
  }
  existingEvent: {
    id: string
    title: string
    startDateTime: string
    endDateTime: string
    location: { name: string } | null
  } | null
  approvedEvent: {
    id: string
    title: string
  } | null
}

const statusStyles = {
  PENDING: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  APPROVED: 'bg-green-100 text-green-700 border-green-200',
  REJECTED: 'bg-red-100 text-red-700 border-red-200'
}

// Rejection Modal
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
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-6">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-6 h-6 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
            Decline Request
          </h3>
          <p className="text-sm text-gray-600 text-center mb-4">
            Please provide a reason for declining "{requestTitle}".
          </p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className={cn(STYLES.input, "h-24 resize-none")}
            placeholder="Enter reason for declining..."
            autoFocus
          />
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={onClose}
              disabled={isPending}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm(reason)}
              disabled={isPending || !reason.trim()}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <XCircle className="w-4 h-4" />
              )}
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
  const [filterType, setFilterType] = useState<'ALL' | 'REQUEST_EXISTING' | 'CREATE_CUSTOM'>('ALL')

  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      const title = req.type === 'CREATE_CUSTOM' ? req.customTitle : req.existingEvent?.title
      const matchesSearch = !searchQuery ||
        title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.geriatricHome.name.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesStatus = filterStatus === 'ALL' || req.status === filterStatus
      const matchesType = filterType === 'ALL' || req.type === filterType

      return matchesSearch && matchesStatus && matchesType
    })
  }, [requests, searchQuery, filterStatus, filterType])

  const handleApprove = (requestId: string) => {
    setActionId(requestId)
    startTransition(async () => {
      const result = await approveEventRequest(requestId)
      if (result.error) {
        alert(result.error)
      }
      router.refresh()
      setActionId(null)
    })
  }

  const handleReject = (reason: string) => {
    if (!rejectingRequest) return

    setActionId(rejectingRequest.id)
    startTransition(async () => {
      const result = await rejectEventRequest(rejectingRequest.id, reason)
      if (result.error) {
        alert(result.error)
      }
      setRejectingRequest(null)
      router.refresh()
      setActionId(null)
    })
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by event or home..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(STYLES.input, "pl-10")}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={cn(
                  "px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  filterStatus === status
                    ? status === 'PENDING' ? "bg-yellow-500 text-white" :
                      status === 'APPROVED' ? "bg-green-500 text-white" :
                      status === 'REJECTED' ? "bg-red-500 text-white" :
                      "bg-primary-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
              >
                {status === 'ALL' ? 'All' : status.charAt(0) + status.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <span className="text-sm text-gray-500 py-1">Type:</span>
          {(['ALL', 'REQUEST_EXISTING', 'CREATE_CUSTOM'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={cn(
                "px-3 py-1 rounded text-xs font-medium transition-colors",
                filterType === type
                  ? "bg-gray-800 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              {type === 'ALL' ? 'All' : type === 'REQUEST_EXISTING' ? 'Existing' : 'Custom'}
            </button>
          ))}
        </div>
      </div>

      {/* Count */}
      <p className="text-sm text-gray-500">
        Showing {filteredRequests.length} request{filteredRequests.length !== 1 ? 's' : ''}
      </p>

      {/* Request Cards */}
      {filteredRequests.length > 0 ? (
        <div className="space-y-4">
          {filteredRequests.map((request) => {
            const isCustom = request.type === 'CREATE_CUSTOM'
            const title = isCustom ? request.customTitle : request.existingEvent?.title
            const eventDate = isCustom
              ? request.customStartDateTime
              : request.existingEvent?.startDateTime
            const location = isCustom
              ? request.customLocationName
              : request.existingEvent?.location?.name
            const isLoading = isPending && actionId === request.id

            return (
              <div
                key={request.id}
                className={cn(
                  "bg-white rounded-lg border overflow-hidden",
                  request.status === 'PENDING' ? "border-yellow-300 shadow-sm" : "border-gray-200"
                )}
              >
                {/* Header */}
                <div className={cn(
                  "px-5 py-3 flex items-center justify-between",
                  request.status === 'PENDING' ? "bg-yellow-50" : "bg-gray-50"
                )}>
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "px-2 py-0.5 rounded border text-xs font-medium",
                      statusStyles[request.status]
                    )}>
                      {request.status}
                    </span>
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-medium">
                      {isCustom ? 'Custom Event' : 'Existing Event'}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(request.requestedAt).toLocaleDateString()}
                  </span>
                </div>

                {/* Body */}
                <div className="p-5">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Home Info */}
                      <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                        <Building2 className="w-4 h-4" />
                        <Link
                          href={`/admin/homes/${request.geriatricHome.id}`}
                          className="hover:text-primary-600 hover:underline"
                        >
                          {request.geriatricHome.name}
                        </Link>
                      </div>

                      {/* Title */}
                      <h3 className="font-semibold text-gray-900 text-lg">{title}</h3>

                      {/* Details */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-gray-500">
                        {eventDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(eventDate).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </span>
                        )}
                        {location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {location}
                          </span>
                        )}
                        {request.expectedAttendees && (
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {request.expectedAttendees} expected
                          </span>
                        )}
                      </div>

                      {/* Notes */}
                      {request.notes && (
                        <div className="mt-3 text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                          <span className="font-medium">Note: </span>
                          {request.notes}
                        </div>
                      )}

                      {/* Custom Event Description */}
                      {isCustom && request.customDescription && (
                        <div className="mt-3 text-sm text-gray-600">
                          <span className="font-medium">Description: </span>
                          {request.customDescription}
                        </div>
                      )}

                      {/* Rejection Reason */}
                      {request.status === 'REJECTED' && request.rejectionReason && (
                        <div className="mt-3 flex items-start gap-2 text-sm text-red-600 bg-red-50 rounded-lg p-3">
                          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="font-medium">Declined: </span>
                            {request.rejectionReason}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex lg:flex-col gap-2">
                      {request.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => handleApprove(request.id)}
                            disabled={isLoading}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                          >
                            {isLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <CheckCircle className="w-4 h-4" />
                            )}
                            Approve
                          </button>
                          <button
                            onClick={() => setRejectingRequest(request)}
                            disabled={isLoading}
                            className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg font-medium hover:bg-red-100 disabled:opacity-50 flex items-center gap-2"
                          >
                            <XCircle className="w-4 h-4" />
                            Decline
                          </button>
                        </>
                      )}
                      {request.status === 'APPROVED' && request.approvedEvent && (
                        <Link
                          href={`/events/${request.approvedEvent.id}`}
                          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 flex items-center gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          View Event
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-6 h-6 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Requests Found</h3>
          <p className="text-gray-500">
            {searchQuery || filterStatus !== 'ALL' || filterType !== 'ALL'
              ? "Try adjusting your filters."
              : "There are no event requests to review."}
          </p>
        </div>
      )}

      {/* Reject Modal */}
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
