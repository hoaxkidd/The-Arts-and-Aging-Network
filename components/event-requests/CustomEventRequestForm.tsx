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

export function CustomEventRequestForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [success, setSuccess] = useState(false)

  // Get pre-filled date from URL params (from calendar click)
  const prefilledDate = searchParams.get('date')

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: prefilledDate || '',
    startTime: '10:00',
    endDate: prefilledDate || '',
    endTime: '12:00',
    locationName: '',
    locationAddress: '',
    notes: '',
    expectedAttendees: ''
  })

  // Update form if URL date changes
  useEffect(() => {
    if (prefilledDate && !formData.startDate) {
      setFormData(prev => ({
        ...prev,
        startDate: prefilledDate,
        endDate: prefilledDate
      }))
    }
  }, [prefilledDate, formData.startDate])

  const validate = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.title.trim()) {
      newErrors.title = 'Event title is required'
    }
    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required'
    }
    if (!formData.startTime) {
      newErrors.startTime = 'Start time is required'
    }
    if (!formData.endDate) {
      newErrors.endDate = 'End date is required'
    }
    if (!formData.endTime) {
      newErrors.endTime = 'End time is required'
    }

    // Validate date/time logic
    if (formData.startDate && formData.endDate && formData.startTime && formData.endTime) {
      const start = new Date(`${formData.startDate}T${formData.startTime}`)
      const end = new Date(`${formData.endDate}T${formData.endTime}`)

      if (start >= end) {
        newErrors.endTime = 'End time must be after start time'
      }

      if (start < new Date()) {
        newErrors.startDate = 'Event must be in the future'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) return

    startTransition(async () => {
      const startDateTime = `${formData.startDate}T${formData.startTime}:00`
      const endDateTime = `${formData.endDate}T${formData.endTime}:00`

      const result = await createCustomEventRequest({
        title: formData.title,
        description: formData.description || undefined,
        startDateTime,
        endDateTime,
        locationName: formData.locationName || undefined,
        locationAddress: formData.locationAddress || undefined,
        notes: formData.notes || undefined,
        expectedAttendees: formData.expectedAttendees
          ? parseInt(formData.expectedAttendees)
          : undefined
      })

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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({
                  ...formData,
                  startDate: e.target.value,
                  endDate: formData.endDate || e.target.value
                })}
                min={new Date().toISOString().split('T')[0]}
                className={cn(STYLES.input, errors.startDate && "border-red-300")}
              />
              {errors.startDate && (
                <p className="mt-1 text-xs text-red-500">{errors.startDate}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Time <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                className={cn(STYLES.input, errors.startTime && "border-red-300")}
              />
              {errors.startTime && (
                <p className="mt-1 text-xs text-red-500">{errors.startTime}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                min={formData.startDate || new Date().toISOString().split('T')[0]}
                className={cn(STYLES.input, errors.endDate && "border-red-300")}
              />
              {errors.endDate && (
                <p className="mt-1 text-xs text-red-500">{errors.endDate}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Time <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                className={cn(STYLES.input, errors.endTime && "border-red-300")}
              />
              {errors.endTime && (
                <p className="mt-1 text-xs text-red-500">{errors.endTime}</p>
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
              <input
                type="text"
                value={formData.locationAddress}
                onChange={(e) => setFormData({ ...formData, locationAddress: e.target.value })}
                className={STYLES.input}
                placeholder="Full address"
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
