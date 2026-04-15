'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Save } from 'lucide-react'
import { cn } from '@/lib/utils'
import { STYLES } from '@/lib/styles'
import { updateHomeEventRequest } from '@/app/actions/booking-requests'
import { FormTemplateView } from '@/components/forms/FormTemplateView'
import { parseFormFields } from '@/lib/form-template-types'
import { DateTimeInput } from '@/components/ui/DateTimeInput'

type EditRequest = {
  id: string
  type: string
  status: string
  customTitle: string | null
  customDescription: string | null
  customStartDateTime: string | Date | null
  customEndDateTime: string | Date | null
  customLocationName: string | null
  customLocationAddress: string | null
  notes: string | null
  expectedAttendees: number | null
  rejectionReason: string | null
  preferredDates?: string | null
  editAccessGranted?: boolean
  formSubmission?: {
    id: string
    formData: string
    template: {
      title: string
      formFields: string | null
    }
  } | null
}

export function EditEventRequestForm({ request }: { request: EditRequest }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const canEdit = request.type === 'CREATE_CUSTOM' && (
    request.status === 'PENDING' || (request.status === 'REJECTED' && request.editAccessGranted)
  )

  const [title, setTitle] = useState(request.customTitle || '')
  const [description, setDescription] = useState(request.customDescription || '')
  const [startDateTime, setStartDateTime] = useState(request.customStartDateTime ? new Date(request.customStartDateTime).toISOString() : '')
  const [endDateTime, setEndDateTime] = useState(request.customEndDateTime ? new Date(request.customEndDateTime).toISOString() : '')
  const [showOccurrenceEditor, setShowOccurrenceEditor] = useState(false)
  const [occurrences, setOccurrences] = useState<Array<{ startDateTime: string; endDateTime: string }>>(() => {
    try {
      const parsed = request.preferredDates ? JSON.parse(request.preferredDates) : []
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    } catch {
      // no-op
    }
    return []
  })
  const [locationName, setLocationName] = useState(request.customLocationName || '')
  const [locationAddress, setLocationAddress] = useState(request.customLocationAddress || '')
  const [notes, setNotes] = useState(request.notes || '')
  const [expectedAttendees, setExpectedAttendees] = useState(request.expectedAttendees?.toString() || '')

  const fields = parseFormFields(request.formSubmission?.template.formFields || null)
  const [formValues, setFormValues] = useState<Record<string, unknown>>(() => {
    if (!request.formSubmission?.formData) return {}
    try {
      return JSON.parse(request.formSubmission.formData) as Record<string, unknown>
    } catch {
      return {}
    }
  })

  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  const generateWeeklyOccurrences = (startInput: string, endInput: string) => {
    const start = new Date(startInput)
    const end = new Date(endInput)
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) return []

    const dayStart = new Date(start)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(end)
    dayEnd.setHours(0, 0, 0, 0)

    const startMinutes = start.getHours() * 60 + start.getMinutes()
    const endMinutes = end.getHours() * 60 + end.getMinutes()
    const durationMinutes = endMinutes > startMinutes ? (endMinutes - startMinutes) : 60

    const series: Array<{ startDateTime: string; endDateTime: string }> = []
    const currentDate = new Date(dayStart)
    while (currentDate <= dayEnd) {
      const currentStart = new Date(currentDate)
      currentStart.setHours(start.getHours(), start.getMinutes(), 0, 0)
      const currentEnd = new Date(currentStart)
      currentEnd.setMinutes(currentEnd.getMinutes() + durationMinutes)
      if (currentEnd > currentStart) {
        series.push({ startDateTime: currentStart.toISOString(), endDateTime: currentEnd.toISOString() })
      }
      currentDate.setDate(currentDate.getDate() + 7)
    }
    return series
  }

  useEffect(() => {
    if (occurrences.length === 0 && startDateTime && endDateTime) {
      setOccurrences(generateWeeklyOccurrences(startDateTime, endDateTime))
    }
  }, [startDateTime, endDateTime, occurrences.length])

  const occurrenceSummary = (() => {
    if (occurrences.length === 0) return 'No weekly bookings generated yet'
    const first = new Date(occurrences[0].startDateTime)
    const weekday = isNaN(first.getTime())
      ? 'the selected weekday'
      : first.toLocaleDateString('en-US', { weekday: 'long' })
    return `Creates ${occurrences.length} weekly booking${occurrences.length === 1 ? '' : 's'} on ${weekday}`
  })()

  const occurrenceDatesSummary = (() => {
    if (occurrences.length === 0) return ''
    const preview = occurrences
      .slice(0, 3)
      .map((occ) => {
        const d = new Date(occ.startDateTime)
        return isNaN(d.getTime()) ? null : d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
      })
      .filter((value): value is string => Boolean(value))

    if (preview.length === 0) return ''
    const remaining = occurrences.length - preview.length
    return `First dates: ${preview.join(', ')}${remaining > 0 ? ` (+${remaining} more)` : ''}`
  })()

  const validate = () => {
    if (!title.trim()) return 'Title is required'
    if (!startDateTime) return 'Start date/time is required'
    if (!endDateTime) return 'End date/time is required'
    if (new Date(endDateTime) <= new Date(startDateTime)) return 'End date/time must be after start date/time'
    if (occurrences.length === 0) return 'No valid weekly occurrences generated from this range'

    const nextErrors: Record<string, string> = {}
    for (const field of fields) {
      if (!field.required) continue
      const value = formValues[field.id]
      const missing = value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)
      if (missing) nextErrors[field.id] = `${field.label || 'This field'} is required`
    }

    for (let i = 0; i < occurrences.length; i++) {
      const start = new Date(occurrences[i].startDateTime)
      const end = new Date(occurrences[i].endDateTime)
      if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
        nextErrors[`occurrence-${i}`] = `Occurrence ${i + 1} is invalid`
      }
    }

    setFormErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return 'Please complete all required fields'
    return null
  }

  const handleSubmit = () => {
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    startTransition(async () => {
      const result = await updateHomeEventRequest(request.id, {
        title,
        description,
        startDateTime,
        endDateTime,
        locationName,
        locationAddress,
        notes,
        expectedAttendees: expectedAttendees ? Number(expectedAttendees) : undefined,
        formData: request.formSubmission ? formValues : undefined,
        preferredDates: occurrences,
      })

      if (result.error) {
        setError(result.error)
        return
      }

      router.push('/dashboard/my-bookings?section=requests')
      router.refresh()
    })
  }

  if (!canEdit) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Request Not Editable</h2>
        <p className="text-sm text-gray-600">
          This request can only be edited while pending or after admin grants edit access on a rejected request.
        </p>
        <Link href="/dashboard/my-bookings?section=requests" className={cn(STYLES.btn, STYLES.btnSecondary)}>
          Back to Requests
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/dashboard/my-bookings?section=requests" className="text-sm text-gray-600 hover:text-gray-900 inline-flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Back to requests
        </Link>
      </div>

      {request.status === 'REJECTED' && request.rejectionReason && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
          Rejected reason: {request.rejectionReason}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 md:p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Booking Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={STYLES.input} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Booking Start</label>
            <DateTimeInput
              name="editEventStartDateTime"
              value={startDateTime}
              onChange={(value) => setStartDateTime(value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Booking End</label>
            <DateTimeInput
              name="editEventEndDateTime"
              value={endDateTime}
              onChange={(value) => setEndDateTime(value)}
              required
            />
          </div>
          <div className="md:col-span-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs text-amber-800">
              Weekly scheduling default: if your first booking is on Monday, following weeks will also be Monday. You can customize weekly dates if needed.
            </p>
          </div>
          <div className="md:col-span-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm text-gray-700">{occurrenceSummary}</p>
                {occurrenceDatesSummary && <p className="text-xs text-gray-500 mt-0.5">{occurrenceDatesSummary}</p>}
              </div>
              <button
                type="button"
                onClick={() => setShowOccurrenceEditor((prev) => !prev)}
                className="text-sm font-medium text-primary-700 hover:text-primary-800"
              >
                {showOccurrenceEditor ? 'Hide weekly date editor' : 'Customize weekly dates'}
              </button>
            </div>
            {showOccurrenceEditor && (
              <div className="mt-3 space-y-2">
                <button
                  type="button"
                  onClick={() => setOccurrences(generateWeeklyOccurrences(startDateTime, endDateTime))}
                  className="text-xs font-medium text-primary-700 hover:text-primary-800"
                >
                  Regenerate weekly dates from booking start/end
                </button>
                {occurrences.map((occurrence, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-2 rounded-lg border border-gray-200 p-2 bg-white">
                    <DateTimeInput
                      name={`editOccurrenceStart-${index}`}
                      value={occurrence.startDateTime}
                      onChange={(value) => {
                        if (!value) return
                        const parsed = new Date(value)
                        if (isNaN(parsed.getTime())) return
                        const next = [...occurrences]
                        next[index] = { ...next[index], startDateTime: parsed.toISOString() }
                        setOccurrences(next)
                      }}
                    />
                    <DateTimeInput
                      name={`editOccurrenceEnd-${index}`}
                      value={occurrence.endDateTime}
                      onChange={(value) => {
                        if (!value) return
                        const parsed = new Date(value)
                        if (isNaN(parsed.getTime())) return
                        const next = [...occurrences]
                        next[index] = { ...next[index], endDateTime: parsed.toISOString() }
                        setOccurrences(next)
                      }}
                    />
                    {formErrors[`occurrence-${index}`] && (
                      <p className="md:col-span-2 text-xs text-red-500">{formErrors[`occurrence-${index}`]}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location Name</label>
            <input value={locationName} onChange={(e) => setLocationName(e.target.value)} className={STYLES.input} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expected Attendees</label>
            <input type="number" min={1} value={expectedAttendees} onChange={(e) => setExpectedAttendees(e.target.value)} className={STYLES.input} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Location Address</label>
            <input value={locationAddress} onChange={(e) => setLocationAddress(e.target.value)} className={STYLES.input} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className={cn(STYLES.input, 'min-h-[100px]')} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={cn(STYLES.input, 'min-h-[80px]')} />
          </div>
        </div>
      </div>

      {request.formSubmission && fields.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 md:p-5">
          <FormTemplateView
            title={request.formSubmission.template.title}
            fields={fields}
            values={formValues}
            onFieldChange={(fieldId, value) => setFormValues((prev) => ({ ...prev, [fieldId]: value }))}
            errors={formErrors}
            density="compact"
          />
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        <Link href="/dashboard/my-bookings?section=requests" className={cn(STYLES.btn, STYLES.btnSecondary)}>
          Cancel
        </Link>
        <button onClick={handleSubmit} disabled={isPending} className={cn(STYLES.btn, STYLES.btnPrimary, 'inline-flex items-center gap-2')}>
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </button>
      </div>
    </div>
  )
}
