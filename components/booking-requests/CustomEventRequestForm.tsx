'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { STYLES } from '@/lib/styles'
import { createCustomEventRequest } from '@/app/actions/booking-requests'
import { getEventSignupForms } from '@/app/actions/form-templates'
import { FormTemplateView } from '@/components/forms/FormTemplateView'
import { DateTimeInput } from '@/components/ui/DateTimeInput'
import type { FormTemplateField } from '@/lib/form-template-types'
import { logger } from '@/lib/logger'

type FormTemplate = {
  id: string
  title: string
  description: string | null
  descriptionHtml: string | null
  formFields: string | null
}

export function CustomEventRequestForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [success, setSuccess] = useState(false)
  const [formTemplates, setFormTemplates] = useState<FormTemplate[]>([])
  const [selectedFormId, setSelectedFormId] = useState('')
  const [formValues, setFormValues] = useState<Record<string, unknown>>({})
  const [isLoadingForms, setIsLoadingForms] = useState(true)

  const selectedDate = searchParams.get('date')
  const selectedTemplateFromUrl = searchParams.get('formTemplateId')
  const hasCalendarDate = !!selectedDate && /^\d{4}-\d{2}-\d{2}$/.test(selectedDate)
  const defaultStart = hasCalendarDate ? `${selectedDate}T09:00` : ''
  const defaultEnd = hasCalendarDate ? `${selectedDate}T10:00` : ''
  const [startDateTime, setStartDateTime] = useState(defaultStart)
  const [endDateTime, setEndDateTime] = useState(defaultEnd)
  const [occurrences, setOccurrences] = useState<Array<{ startDateTime: string; endDateTime: string }>>([])
  const [showOccurrenceEditor, setShowOccurrenceEditor] = useState(false)

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
        series.push({
          startDateTime: currentStart.toISOString(),
          endDateTime: currentEnd.toISOString(),
        })
      }

      currentDate.setDate(currentDate.getDate() + 7)
    }

    return series
  }

  useEffect(() => {
    setOccurrences(generateWeeklyOccurrences(startDateTime, endDateTime))
  }, [startDateTime, endDateTime])

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

  useEffect(() => {
    async function fetchForms() {
      try {
        const result = await getEventSignupForms()
        if (result.success && result.data) {
          const loadedTemplates = result.data as FormTemplate[]
          setFormTemplates(loadedTemplates)
          if (selectedTemplateFromUrl && loadedTemplates.some((template) => template.id === selectedTemplateFromUrl)) {
            setSelectedFormId(selectedTemplateFromUrl)
          }
        }
      } catch (error) {
        logger.serverAction('Error fetching forms:', error)
      } finally {
        setIsLoadingForms(false)
      }
    }
    fetchForms()
  }, [selectedTemplateFromUrl])

  const selectedForm = formTemplates.find(f => f.id === selectedFormId)
  const isTemplateLocked = Boolean(selectedTemplateFromUrl && selectedFormId === selectedTemplateFromUrl)
  
  const getFormFields = (): FormTemplateField[] => {
    if (!selectedForm?.formFields) return []
    try {
      return JSON.parse(selectedForm.formFields) as FormTemplateField[]
    } catch {
      return []
    }
  }

  const handleFormSelection = (formId: string) => {
    setSelectedFormId(formId)
    setFormValues({})
    setErrors({})
  }

  const handleFieldChange = (fieldId: string, value: unknown) => {
    setFormValues(prev => ({ ...prev, [fieldId]: value }))
  }

  const isEmptyValue = (value: unknown): boolean => {
    if (value === undefined || value === null) return true
    if (typeof value === 'string') return value.trim() === ''
    if (Array.isArray(value)) return value.length === 0
    return false
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!startDateTime) newErrors.startDateTime = 'Start date and time is required'
    if (!endDateTime) newErrors.endDateTime = 'End date and time is required'

    if (startDateTime && endDateTime) {
      const start = new Date(startDateTime)
      const end = new Date(endDateTime)
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        newErrors.startDateTime = 'Please enter valid date/time values'
      } else if (end <= start) {
        newErrors.endDateTime = 'End date/time must be after start date/time'
      } else if (occurrences.length === 0) {
        newErrors.endDateTime = 'No valid weekly occurrences generated from this range'
      }
    }

    for (let i = 0; i < occurrences.length; i++) {
      const occ = occurrences[i]
      const start = new Date(occ.startDateTime)
      const end = new Date(occ.endDateTime)
      if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
        newErrors[`occurrence-${i}`] = `Occurrence ${i + 1} has invalid start/end time`
      }
    }

    if (!selectedFormId) {
      newErrors.formTemplate = 'Please select a form'
    }

    // Validate required form fields
    const fields = getFormFields()
    for (const field of fields) {
      if (field.required) {
        const value = formValues[field.id]
        if (isEmptyValue(value)) {
          newErrors[field.id] = `${field.label || 'This field'} is required`
        }
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    startTransition(async () => {
      const firstOccurrence = occurrences[0]
      if (!firstOccurrence) {
        setErrors({ submit: 'Please provide a valid date range to generate occurrences.' })
        return
      }

      const requestData = {
        formTemplateId: selectedFormId,
        formData: formValues,
        startDateTime: firstOccurrence.startDateTime,
        endDateTime: firstOccurrence.endDateTime,
        preferredDates: occurrences,
      }

      const result = await createCustomEventRequest(requestData)

      if (result.error) {
        setErrors({ submit: result.error })
      } else {
        setSuccess(true)
        setTimeout(() => {
          router.push('/dashboard/my-bookings?section=requests')
        }, 2000)
      }
    })
  }

  if (success) {
    return (
      <div className="bg-white rounded-lg border border-green-200 p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Request Submitted!</h2>
        <p className="text-gray-600 mb-4">
          Your custom booking request has been submitted for review. You'll be notified when an administrator responds.
        </p>
        <p className="text-sm text-gray-500">Redirecting to your requests...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Link href="/dashboard/my-bookings?section=requests" className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900">
        <ArrowLeft className="w-4 h-4" /> Back to Requests
      </Link>
      {/* Error Banner */}
      {errors.submit && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-700">{errors.submit}</p>
        </div>
      )}

      {/* Form Card */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-visible">
        <div className="p-6 space-y-5">
          <h2 className="font-semibold text-gray-900">
            Booking Schedule
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Booking Start <span className="text-red-500">*</span>
              </label>
              <DateTimeInput
                name="eventStartDateTime"
                value={startDateTime}
                onChange={(value) => setStartDateTime(value)}
                required
              />
              {errors.startDateTime && <p className="mt-1 text-xs text-red-500">{errors.startDateTime}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Booking End <span className="text-red-500">*</span>
              </label>
              <DateTimeInput
                name="eventEndDateTime"
                value={endDateTime}
                onChange={(value) => setEndDateTime(value)}
                required
              />
              {errors.endDateTime && <p className="mt-1 text-xs text-red-500">{errors.endDateTime}</p>}
            </div>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs text-amber-800">
              Weekly scheduling default: if your first booking is on Monday, following weeks will also be Monday. You can customize weekly dates if needed.
            </p>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
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
          </div>

          {showOccurrenceEditor && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Weekly Booking Dates</label>
              {occurrences.length === 0 ? (
                <p className="text-xs text-gray-500">Enter a valid booking range to generate weekly dates.</p>
              ) : (
                <div className="space-y-2 max-h-56 overflow-auto pr-1">
                  {occurrences.map((occurrence, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-2 rounded-lg border border-gray-200 p-2 bg-white">
                      <DateTimeInput
                        name={`occurrenceStart-${index}`}
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
                        name={`occurrenceEnd-${index}`}
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
                      {errors[`occurrence-${index}`] && (
                        <p className="md:col-span-2 text-xs text-red-500">{errors[`occurrence-${index}`]}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="pt-1 border-t border-gray-100" />

          <h2 className="font-semibold text-gray-900">
            Select Booking Sign-up Form
          </h2>

          {/* Form Template Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Booking Form <span className="text-red-500">*</span>
            </label>
            {isLoadingForms ? (
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading available forms...
              </div>
            ) : (
              <select
                value={selectedFormId}
                onChange={(e) => handleFormSelection(e.target.value)}
                disabled={isTemplateLocked}
                className={cn(STYLES.input, errors.formTemplate && "border-red-300")}
              >
                <option value="">-- Select a booking form --</option>
                {formTemplates.map((form) => (
                  <option key={form.id} value={form.id}>
                    {form.title}
                  </option>
                ))}
              </select>
            )}
            {errors.formTemplate && (
              <p className="mt-1 text-xs text-red-500">{errors.formTemplate}</p>
            )}
            {isTemplateLocked && (
              <p className="mt-1 text-xs text-gray-500">Program selected from dashboard.</p>
            )}
            {!isLoadingForms && formTemplates.length === 0 && (
              <p className="mt-1 text-xs text-amber-600">
                No booking forms available. Please check back later or contact your administrator.
              </p>
            )}
          </div>
        </div>

        {/* Form Fields */}
        {selectedForm && (
          <div className="border-t border-gray-100">
            <FormTemplateView
              title={selectedForm.title}
              description={selectedForm.description}
              descriptionHtml={selectedForm.descriptionHtml}
              fields={getFormFields()}
              values={formValues}
              onFieldChange={handleFieldChange}
              errors={errors}
              onSubmit={handleSubmit}
              submitting={isPending}
            />
          </div>
        )}

        {/* Actions */}
        {selectedForm && (
          <div className="p-6 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
              <Link
                href="/dashboard/my-bookings?section=requests"
                className={cn(STYLES.btn, "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50")}
              >
              Cancel
            </Link>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isPending}
              className={cn(STYLES.btn, STYLES.btnPrimary, "flex items-center gap-2")}
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Submit Request
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
