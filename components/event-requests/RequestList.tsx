'use client'

import { useState, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Calendar,
  Clock,
  MapPin,
  Search,
  X,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  ExternalLink
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { STYLES } from '@/lib/styles'
import { cancelEventRequest } from '@/app/actions/event-requests'

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
    startDateTime: string
    location: { name: string } | null
  } | null
}

const statusStyles = {
  PENDING: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  APPROVED: 'bg-green-100 text-green-700 border-green-200',
  REJECTED: 'bg-red-100 text-red-700 border-red-200'
}

const statusIcons = {
  PENDING: Clock,
  APPROVED: CheckCircle,
  REJECTED: XCircle
}

export function RequestList({
  requests,
  userRole
}: {
  requests: Request[]
  userRole: 'HOME_ADMIN' | 'ADMIN'
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL')

  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      const title = req.type === 'CREATE_CUSTOM'
        ? req.customTitle
        : req.existingEvent?.title
      const matchesSearch = !searchQuery ||
        title?.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesFilter = filterStatus === 'ALL' || req.status === filterStatus

      return matchesSearch && matchesFilter
    })
  }, [requests, searchQuery, filterStatus])

  const handleCancel = (requestId: string) => {
    if (!confirm('Are you sure you want to cancel this request?')) return

    setCancellingId(requestId)
    startTransition(async () => {
      const result = await cancelEventRequest(requestId)
      if (result.error) {
        alert(result.error)
      }
      router.refresh()
      setCancellingId(null)
    })
  }

  return (
    <div className="space-y-3">
      {/* Compact Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-3">
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search requests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(STYLES.input, "pl-10 py-2")}
            />
          </div>
          <div className="flex gap-1">
            {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                  filterStatus === status
                    ? "bg-primary-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
              >
                {status === 'ALL' ? 'All' : status.charAt(0) + status.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Compact Request Cards */}
      {filteredRequests.length > 0 ? (
        <div className="space-y-2">
          {filteredRequests.map((request) => {
            const StatusIcon = statusIcons[request.status]
            const isCustom = request.type === 'CREATE_CUSTOM'
            const title = isCustom ? request.customTitle : request.existingEvent?.title
            const eventDate = isCustom
              ? request.customStartDateTime
              : request.existingEvent?.startDateTime
            const location = isCustom
              ? request.customLocationName
              : request.existingEvent?.location?.name
            const isCancelling = isPending && cancellingId === request.id

            return (
              <div
                key={request.id}
                className={cn(
                  "bg-white rounded-lg border overflow-hidden",
                  request.status === 'PENDING' ? "border-yellow-200" :
                  request.status === 'APPROVED' ? "border-green-200" :
                  "border-gray-200"
                )}
              >
                <div className="p-3 flex items-center gap-3">
                  {/* Date Badge */}
                  {eventDate && (
                    <div className={cn(
                      "flex-shrink-0 w-11 h-11 rounded-lg flex flex-col items-center justify-center",
                      request.status === 'PENDING' ? "bg-yellow-50 text-yellow-700" :
                      request.status === 'APPROVED' ? "bg-green-50 text-green-700" :
                      "bg-gray-100 text-gray-600"
                    )}>
                      <span className="text-[10px] font-medium uppercase leading-none">
                        {new Date(eventDate).toLocaleDateString('en-US', { month: 'short' })}
                      </span>
                      <span className="text-base font-bold leading-none">
                        {new Date(eventDate).getDate()}
                      </span>
                    </div>
                  )}

                  {/* Request Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={cn(
                        "px-1.5 py-0.5 rounded text-[10px] font-medium flex items-center gap-0.5 border",
                        statusStyles[request.status]
                      )}>
                        <StatusIcon className="w-2.5 h-2.5" />
                        {request.status}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {isCustom ? 'Custom' : 'Existing'}
                      </span>
                    </div>
                    <h3 className="font-medium text-gray-900 text-sm truncate">{title}</h3>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                      {location && (
                        <span className="flex items-center gap-1 truncate">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{location}</span>
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(request.requestedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {request.status === 'PENDING' && userRole === 'HOME_ADMIN' && (
                      <button
                        onClick={() => handleCancel(request.id)}
                        disabled={isCancelling}
                        className="px-2 py-1 text-[10px] text-red-600 hover:bg-red-50 rounded flex items-center gap-1 disabled:opacity-50"
                      >
                        {isCancelling ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <X className="w-3 h-3" />
                        )}
                        Cancel
                      </button>
                    )}
                    {request.status === 'APPROVED' && (
                      <Link
                        href={`/dashboard/my-events/${request.approvedEvent?.id || request.existingEvent?.id}`}
                        className="px-2 py-1 text-[10px] text-primary-600 hover:bg-primary-50 rounded flex items-center gap-1"
                      >
                        View <ExternalLink className="w-2.5 h-2.5" />
                      </Link>
                    )}
                  </div>
                </div>

                {/* Rejection Reason */}
                {request.status === 'REJECTED' && request.rejectionReason && (
                  <div className="px-3 pb-3">
                    <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 rounded p-2">
                      <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <p>{request.rejectionReason}</p>
                    </div>
                  </div>
                )}

                {/* Notes */}
                {request.notes && request.status !== 'REJECTED' && (
                  <div className="px-3 pb-3">
                    <p className="text-xs text-gray-500 bg-gray-50 rounded p-2">
                      Note: {request.notes}
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Calendar className="w-5 h-5 text-gray-400" />
          </div>
          <h3 className="text-sm font-medium text-gray-900 mb-1">No Requests Found</h3>
          <p className="text-xs text-gray-500 mb-3">
            {searchQuery || filterStatus !== 'ALL'
              ? "Try adjusting your search or filter."
              : "You haven't submitted any event requests yet."}
          </p>
          {userRole === 'HOME_ADMIN' && (
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Link
                href="/dashboard/events"
                className={cn(STYLES.btn, "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm py-2")}
              >
                Browse Events
              </Link>
              <Link
                href="/dashboard/requests/new"
                className={cn(STYLES.btn, STYLES.btnPrimary, "text-sm py-2")}
              >
                Create Request
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
