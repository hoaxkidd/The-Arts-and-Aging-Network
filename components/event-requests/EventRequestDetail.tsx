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
import { approveEventRequest, grantEventRequestEditAccess, rejectEventRequest } from '@/app/actions/event-requests'
import { triggerNotificationRefresh } from '@/lib/notification-refresh'
import { FormTemplateView } from '@/components/forms/FormTemplateView'
import type { FormTemplateField } from '@/lib/form-template-types'

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
  formSubmission?: { id: string; formData: string; template: { title: string; formFields: string | null } } | null
  editAccessGranted?: boolean
  preferredDates?: string | null
}

function parsePreferredDates(preferredDates?: string | null): Array<{ startDateTime: Date; endDateTime: Date }> {
  if (!preferredDates) return []
  try {
    const parsed = JSON.parse(preferredDates) as Array<{ startDateTime?: string; endDateTime?: string }>
    return parsed
      .map((slot) => ({
        startDateTime: slot.startDateTime ? new Date(slot.startDateTime) : null,
        endDateTime: slot.endDateTime ? new Date(slot.endDateTime) : null,
      }))
      .filter((slot): slot is { startDateTime: Date; endDateTime: Date } => Boolean(slot.startDateTime && slot.endDateTime && slot.endDateTime > slot.startDateTime))
  } catch {
    return []
  }
}

function isDefaultWeeklyPattern(slots: Array<{ startDateTime: Date; endDateTime: Date }>): boolean {
  if (slots.length <= 1) return true
  const first = slots[0]
  const firstStartMinutes = first.startDateTime.getHours() * 60 + first.startDateTime.getMinutes()
  const firstDuration = first.endDateTime.getTime() - first.startDateTime.getTime()

  for (let i = 1; i < slots.length; i++) {
    const prev = slots[i - 1]
    const current = slots[i]
    const daysBetween = Math.round((current.startDateTime.getTime() - prev.startDateTime.getTime()) / (24 * 60 * 60 * 1000))
    const currentStartMinutes = current.startDateTime.getHours() * 60 + current.startDateTime.getMinutes()
    const currentDuration = current.endDateTime.getTime() - current.startDateTime.getTime()

    if (daysBetween !== 7 || currentStartMinutes !== firstStartMinutes || currentDuration !== firstDuration) {
      return false
    }
  }

  return true
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
  const [grantingEdit, setGrantingEdit] = useState(false)

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

  const handleGrantEditAccess = () => {
    if (grantingEdit) return
    setGrantingEdit(true)
    startTransition(async () => {
      const res = await grantEventRequestEditAccess(request.id)
      if (res.error) {
        alert(res.error)
        setGrantingEdit(false)
        return
      }
      triggerNotificationRefresh()
      router.refresh()
      setGrantingEdit(false)
    })
  }

  const formFields = request.formSubmission?.template?.formFields
    ? (() => {
        try {
          return JSON.parse(request.formSubmission.template.formFields) as FormTemplateField[]
        } catch {
          return []
        }
      })()
    : []

  const formValues = request.formSubmission?.formData
    ? (() => {
        try {
          return JSON.parse(request.formSubmission.formData) as Record<string, unknown>
        } catch {
          return {}
        }
      })()
    : {}

  const preferredDates = parsePreferredDates(request.preferredDates)
  const hasWeeklySchedule = isCustom && preferredDates.length > 1
  const isDefaultPattern = isDefaultWeeklyPattern(preferredDates)

  return (
    <div className="space-y-4">
      {/* Summary bar — status, date, facility, type */}
      <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <span className={cn(
            "text-xs font-semibold",
            request.status === 'PENDING' && "text-amber-700",
            request.status === 'APPROVED' && "text-green-700",
            request.status === 'REJECTED' && "text-red-700"
          )}>
            {request.status}
          </span>
          <span className="text-gray-500">
            Requested {requestedAt ? new Date(requestedAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : '—'}
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
                {new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </span>
            )}
            {location && <span>{location}</span>}
            {request.expectedAttendees != null && <span>{request.expectedAttendees} expected</span>}
          </div>
        </div>
      </div>

      {hasWeeklySchedule && (
        <div className={cn(STYLES.card)}>
          <h2 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-2 mb-3">Weekly Event Dates</h2>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
              <span>{preferredDates.length} weekly events</span>
              <span className={cn(
                "px-2 py-0.5 rounded-full text-xs font-medium",
                isDefaultPattern ? "bg-gray-100 text-gray-700" : "bg-amber-100 text-amber-800"
              )}>
                {isDefaultPattern ? 'Default weekly pattern' : 'Customized weekly pattern'}
              </span>
            </div>
            <div className="space-y-1 text-sm text-gray-600">
              {preferredDates.map((slot, index) => (
                <p key={index}>
                  {slot.startDateTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  {' '}•{' '}
                  {slot.startDateTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  {' - '}
                  {slot.endDateTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Notes */}
      <div className={cn(STYLES.card)}>
        <h2 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-2 mb-3">Notes from requester</h2>
        <p className="text-sm text-gray-600">{request.notes || '—'}</p>
      </div>

      {/* Form responses */}
      {request.formSubmission && formFields.length > 0 && (
        <div className={cn(STYLES.card)}>
          <h2 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-2 mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary-600" />
            {request.formSubmission.template.title}
          </h2>
          <FormTemplateView
            title={request.formSubmission.template.title}
            fields={formFields}
            values={formValues}
            preview={true}
          />
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
        {request.status === 'REJECTED' && !request.editAccessGranted && (
          <button
            onClick={handleGrantEditAccess}
            disabled={isPending || grantingEdit}
            className={cn(STYLES.btn, STYLES.btnSecondary, "inline-flex items-center gap-2")}
          >
            {grantingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Grant Edit Access
          </button>
        )}
        {request.status === 'REJECTED' && request.editAccessGranted && (
          <span className="text-sm text-green-700 font-medium">Edit access granted</span>
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
