'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle,
  XCircle,
  Building2,
  Phone,
  Mail,
  Loader2,
  CalendarPlus,
  ExternalLink,
  Info,
  AlertTriangle,
  Camera,
  Accessibility
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { STYLES } from '@/lib/styles'
import { confirmStaffAttendance, withdrawStaffAttendance, staffCheckIn } from '@/app/actions/staff-attendance'

type EventDetail = {
  id: string
  title: string
  description: string | null
  startDateTime: string
  endDateTime: string
  maxAttendees: number
  status: string
  location: {
    id: string
    name: string
    address: string
  } | null
  geriatricHome: {
    id: string
    name: string
    address: string
    contactName: string
    contactPhone: string
    contactEmail: string
    // Important Info fields
    accessibilityInfo?: string | null
    triggerWarnings?: string | null
    accommodations?: string | null
    photoPermissions?: string | null
  } | null
  myAttendance: {
    status: string
    checkInTime: string | null
  } | null
  eventStatus: 'upcoming' | 'check-in-open' | 'in-progress' | 'past'
  canCheckIn: boolean
  stats: {
    confirmedStaffCount: number
    checkedInStaffCount: number
    spotsRemaining: number
  }
  confirmedStaff: Array<{
    user: { id: string; name: string; role: string }
    checkInTime: string | null
  }>
}

