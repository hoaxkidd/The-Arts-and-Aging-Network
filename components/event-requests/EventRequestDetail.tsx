'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Building2,
  Calendar,
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
  type: string
  status: string
  requestedAt: Date | string
  rejectionReason: string | null
  notes: string | null
  customTitle: string | null
  customDescription: string | null
  customStartDateTime: Date | string | null
  customLocationName: string | null
  expectedAttendees: number | null
  existingEvent: { id: string; title: string; startDateTime: Date | string; location: { name: string } | null } | null
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
      <div className="absolute inset-0 bg-gray-900/40" onClick={onClose} aria-hidden />
      <div className="relative bg-white rounded-lg border border-gray-200 shadow-lg w-full max-w-md p-4">
        <h3 className="font-semibold text-gray-900">Decline request</h3>
        <p className="text-sm text-gray-500 mt-0.5 mb-3">Reason for declining &quot;{requestTitle}&quot;</p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className={cn(STYLES.input, "min-h-[80px] resize-none")}
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

export function EventRequestDetail({ request }: { request: Request }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [rejectOpen, setRejectOpen] = useState(false)

  const isCustom = request.type === 'CREATE_CUSTOM'
  const title = isCustom ? request.customTitle : request.existingEvent?.title
  const date = isCustom ? request.customStartDateTime : request.existingEvent?.startDateTime
  const location = isCustom ? request.customLocationName : request.existingEvent?.location?.name
  const requestedAt = request.requestedAt instanceof Date
    ? request.requestedAt.toISOString()
    : typeof request.requestedAt === 'string'
      ? request.requestedAt
      : ''

  const handleApprove = () => {
    startTransition(async () => {
      const res = await approveEventRequest(request.id)
      if (res.error) return
      triggerNotificationRefresh()
      router.refresh()
    })
  }

  const handleReject = (reason: string) => {
    startTransition(async () => {
      const res = await rejectEventRequest(request.id, reason)
      if (res.error) return
      setRejectOpen(false)
      triggerNotificationRefresh()
      router.refresh()
    })
  }

  const formDataRows = request.formSubmission ? (() => {
    try {
      const data = JSON.parse(request.formSubmission.formData) as Record<string, unknown>
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
          return { key, display: raw.startsWith('data:') ? '(file uploaded)' : raw }
        })
    } catch {
      return null
    }
  })() : null

  return (
    <div className="space-y-4">
      {/* Summary bar — status, date, facility, type */}
      <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <span className={cn(
            "px-2.5 py-0.5 text-xs font-semibold rounded-full border",
            request.status === 'PENDING' && "bg-amber-100 text-amber-800 border-amber-200",
            request.status === 'APPROVED' && "bg-green-100 text-green-800 border-green-200",
            request.status === 'REJECTED' && "bg-red-100 text-red-800 border-red-200"
          )}>
            {request.status}
          </span>
          <span className="text-gray-500">
            Requested {requestedAt ? new Date(requestedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
          </span>
          <span className="flex items-center gap-1.5 text-gray-700">
            <Building2 className="w-4 h-4 text-gray-400" />
            <Link href={`/admin/homes/${request.geriatricHome.id}`} className="text-primary-600 hover:underline font-medium">
              {request.geriatricHome.name}
            </Link>
          </span>
          <span className="text-gray-500">{isCustom ? 'Custom event' : 'Existing event'}</span>
        </div>
      </div>

      {/* Event details card */}
      <div className={cn(STYLES.card)}>
        <h2 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-2 mb-4">Event</h2>
        <div className="space-y-1">
          <p className="text-lg font-medium text-gray-900">{title || '—'}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
            {date && (
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                {new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>
            )}
            {location && <span>{location}</span>}
            {request.expectedAttendees != null && <span>{request.expectedAttendees} expected</span>}
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className={cn(STYLES.card)}>
        <h2 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-2 mb-3">Notes from requester</h2>
        <p className="text-sm text-gray-600">{request.notes || '—'}</p>
      </div>

      {/* Form responses */}
      {request.formSubmission && (
        <div className={cn(STYLES.card)}>
          <h2 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-2 mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary-600" />
            {request.formSubmission.template.title}
          </h2>
          <dl className="space-y-2 text-sm">
            {formDataRows && formDataRows.length > 0 ? formDataRows.map(({ key, display }) => (
              <div key={key} className="flex gap-2">
                <dt className="text-gray-500 shrink-0 min-w-[120px]">{key}</dt>
                <dd className="text-gray-900 break-words">{display}</dd>
              </div>
            )) : <p className="text-gray-500">No responses</p>}
          </dl>
        </div>
      )}

      {/* Description (custom events) */}
      {isCustom && (
        <div className={cn(STYLES.card)}>
          <h2 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-2 mb-3">Description</h2>
          <p className="text-sm text-gray-600">{request.customDescription || '—'}</p>
        </div>
      )}

      {/* Rejection reason */}
      {request.status === 'REJECTED' && request.rejectionReason && (
        <div className="bg-red-50 rounded-lg border border-red-200 p-4">
          <h2 className="text-sm font-semibold text-red-900 mb-1">Decline reason</h2>
          <p className="text-sm text-red-700">{request.rejectionReason}</p>
        </div>
      )}

      {/* Actions bar */}
      <div className="bg-white rounded-lg border border-gray-200 px-4 py-3 flex flex-wrap items-center gap-3">
        {request.status === 'PENDING' && (
          <>
            <button
              onClick={handleApprove}
              disabled={isPending}
              className={cn(STYLES.btn, "bg-green-600 text-white hover:bg-green-700 flex items-center gap-2")}
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Approve
            </button>
            <button
              onClick={() => setRejectOpen(true)}
              disabled={isPending}
              className={cn(STYLES.btn, STYLES.btnSecondary, "flex items-center gap-2")}
            >
              <XCircle className="w-4 h-4" /> Decline
            </button>
          </>
        )}
        {request.status === 'APPROVED' && request.approvedEvent && (
          <Link href={`/events/${request.approvedEvent.id}`} className={cn(STYLES.btn, STYLES.btnPrimary, "inline-flex items-center gap-2")}>
            <Eye className="w-4 h-4" /> View Event
          </Link>
        )}
      </div>

      <RejectModal
        isOpen={rejectOpen}
        onClose={() => setRejectOpen(false)}
        onConfirm={handleReject}
        isPending={isPending}
        requestTitle={title || ''}
      />
    </div>
  )
}
