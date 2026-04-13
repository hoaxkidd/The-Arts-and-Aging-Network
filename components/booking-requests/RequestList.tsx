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
  ExternalLink,
  Pencil
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { STYLES } from '@/lib/styles'
import { cancelEventRequest } from '@/app/actions/booking-requests'

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
  editAccessGranted?: boolean
}

const statusStyles = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700'
}

export function RequestList({
  requests,
  userRole,
  activeFilter = 'ALL'
}: {
  requests: Request[]
  userRole: 'HOME_ADMIN' | 'ADMIN'
  activeFilter?: 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      const title = req.type === 'CREATE_CUSTOM'
        ? req.customTitle
        : req.existingEvent?.title
      const matchesSearch = !searchQuery ||
        title?.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesFilter = activeFilter === 'ALL' || req.status === activeFilter

      return matchesSearch && matchesFilter
    })
  }, [requests, searchQuery, activeFilter])

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

  // Mobile card view
  const MobileCardView = () => (
    <div className="md:hidden space-y-2">
      {filteredRequests.length > 0 ? (
        filteredRequests.map((request) => {
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
              className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className={cn(
                  "px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1",
                  statusStyles[request.status]
                )}>
                  {request.status === 'PENDING' && <Clock className="w-3 h-3" />}
                  {request.status === 'APPROVED' && <CheckCircle className="w-3 h-3" />}
                  {request.status === 'REJECTED' && <XCircle className="w-3 h-3" />}
                  {request.status}
                </span>
                <span className="text-[10px] text-gray-400">
                  {isCustom ? 'Custom' : 'Existing'}
                </span>
              </div>
              <h3 className="font-medium text-gray-900 text-sm mb-1">{title}</h3>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                {location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {location}
                  </span>
                )}
                {eventDate && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(eventDate).toLocaleDateString()}
                  </span>
                )}
              </div>
              {request.status === 'REJECTED' && request.rejectionReason && (
                <div className="mt-2 text-xs text-red-600 bg-red-50 rounded p-2">
                  {request.rejectionReason}
                </div>
              )}
              <div className="flex items-center gap-2 mt-2">
                {(request.type === 'CREATE_CUSTOM' && (request.status === 'PENDING' || (request.status === 'REJECTED' && request.editAccessGranted)) && userRole === 'HOME_ADMIN') && (
                  <Link
                    href={`/dashboard/requests/${request.id}/edit`}
                    className="px-2 py-1 text-xs text-primary-600 hover:bg-primary-50 rounded flex items-center gap-1"
                  >
                    <Pencil className="w-2.5 h-2.5" /> Edit
                  </Link>
                )}
                {request.status === 'PENDING' && userRole === 'HOME_ADMIN' && (
                  <button
                    onClick={() => handleCancel(request.id)}
                    disabled={isCancelling}
                    className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded flex items-center gap-1 disabled:opacity-50"
                  >
                    {isCancelling ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                    Cancel
                  </button>
                )}
                {request.status === 'APPROVED' && (
                  <Link
                    href={`/dashboard/my-bookings/${request.approvedEvent?.id || request.existingEvent?.id}`}
                    className="px-2 py-1 text-xs text-primary-600 hover:bg-primary-50 rounded flex items-center gap-1"
                  >
                    View <ExternalLink className="w-2.5 h-2.5" />
                  </Link>
                )}
              </div>
            </div>
          )
        })
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
          <Calendar className="w-8 h-8 mx-auto text-gray-300 mb-2" />
          <p className="text-sm font-medium text-gray-900">No requests found</p>
        </div>
      )}
    </div>
  )

  // Desktop table view
  const DesktopTableView = () => (
    <div className="hidden md:block bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="table-scroll-wrapper max-h-[calc(100vh-320px)]">
        <table className={STYLES.table}>
          <thead className="bg-gray-50">
            <tr className={STYLES.tableHeadRow}>
              <th className={STYLES.tableHeader}>Status</th>
              <th className={STYLES.tableHeader}>Type</th>
              <th className={STYLES.tableHeader}>Booking</th>
              <th className={STYLES.tableHeader}>Location</th>
              <th className={STYLES.tableHeader}>Date</th>
              <th className={cn(STYLES.tableHeader, "text-right")}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredRequests.length > 0 ? (
              filteredRequests.map((request) => {
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
                  <tr key={request.id} className={STYLES.tableRow}>
                    <td className={STYLES.tableCell}>
                      <span className={cn(
                        "px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1 w-fit",
                        statusStyles[request.status]
                      )}>
                        {request.status === 'PENDING' && <Clock className="w-3 h-3" />}
                        {request.status === 'APPROVED' && <CheckCircle className="w-3 h-3" />}
                        {request.status === 'REJECTED' && <XCircle className="w-3 h-3" />}
                        {request.status}
                      </span>
                    </td>
                    <td className={STYLES.tableCell}>
                      <span className="text-xs text-gray-500">
                        {isCustom ? 'Custom' : 'Existing'}
                      </span>
                    </td>
                    <td className={STYLES.tableCell}>
                      <span className="font-medium text-gray-900">{title}</span>
                      {request.status === 'REJECTED' && request.rejectionReason && (
                        <span className="ml-2 text-red-600" title={request.rejectionReason}>
                          <AlertCircle className="w-3 h-3 inline" />
                        </span>
                      )}
                    </td>
                    <td className={STYLES.tableCell}>
                      <span className="text-sm text-gray-600">{location || '-'}</span>
                    </td>
                    <td className={STYLES.tableCell}>
                      <span className="text-sm text-gray-600">
                        {eventDate ? new Date(eventDate).toLocaleDateString() : '-'}
                      </span>
                    </td>
                    <td className={cn(STYLES.tableCell, "text-right")}>
                      <div className="flex items-center justify-end gap-1">
                        {(request.type === 'CREATE_CUSTOM' && (request.status === 'PENDING' || (request.status === 'REJECTED' && request.editAccessGranted)) && userRole === 'HOME_ADMIN') && (
                          <Link
                            href={`/dashboard/requests/${request.id}/edit`}
                            className="p-1.5 text-primary-600 hover:bg-primary-50 rounded transition-colors"
                            title="Edit request"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Link>
                        )}
                        {request.status === 'PENDING' && userRole === 'HOME_ADMIN' && (
                          <button
                            onClick={() => handleCancel(request.id)}
                            disabled={isCancelling}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                            title="Cancel request"
                          >
                            {isCancelling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                          </button>
                        )}
                        {request.status === 'APPROVED' && (
                          <Link
                            href={`/dashboard/my-bookings/${request.approvedEvent?.id || request.existingEvent?.id}`}
                            className="p-1.5 text-primary-600 hover:bg-primary-50 rounded transition-colors"
                            title="View booking"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan={6} className={cn(STYLES.tableCell, "text-center py-12")}>
                  <Calendar className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500">No requests found</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search requests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(STYLES.input, "pl-10 py-2 text-sm")}
          />
        </div>
      </div>

      {/* Views */}
      <MobileCardView />
      <DesktopTableView />
    </div>
  )
}