export function StaffEventDetail({ event }: { event: EventDetail }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [action, setAction] = useState<'confirm' | 'withdraw' | 'checkin' | null>(null)

  const eventDate = new Date(event.startDateTime)
  const endDate = new Date(event.endDateTime)
  const isConfirmed = event.myAttendance?.status === 'YES'
  const isCheckedIn = !!event.myAttendance?.checkInTime
  const isFull = event.stats.spotsRemaining <= 0

  // Check-in opens 24 hours before event
  const now = new Date()
  const checkInOpenTime = new Date(eventDate.getTime() - 24 * 60 * 60 * 1000)
  const canCheckInNow = isConfirmed && !isCheckedIn && event.eventStatus !== 'past' && now >= checkInOpenTime

  const handleConfirm = () => {
    setAction('confirm')
    startTransition(async () => {
      const result = await confirmStaffAttendance(event.id)
      if (result.error) alert(result.error)
      router.refresh()
      setAction(null)
    })
  }

  const handleWithdraw = () => {
    setAction('withdraw')
    startTransition(async () => {
      const result = await withdrawStaffAttendance(event.id)
      if (result.error) alert(result.error)
      router.refresh()
      setAction(null)
    })
  }

  const handleCheckIn = () => {
    setAction('checkin')
    startTransition(async () => {
      const result = await staffCheckIn(event.id)
      if (result.error) alert(result.error)
      router.refresh()
      setAction(null)
    })
  }

  // Generate calendar link
  const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${eventDate.toISOString().replace(/[-:]/g, '').replace('.000', '')}/${endDate.toISOString().replace(/[-:]/g, '').replace('.000', '')}&location=${encodeURIComponent(event.location?.address || '')}&details=${encodeURIComponent(event.description || '')}`

  return (
    <div className="h-full flex flex-col">
      {/* Compact Header */}
      <header className="flex-shrink-0 pb-3">
        <Link
          href="/staff/events"
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 mb-2"
        >
          <ArrowLeft className="w-3 h-3" />
          Back to Events
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={cn(
              "px-2 py-0.5 rounded text-[10px] font-medium",
              event.eventStatus === 'past' ? "bg-gray-100 text-gray-600" :
              event.eventStatus === 'in-progress' ? "bg-green-100 text-green-700" :
              event.eventStatus === 'check-in-open' ? "bg-yellow-100 text-yellow-700" :
              "bg-blue-100 text-blue-700"
            )}>
              {event.eventStatus === 'past' ? 'Past' :
               event.eventStatus === 'in-progress' ? 'In Progress' :
               event.eventStatus === 'check-in-open' ? 'Check-In Open' :
               'Upcoming'}
            </span>
            {isConfirmed && (
              <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-[10px] font-medium flex items-center gap-0.5">
                <CheckCircle className="w-2.5 h-2.5" /> Confirmed
              </span>
            )}
            {isCheckedIn && (
              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-[10px] font-medium flex items-center gap-0.5">
                <CheckCircle className="w-2.5 h-2.5" /> Checked In
              </span>
            )}
          </div>
        </div>
        <h1 className="text-lg font-bold text-gray-900 mt-1">{event.title}</h1>
      </header>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-auto space-y-4">
        {/* Action Banner */}
        {event.eventStatus !== 'past' && (
          <div className={cn(
            "rounded-lg p-3 flex items-center justify-between gap-3",
            canCheckInNow ? "bg-green-50 border border-green-200" :
            isConfirmed ? "bg-blue-50 border border-blue-200" :
            "bg-gray-50 border border-gray-200"
          )}>
            <div className="flex items-center gap-2">
              {canCheckInNow ? (
                <>
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-green-700">Check-in is available</p>
                    <p className="text-[10px] text-green-600">Confirm your attendance now</p>
                  </div>
                </>
              ) : isConfirmed ? (
                <>
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <CalendarPlus className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-700">You're confirmed!</p>
                    <p className="text-[10px] text-blue-600">Check-in opens 24 hours before event</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Users className="w-4 h-4 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">{isFull ? 'Event is full' : `${event.stats.spotsRemaining} spots remaining`}</p>
                    <p className="text-[10px] text-gray-500">Confirm your attendance to join</p>
                  </div>
                </>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              {canCheckInNow && (
                <button
                  onClick={handleCheckIn}
                  disabled={isPending}
                  className="px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isPending && action === 'checkin' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle className="w-3.5 h-3.5" />
                  )}
                  Check In
                </button>
              )}
              {isConfirmed && !isCheckedIn && !canCheckInNow && (
                <a
                  href={calendarUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 flex items-center gap-1.5"
                >
                  <CalendarPlus className="w-3.5 h-3.5" />
                  Add to Calendar
                </a>
              )}
              {isConfirmed && !isCheckedIn ? (
                <button
                  onClick={handleWithdraw}
                  disabled={isPending}
                  className="px-3 py-1.5 bg-white text-red-600 text-sm font-medium rounded-lg border border-red-200 hover:bg-red-50 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isPending && action === 'withdraw' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5" />
                  )}
                  Withdraw
                </button>
              ) : !isConfirmed && !isFull && (
                <button
                  onClick={handleConfirm}
                  disabled={isPending}
                  className={cn(STYLES.btn, STYLES.btnPrimary, "text-sm py-1.5")}
                >
                  {isPending && action === 'confirm' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle className="w-3.5 h-3.5" />
                  )}
                  Confirm
                </button>
              )}
            </div>
          </div>
        )}

        {/* Event Info Card */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="grid sm:grid-cols-2 gap-4">
            {/* Left: Details */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-4 h-4 text-primary-600" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase">Date</p>
                  <p className="text-sm font-medium text-gray-900">
                    {eventDate.toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Clock className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase">Time</p>
                  <p className="text-sm font-medium text-gray-900">
                    {eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - {endDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              {event.location && (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase">Location</p>
                    <p className="text-sm font-medium text-gray-900">{event.location.name}</p>
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(event.location.address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary-600 hover:underline flex items-center gap-0.5"
                    >
                      Get Directions <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Stats */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <Users className="w-4 h-4 text-blue-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-blue-700">{event.stats.confirmedStaffCount}</p>
                <p className="text-[10px] text-blue-600">Confirmed</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <CheckCircle className="w-4 h-4 text-green-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-green-700">{event.stats.checkedInStaffCount}</p>
                <p className="text-[10px] text-green-600">Checked In</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center col-span-2">
                <p className="text-lg font-bold text-gray-700">{event.stats.spotsRemaining}</p>
                <p className="text-[10px] text-gray-500">Spots Remaining</p>
              </div>
            </div>
          </div>

          {/* Description */}
          {event.description && (
            <div className="mt-4 pt-3 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-500 mb-1">Description</p>
              <p className="text-sm text-gray-600">{event.description}</p>
            </div>
          )}
        </div>

        {/* Geriatric Home Info */}
        {event.geriatricHome && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50">
              <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-orange-500" />
                Hosting Facility
              </h2>
            </div>
            <div className="p-4">
              <p className="font-medium text-gray-900">{event.geriatricHome.name}</p>
              <p className="text-sm text-gray-500 mt-1">{event.geriatricHome.address}</p>

              <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                <p className="text-xs font-medium text-gray-500">Contact Information</p>
                <div className="space-y-1.5">
                  <p className="text-sm text-gray-600 flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-gray-400" />
                    {event.geriatricHome.contactName}
                  </p>
                  <a
                    href={`tel:${event.geriatricHome.contactPhone}`}
                    className="text-sm text-gray-600 hover:text-primary-600 flex items-center gap-2"
                  >
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    {event.geriatricHome.contactPhone}
                  </a>
                  <a
                    href={`mailto:${event.geriatricHome.contactEmail}`}
                    className="text-sm text-gray-600 hover:text-primary-600 flex items-center gap-2"
                  >
                    <Mail className="w-3.5 h-3.5 text-gray-400" />
                    {event.geriatricHome.contactEmail}
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Important Info for Staff */}
        {event.geriatricHome && (event.geriatricHome.accessibilityInfo || event.geriatricHome.triggerWarnings || event.geriatricHome.accommodations || event.geriatricHome.photoPermissions) && (
          <div className="bg-blue-50 rounded-lg border border-blue-200 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-blue-200 bg-blue-100/50">
              <h2 className="text-sm font-semibold text-blue-900 flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-600" />
                Important Info for This Facility
              </h2>
            </div>
            <div className="p-4 space-y-4">
              {/* Accessibility */}
              {event.geriatricHome.accessibilityInfo && (() => {
                const access = JSON.parse(event.geriatricHome.accessibilityInfo)
                const hasFeatures = access.wheelchair || access.hearingLoop || access.elevator || access.notes
                if (!hasFeatures) return null
                return (
                  <div>
                    <p className="text-xs font-medium text-blue-800 flex items-center gap-1 mb-2">
                      <Accessibility className="w-3 h-3" />
                      Accessibility
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {access.wheelchair && (
                        <span className="text-xs px-2 py-1 bg-white rounded-full text-blue-700 border border-blue-200">
                          Wheelchair Accessible
                        </span>
                      )}
                      {access.hearingLoop && (
                        <span className="text-xs px-2 py-1 bg-white rounded-full text-blue-700 border border-blue-200">
                          Hearing Loop
                        </span>
                      )}
                      {access.elevator && (
                        <span className="text-xs px-2 py-1 bg-white rounded-full text-blue-700 border border-blue-200">
                          Elevator Available
                        </span>
                      )}
                    </div>
                    {access.notes && (
                      <p className="text-sm text-blue-700 mt-2">{access.notes}</p>
                    )}
                  </div>
                )
              })()}

              {/* Trigger Warnings */}
              {event.geriatricHome.triggerWarnings && (
                <div>
                  <p className="text-xs font-medium text-amber-800 flex items-center gap-1 mb-1">
                    <AlertTriangle className="w-3 h-3" />
                    Staff Awareness
                  </p>
                  <p className="text-sm text-amber-700 bg-amber-50 rounded p-2 border border-amber-200">
                    {event.geriatricHome.triggerWarnings}
                  </p>
                </div>
              )}

              {/* Accommodations */}
              {event.geriatricHome.accommodations && (
                <div>
                  <p className="text-xs font-medium text-blue-800 mb-1">Special Accommodations</p>
                  <p className="text-sm text-blue-700">{event.geriatricHome.accommodations}</p>
                </div>
              )}

              {/* Photo Permissions */}
              {event.geriatricHome.photoPermissions && (() => {
                const photo = JSON.parse(event.geriatricHome.photoPermissions)
                if (!photo.formReceived && !photo.restrictions) return null
                return (
                  <div>
                    <p className="text-xs font-medium text-purple-800 flex items-center gap-1 mb-1">
                      <Camera className="w-3 h-3" />
                      Photo Permissions
                    </p>
                    <div className="text-sm text-purple-700 space-y-1">
                      {photo.formReceived ? (
                        <p className="flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-green-600" />
                          Permission form received
                        </p>
                      ) : (
                        <p className="flex items-center gap-1 text-amber-600">
                          <AlertTriangle className="w-3 h-3" />
                          No permission form on file
                        </p>
                      )}
                      {photo.restrictions && (
                        <p className="bg-purple-50 rounded p-2 border border-purple-200">
                          {photo.restrictions}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>
        )}

        {/* Confirmed Staff */}
        {event.confirmedStaff.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50">
              <h2 className="text-sm font-semibold text-gray-900">Confirmed Staff ({event.confirmedStaff.length})</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {event.confirmedStaff.map((attendance) => (
                <div key={attendance.user.id} className="px-4 py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center text-xs font-medium text-gray-600">
                      {attendance.user.name?.charAt(0) || '?'}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{attendance.user.name}</p>
                      <p className="text-[10px] text-gray-500">{attendance.user.role}</p>
                    </div>
                  </div>
                  {attendance.checkInTime && (
                    <span className="text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                      <CheckCircle className="w-2.5 h-2.5" />
                      {new Date(attendance.checkInTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
