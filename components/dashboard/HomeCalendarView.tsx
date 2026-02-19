'use client'

import { useState, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Search,
  X,
  Plus,
  Calendar,
  CheckCircle,
  Loader2,
  ExternalLink
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { STYLES } from '@/lib/styles'
import { requestExistingEvent } from '@/app/actions/event-requests'

interface CalendarEvent {
  id: string
  title: string
  startDateTime: string | Date
  endDateTime: string | Date
  status: string
  location?: { name: string } | null
  myRequestStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | null
  requiredFormTemplateId?: string | null
}

// Date Events Popup Modal
function DateEventsPopup({
  date,
  events,
  onClose,
  onEventClick,
  onCreateEvent
}: {
  date: Date
  events: CalendarEvent[]
  onClose: () => void
  onEventClick: (event: CalendarEvent) => void
  onCreateEvent: () => void
}) {
  const isPastDate = date < new Date(new Date().setHours(0, 0, 0, 0))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary-600" />
            <h2 className="font-semibold text-gray-900">
              {date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Events List */}
        <div className="p-4 max-h-[400px] overflow-auto">
          {events.length > 0 ? (
            <div className="space-y-2">
              {events.map(event => {
                const eventStart = new Date(event.startDateTime)
                const eventEnd = new Date(event.endDateTime)
                const isPastEvent = eventEnd < new Date()

                return (
                  <button
                    key={event.id}
                    onClick={() => onEventClick(event)}
                    className={cn(
                      "w-full p-3 rounded-lg border text-left transition-all hover:shadow-sm",
                      event.myRequestStatus === 'APPROVED'
                        ? "bg-green-50 border-green-200 hover:bg-green-100"
                        : event.myRequestStatus === 'PENDING'
                        ? "bg-yellow-50 border-yellow-200 hover:bg-yellow-100"
                        : isPastEvent
                        ? "bg-gray-50 border-gray-200 hover:bg-gray-100"
                        : "bg-blue-50 border-blue-200 hover:bg-blue-100"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {event.myRequestStatus === 'APPROVED' && (
                            <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-[10px] font-medium rounded">
                              Approved
                            </span>
                          )}
                          {event.myRequestStatus === 'PENDING' && (
                            <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 text-[10px] font-medium rounded">
                              Pending
                            </span>
                          )}
                          {!event.myRequestStatus && !isPastEvent && (
                            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-medium rounded">
                              Available
                            </span>
                          )}
                          {isPastEvent && !event.myRequestStatus && (
                            <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-medium rounded">
                              Past
                            </span>
                          )}
                        </div>
                        <h3 className="font-medium text-gray-900 text-sm truncate">{event.title}</h3>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {eventStart.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} -
                            {eventEnd.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                          </span>
                          {event.location && (
                            <span className="flex items-center gap-1 truncate">
                              <MapPin className="w-3 h-3" />
                              {event.location.name}
                            </span>
                          )}
                        </div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    </div>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-6">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Calendar className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500 mb-3">No events on this day</p>
              {!isPastDate && (
                <button
                  onClick={onCreateEvent}
                  className={cn(STYLES.btn, STYLES.btnPrimary, "text-sm")}
                >
                  <Plus className="w-4 h-4" />
                  Create Custom Event
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer - Create Event for future dates */}
        {!isPastDate && events.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
            <button
              onClick={onCreateEvent}
              className="w-full px-3 py-2 text-sm text-primary-600 hover:bg-primary-50 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Custom Event for this Date
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// Event Request Modal
function RequestEventModal({
  event,
  onClose,
  onSubmit,
  isPending
}: {
  event: CalendarEvent
  onClose: () => void
  onSubmit: (notes: string, expectedAttendees: number | undefined) => void
  isPending: boolean
}) {
  const [notes, setNotes] = useState('')
  const [expectedAttendees, setExpectedAttendees] = useState('')

  const eventDate = new Date(event.startDateTime)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Request Event</h2>
                <p className="text-primary-100 text-sm">Submit a participation request</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Event Info */}
        <div className="p-6 space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900">{event.title}</h3>
            <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {eventDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
              </span>
            </div>
            {event.location && (
              <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {event.location.name}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expected Attendees
            </label>
            <input
              type="number"
              min="1"
              value={expectedAttendees}
              onChange={(e) => setExpectedAttendees(e.target.value)}
              className={STYLES.input}
              placeholder="Number of residents"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={cn(STYLES.input, "h-20 resize-none")}
              placeholder="Any special requirements or notes for the administrator..."
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={onClose}
              disabled={isPending}
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => onSubmit(notes, expectedAttendees ? parseInt(expectedAttendees) : undefined)}
              disabled={isPending}
              className={cn(STYLES.btn, STYLES.btnPrimary, "flex-1 flex items-center justify-center gap-2")}
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
      </div>
    </div>
  )
}

export function HomeCalendarView({
  events,
  hideSearch = false
}: {
  events: CalendarEvent[]
  hideSearch?: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  // Filter events by search
  const filteredEvents = useMemo(() => {
    if (!searchQuery) return events
    return events.filter(e =>
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.location?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [events, searchQuery])

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay()
  }

  const daysInMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth())
  const firstDay = getFirstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth())

  // Generate calendar grid
  const days = []
  for (let i = 0; i < firstDay; i++) {
    days.push(null)
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i))
  }

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const handleToday = () => {
    setCurrentDate(new Date())
  }

  const getEventsForDate = (date: Date) => {
    return filteredEvents.filter(e => {
      const eventDate = new Date(e.startDateTime)
      return eventDate.getDate() === date.getDate() &&
             eventDate.getMonth() === date.getMonth() &&
             eventDate.getFullYear() === date.getFullYear()
    })
  }

  // Get date status for color coding
  const getDateStatus = (date: Date) => {
    const dateEvents = getEventsForDate(date)
    if (dateEvents.length === 0) return null

    const hasApproved = dateEvents.some(e => e.myRequestStatus === 'APPROVED')
    const hasPending = dateEvents.some(e => e.myRequestStatus === 'PENDING')
    const hasAvailable = dateEvents.some(e => !e.myRequestStatus && e.status === 'PUBLISHED')

    if (hasApproved) return 'approved'
    if (hasPending) return 'pending'
    if (hasAvailable) return 'available'
    return 'events'
  }

  const handleDateClick = (date: Date) => {
    // Open the date popup for any date with events, or future dates without events
    setSelectedDate(date)
  }

  const handleEventFromPopup = (event: CalendarEvent) => {
    setSelectedDate(null)
    const eventEnd = new Date(event.endDateTime)
    const isPastEvent = eventEnd < new Date()

    // For approved events, navigate to full event page (messages, photos, comments)
    if (event.myRequestStatus === 'APPROVED') {
      router.push(`/events/${event.id}`)
      return
    }

    // For pending events, navigate to requests page
    if (event.myRequestStatus === 'PENDING') {
      router.push('/dashboard/requests')
      return
    }

    // For past events (no status), navigate to public event page (view only)
    if (isPastEvent) {
      router.push(`/events/${event.id}`)
      return
    }

    // For available future events: if event requires a sign-up form, go to form page; else open request modal
    if (event.requiredFormTemplateId) {
      router.push(`/dashboard/events/${event.id}/sign-up`)
      return
    }
    setSelectedEvent(event)
  }

  const handleCreateEventFromPopup = () => {
    if (!selectedDate) return
    const dateStr = selectedDate.toISOString().split('T')[0]
    setSelectedDate(null)
    router.push(`/dashboard/requests/new?date=${dateStr}`)
  }

  const handleSubmitRequest = (notes: string, expectedAttendees: number | undefined) => {
    if (!selectedEvent) return

    startTransition(async () => {
      const result = await requestExistingEvent(selectedEvent.id, {
        notes: notes || undefined,
        expectedAttendees
      })

      if (result.error) {
        alert(result.error)
      } else {
        setSelectedEvent(null)
        router.refresh()
      }
    })
  }

  return (
    <div className="h-full flex flex-col gap-3">
      {/* Search and Filters */}
      {!hideSearch && (
      <div className="flex-shrink-0 bg-white rounded-lg border border-gray-200 p-3">
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(STYLES.input, "pl-10 py-2")}
            />
          </div>
          <div className="flex items-center gap-3">
            {/* Legend */}
            <div className="hidden md:flex items-center gap-3 text-xs text-gray-500 border-r border-gray-200 pr-3">
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                <span>Available</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
                <span>Pending</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                <span>Approved</span>
              </div>
            </div>
            <Link
              href="/dashboard/requests/new"
              className={cn(STYLES.btn, STYLES.btnPrimary, "py-2")}
            >
              <Plus className="w-4 h-4" />
              Create
            </Link>
          </div>
        </div>
      </div>
      )}

      {/* Calendar */}
      <div className="flex-1 min-h-0 bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
          <h2 className="text-base font-semibold text-gray-900">
            {currentDate.toLocaleDateString('default', { month: 'long', year: 'numeric' })}
          </h2>
          <div className="flex items-center gap-1">
            <button
              onClick={handleToday}
              className="px-3 py-1.5 text-xs font-medium text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
            >
              Today
            </button>
            <button onClick={handlePrevMonth} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>
            <button onClick={handleNextMonth} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Days Header */}
        <div className="flex-shrink-0 grid grid-cols-7 border-b border-gray-200 bg-gray-50">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="py-2 text-center text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 grid grid-cols-7 grid-rows-6 divide-x divide-y divide-gray-100">
          {days.map((date, index) => {
            const dateEvents = date ? getEventsForDate(date) : []
            const isToday = date?.toDateString() === new Date().toDateString()
            const isPast = date ? date < new Date(new Date().setHours(0, 0, 0, 0)) : false
            const isFuture = date ? date >= new Date(new Date().setHours(0, 0, 0, 0)) : false
            const dateStatus = date ? getDateStatus(date) : null
            const hasEvents = dateEvents.length > 0

            // Get cell background color based on status
            const getCellBackground = () => {
              if (!date) return 'bg-gray-50/30'
              if (!hasEvents) return isPast ? 'bg-gray-50/50' : 'bg-white hover:bg-gray-50'
              if (dateStatus === 'approved') return 'bg-green-50 hover:bg-green-100'
              if (dateStatus === 'pending') return 'bg-yellow-50 hover:bg-yellow-100'
              if (dateStatus === 'available') return 'bg-blue-50 hover:bg-blue-100'
              return 'bg-gray-100 hover:bg-gray-200'
            }

            return (
              <div
                key={index}
                onClick={() => date && (hasEvents || isFuture) && handleDateClick(date)}
                className={cn(
                  "p-1.5 overflow-hidden transition-all relative",
                  getCellBackground(),
                  date && (hasEvents || isFuture) ? 'cursor-pointer' : 'cursor-default'
                )}
              >
                {date && (
                  <div className="h-full flex flex-col">
                    <div className="flex items-center justify-between mb-1">
                      <div className={cn(
                        "text-xs font-semibold flex-shrink-0",
                        isToday
                          ? 'bg-primary-600 text-white w-6 h-6 rounded-full flex items-center justify-center'
                          : dateStatus === 'approved'
                          ? 'text-green-700'
                          : dateStatus === 'pending'
                          ? 'text-yellow-700'
                          : dateStatus === 'available'
                          ? 'text-blue-700'
                          : isPast && !hasEvents
                          ? 'text-gray-400'
                          : 'text-gray-700'
                      )}>
                        {date.getDate()}
                      </div>
                      {/* Event count badge */}
                      {hasEvents && (
                        <div className={cn(
                          "text-[9px] font-bold px-1.5 py-0.5 rounded-full",
                          dateStatus === 'approved' && 'bg-green-200 text-green-800',
                          dateStatus === 'pending' && 'bg-yellow-200 text-yellow-800',
                          dateStatus === 'available' && 'bg-blue-200 text-blue-800',
                          dateStatus === 'events' && 'bg-gray-200 text-gray-700'
                        )}>
                          {dateEvents.length}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-h-0 space-y-0.5 overflow-hidden">
                      {dateEvents.slice(0, 2).map(event => (
                        <div
                          key={event.id}
                          className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded truncate leading-tight font-medium",
                            event.myRequestStatus === 'APPROVED'
                              ? 'bg-green-200/80 text-green-900'
                              : event.myRequestStatus === 'PENDING'
                              ? 'bg-yellow-200/80 text-yellow-900'
                              : isPast
                              ? 'bg-gray-200/80 text-gray-700'
                              : 'bg-blue-200/80 text-blue-900'
                          )}
                        >
                          <span className="flex items-center gap-0.5">
                            {event.myRequestStatus === 'APPROVED' && <CheckCircle className="w-2.5 h-2.5 flex-shrink-0" />}
                            {event.myRequestStatus === 'PENDING' && <Clock className="w-2.5 h-2.5 flex-shrink-0" />}
                            <span className="truncate">{event.title}</span>
                          </span>
                        </div>
                      ))}
                      {dateEvents.length > 2 && (
                        <div className={cn(
                          "text-[9px] pl-1 font-semibold",
                          dateStatus === 'approved' ? 'text-green-600' :
                          dateStatus === 'pending' ? 'text-yellow-600' :
                          dateStatus === 'available' ? 'text-blue-600' : 'text-gray-500'
                        )}>
                          +{dateEvents.length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Date Events Popup */}
      {selectedDate && (
        <DateEventsPopup
          date={selectedDate}
          events={getEventsForDate(selectedDate)}
          onClose={() => setSelectedDate(null)}
          onEventClick={handleEventFromPopup}
          onCreateEvent={handleCreateEventFromPopup}
        />
      )}

      {/* Request Modal */}
      {selectedEvent && (
        <RequestEventModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onSubmit={handleSubmitRequest}
          isPending={isPending}
        />
      )}
    </div>
  )
}
