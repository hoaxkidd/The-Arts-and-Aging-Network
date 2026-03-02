'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Calendar,
  MapPin,
  FileText,
  ArrowLeft,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { STYLES } from '@/lib/styles'
import { createCustomEventRequest } from '@/app/actions/event-requests'
import { AddressAutocomplete } from '@/components/ui/AddressAutocomplete'
import { DateTimeInput } from '@/components/ui/DateTimeInput'
import { toInputDateTime } from '@/lib/date-utils'

export function CustomEventRequestForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [success, setSuccess] = useState(false)

  // Get pre-filled date from URL params (from calendar click)
  const prefilledDate = searchParams.get('date')

  // Convert prefilled date to ISO datetime format for DateTimeInput
  const getPrefilledStartDateTime = () => {
    if (!prefilledDate) return null
    // prefilledDate is YYYY-MM-DD, add default time
    return `${prefilledDate}T10:00`
  }

  const getPrefilledEndDateTime = () => {
    if (!prefilledDate) return null
    return `${prefilledDate}T12:00`
  }

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDateTime: getPrefilledStartDateTime(),
    endDateTime: getPrefilledEndDateTime(),
    locationName: '',
    locationAddress: '',
    notes: '',
    expectedAttendees: ''
  })

  // Update form if URL date changes
  useEffect(() => {
    if (prefilledDate && !formData.startDateTime) {
      setFormData(prev => ({
        ...prev,
        startDateTime: `${prefilledDate}T10:00`,
        endDateTime: `${prefilledDate}T12:00`
      }))
    }
  }, [prefilledDate, formData.startDateTime])

  // Convert YYYY-MM-DD to DD-MM-YYYY for display
  const toDisplayDate = (dateStr: string): string => {
    if (!dateStr) return ''
    if (dateStr.match(/^\d{2}-\d{2}-\d{4}$/)) return dateStr
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateStr.split('-')
      return `${day}-${month}-${year}`
    }
    return ''
  }

  // Convert DD-MM-YYYY to YYYY-MM-DD for storage
  const toStorageDate = (dateStr: string): string => {
    if (!dateStr) return ''
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) return dateStr
    if (dateStr.match(/^\d{2}-\d{2}-\d{4}$/)) {
      const [day, month, year] = dateStr.split('-')
      return `${year}-${month}-${day}`
    }
    return ''
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.title.trim()) {
      newErrors.title = 'Event title is required'
    }
    if (!formData.startDateTime) {
      newErrors.startDateTime = 'Start date and time is required'
    }
    if (!formData.endDateTime) {
      newErrors.endDateTime = 'End date and time is required'
    }

    // Validate date/time logic
    if (formData.startDateTime && formData.endDateTime) {
      const start = new Date(formData.startDateTime)
      const end = new Date(formData.endDateTime)

      if (start >= end) {
        newErrors.endDateTime = 'End time must be after start time'
      }

      if (start < new Date()) {
        newErrors.startDateTime = 'Event must be in the future'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) return

    startTransition(async () => {
      // Convert ISO string to the format expected by server (YYYY-MM-DDTHH:MM:SS)
      const startDateTimeStr = formData.startDateTime 
        ? new Date(formData.startDateTime).toISOString()
        : ''
      const endDateTimeStr = formData.endDateTime
        ? new Date(formData.endDateTime).toISOString()
        : ''

      const requestData = {
        title: formData.title,
        description: formData.description || undefined,
        startDateTime: startDateTimeStr,
        endDateTime: endDateTimeStr,
        locationName: formData.locationName || undefined,
        locationAddress: formData.locationAddress || undefined,
        notes: formData.notes || undefined,
        expectedAttendees: formData.expectedAttendees
          ? parseInt(formData.expectedAttendees)
          : undefined
      }

      const result = await createCustomEventRequest(requestData)

      if (result.error) {
        setErrors({ submit: result.error })
      } else {
        setSuccess(true)
        setTimeout(() => {
          router.push('/dashboard/requests')
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
          Your custom event request has been submitted for review. You'll be notified when an administrator responds.
        </p>
        <p className="text-sm text-gray-500">Redirecting to your requests...</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Back Link */}
      <Link
        href="/dashboard/requests"
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Requests
      </Link>

      {/* Error Banner */}
      {errors.submit && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-700">{errors.submit}</p>
        </div>
      )}

      {/* Form Card */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Event Details */}
        <div className="p-6 space-y-5">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary-600" />
            Event Details
          </h2>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Event Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className={cn(STYLES.input, errors.title && "border-red-300")}
              placeholder="e.g., Art Workshop for Residents"
            />
            {errors.title && (
              <p className="mt-1 text-xs text-red-500">{errors.title}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className={cn(STYLES.input, "h-24 resize-none")}
              placeholder="Describe the event activities, goals, and any special requirements..."
            />
          </div>

          {/* Date/Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date/Time <span className="text-red-500">*</span>
              </label>
              <DateTimeInput
                name="startDateTime"
                value={formData.startDateTime}
                onChange={(val) => setFormData({ ...formData, startDateTime: val })}
                required
                className="w-full"
              />
              {errors.startDateTime && (
                <p className="mt-1 text-xs text-red-500">{errors.startDateTime}</p>
              )}
            </div>
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date/Time <span className="text-red-500">*</span>
              </label>
              <DateTimeInput
                name="endDateTime"
                value={formData.endDateTime}
                onChange={(val) => setFormData({ ...formData, endDateTime: val })}
                required
              />
              {errors.endDateTime && (
                <p className="mt-1 text-xs text-red-500">{errors.endDateTime}</p>
              )}
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="p-6 border-t border-gray-100 space-y-5">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary-600" />
            Location (Optional)
          </h2>
          <p className="text-sm text-gray-500">
            If not specified, your facility's address will be used.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location Name
              </label>
              <input
                type="text"
                value={formData.locationName}
                onChange={(e) => setFormData({ ...formData, locationName: e.target.value })}
                className={STYLES.input}
                placeholder="e.g., Activity Room"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              <AddressAutocomplete
                value={formData.locationAddress}
                onChange={(val) => setFormData({ ...formData, locationAddress: val })}
                placeholder="Full address"
                countries={['ca']}
                className={STYLES.input}
              />
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="p-6 border-t border-gray-100 space-y-5">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary-600" />
            Additional Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expected Attendees
              </label>
              <input
                type="number"
                min="1"
                value={formData.expectedAttendees}
                onChange={(e) => setFormData({ ...formData, expectedAttendees: e.target.value })}
                className={STYLES.input}
                placeholder="Number of residents"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes for Administrator
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className={cn(STYLES.input, "h-20 resize-none")}
              placeholder="Any special requirements, accessibility needs, or other notes..."
            />
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
          <Link
            href="/dashboard/requests"
            className={cn(STYLES.btn, "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50")}
          >
            Cancel
          </Link>
          <button
            type="submit"
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
      </div>
    </form>
  )
}
