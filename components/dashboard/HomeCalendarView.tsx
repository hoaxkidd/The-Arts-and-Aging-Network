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
  const hasUpcomingEvents = events.some(e => new Date(e.endDateTime) >= new Date())

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-primary-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-500 text-white flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">
                {date.toLocaleDateString('en-US', { weekday: 'long' })}
              </h2>
              <p className="text-sm text-gray-500">
                {date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Events List */}
        <div className="p-4 max-h-[400px] overflow-auto">
          {events.length > 0 ? (
            <div className="space-y-3">
              {events.map(event => {
                const eventStart = new Date(event.startDateTime)
                const eventEnd = new Date(event.endDateTime)
                const isPastEvent = eventEnd < new Date()

                const getStatusConfig = () => {
                  if (isPastEvent) {
                    return {
                      color: 'bg-gray-400',
                      bg: 'bg-gray-50 border-gray-200',
                      text: 'text-gray-600',
                      label: 'Past Event',
                      icon: <Clock className="w-3.5 h-3.5" />
                    }
                  }
                  if (event.myRequestStatus === 'APPROVED') {
                    return {
                      color: 'bg-green-500',
                      bg: 'bg-green-50 border-green-200',
                      text: 'text-green-700',
                      label: 'Participating',
                      icon: <CheckCircle className="w-3.5 h-3.5" />
                    }
                  }
                  if (event.myRequestStatus === 'PENDING') {
                    return {
                      color: 'bg-yellow-500',
                      bg: 'bg-yellow-50 border-yellow-200',
                      text: 'text-yellow-700',
                      label: 'Pending',
                      icon: <Clock className="w-3.5 h-3.5" />
                    }
                  }
                  return {
                    color: 'bg-blue-500',
                    bg: 'bg-blue-50 border-blue-200',
                    text: 'text-blue-700',
                    label: 'Available',
                    icon: <Calendar className="w-3.5 h-3.5" />
                  }
                }

                const statusConfig = getStatusConfig()

                return (
                  <button
                    key={event.id}
                    onClick={() => onEventClick(event)}
                    className={cn(
                      "w-full rounded-xl border text-left transition-all hover:shadow-md hover:-translate-y-0.5",
                      statusConfig.bg
                    )}
                  >
                    {/* Time header strip */}
                    <div className={cn("px-4 py-2 flex items-center gap-2", statusConfig.color)}>
                      <Clock className="w-4 h-4 text-white" />
                      <span className="text-sm font-semibold text-white">
                        {eventStart.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - 
                        {eventEnd.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </span>
                    </div>
                    
                    {/* Event details */}
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-gray-900 truncate">{event.title}</h3>
                          {event.location && (
                            <div className="flex items-center gap-1.5 mt-1 text-sm text-gray-500">
                              <MapPin className="w-3.5 h-3.5" />
                              <span className="truncate">{event.location.name}</span>
                            </div>
                          )}
                        </div>
                        <ExternalLink className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      </div>
                      
                      {/* Status badge */}
                      <div className="mt-3 flex items-center justify-between">
                        <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold", statusConfig.color, "bg-white/80")}>
                          <span className={statusConfig.text}>{statusConfig.icon}</span>
                          <span className={statusConfig.text}>{statusConfig.label}</span>
                        </span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          ) : (
            /* Empty State */
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Empty Day</h3>
              <p className="text-sm text-gray-500 mb-5">No events scheduled for this day.</p>
              
              {!isPastDate && (
                <button
                  onClick={onCreateEvent}
                  className={cn(STYLES.btn, STYLES.btnPrimary, "w-full py-3")}
                >
                  <Plus className="w-5 h-5" />
                  Request Custom Event
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer - Request Event for future dates */}
        {!isPastDate && events.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
            <button
              onClick={onCreateEvent}
              className="w-full px-4 py-3 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Request Custom Event
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
  const [moreEventsDate, setMoreEventsDate] = useState<Date | null>(null)

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

  // Always use 6 rows × 7 columns = 42 cells for consistent sizing across all months
  const TOTAL_CELLS = 42
  const ROWS = 6

  // Generate calendar grid with 42 cells total
  const days: { date: Date | null; key: string; isPadding: boolean }[] = []
  const currentMonth = currentDate.getMonth()
  const currentYear = currentDate.getFullYear()
  
  // Add empty cells before the month starts
  for (let i = 0; i < firstDay; i++) {
    days.push({ date: null, key: `empty-start-${i}`, isPadding: true })
  }
  
  // Add days of the month
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({ 
      date: new Date(currentYear, currentMonth, i),
      key: `day-${currentYear}-${currentMonth}-${i}`,
      isPadding: false
    })
  }
  
  // Add padding cells at the end to complete 42 cells
  const paddingNeeded = TOTAL_CELLS - days.length
  for (let i = 0; i < paddingNeeded; i++) {
    days.push({ date: null, key: `empty-end-${i}`, isPadding: true })
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
              id="home-calendar-search"
              name="searchEvents"
              type="search"
              placeholder="Search events..."
              aria-label="Search events"
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
      <div className="flex-1 min-h-0 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
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
            <div key={day} className="py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid - 6 rows × 7 columns = 42 cells, all equal size */}
        <div className="flex-1 min-h-0 p-3 overflow-hidden">
          <div 
            className="h-full grid grid-cols-7 grid-rows-6 gap-2"
          >
          {days.map((day) => {
            const date = day.date
            const dateEvents = date ? getEventsForDate(date) : []
            const isToday = date?.toDateString() === new Date().toDateString()
            const isPast = date ? date < new Date(new Date().setHours(0, 0, 0, 0)) : false
            const isFuture = date ? date >= new Date(new Date().setHours(0, 0, 0, 0)) : false
            const dateStatus = date ? getDateStatus(date) : null
            const hasEvents = dateEvents.length > 0

            const getCellBackground = () => {
              if (!date) return 'bg-gray-100/30'
              if (!hasEvents) return isPast ? 'bg-gray-100/50' : 'bg-gray-50 hover:bg-gray-100'
              if (dateStatus === 'approved') return 'bg-green-50 hover:bg-green-100'
              if (dateStatus === 'pending') return 'bg-yellow-50 hover:bg-yellow-100'
              if (dateStatus === 'available') return 'bg-blue-50 hover:bg-blue-100'
              return 'bg-gray-100 hover:bg-gray-200'
            }

            return (
              <div
                key={day.key}
                onClick={() => date && (hasEvents || isFuture) && handleDateClick(date)}
                className={cn(
                  "min-h-0 rounded-lg transition-all relative flex flex-col overflow-hidden",
                  day.isPadding ? 'invisible' : getCellBackground(),
                  date && (hasEvents || isFuture) ? 'cursor-pointer hover:shadow-md' : 'cursor-default'
                )}
              >
                {date && (
                  <>
                    {/* Date number */}
                    <div className="flex items-center justify-between p-2">
                      <div className={cn(
                        "text-sm font-bold flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full",
                        isToday
                          ? 'bg-primary-600 text-white'
                          : dateStatus === 'approved'
                          ? 'text-green-700 bg-green-100'
                          : dateStatus === 'pending'
                          ? 'text-yellow-700 bg-yellow-100'
                          : dateStatus === 'available'
                          ? 'text-blue-700 bg-blue-100'
                          : isPast && !hasEvents
                          ? 'text-gray-400'
                          : 'text-gray-700'
                      )}>
                        {date.getDate()}
                      </div>
                    </div>
                    {/* Event pills - max 2 events */}
                    <div className="flex-1 min-h-0 overflow-hidden px-2 pb-2 space-y-1">
                      {dateEvents.slice(0, 2).map(event => (
                        <div
                          key={event.id}
                          className={cn(
                            "text-xs px-2 py-1 rounded-md truncate font-medium shadow-sm",
                            event.myRequestStatus === 'APPROVED'
                              ? 'bg-green-500 text-white'
                              : event.myRequestStatus === 'PENDING'
                              ? 'bg-yellow-500 text-white'
                              : isPast
                              ? 'bg-gray-200 text-gray-700'
                              : 'bg-blue-500 text-white'
                          )}
                          title={event.title}
                        >
                          <span className="flex items-center gap-1">
                            {event.myRequestStatus === 'APPROVED' && <CheckCircle className="w-3 h-3 flex-shrink-0" />}
                            {event.myRequestStatus === 'PENDING' && <Clock className="w-3 h-3 flex-shrink-0" />}
                            <span className="truncate">{event.title}</span>
                          </span>
                        </div>
                      ))}
                      {dateEvents.length > 2 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setMoreEventsDate(date)
                          }}
                          className={cn(
                            "w-full text-xs pl-2 py-1 font-medium rounded text-left hover:underline flex items-center gap-1",
                            dateStatus === 'approved' ? 'text-green-600' :
                            dateStatus === 'pending' ? 'text-yellow-600' :
                            dateStatus === 'available' ? 'text-blue-600' : 'text-gray-500'
                          )}
                        >
                          <Calendar className="w-3 h-3" />
                          {dateEvents.length - 2} more events available
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
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

      {/* More Events Popup */}
      {moreEventsDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMoreEventsDate(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-primary-50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-500 text-white flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-gray-900">
                    {moreEventsDate.toLocaleDateString('en-US', { weekday: 'long' })}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {moreEventsDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              </div>
              <button onClick={() => setMoreEventsDate(null)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Events List */}
            <div className="p-4 max-h-[400px] overflow-auto">
              <div className="space-y-3">
                {getEventsForDate(moreEventsDate).map(event => {
                  const eventStart = new Date(event.startDateTime)
                  const eventEnd = new Date(event.endDateTime)
                  const isPastEvent = eventEnd < new Date()

                  const getStatusConfig = () => {
                    if (isPastEvent) {
                      return {
                        color: 'bg-gray-400',
                        bg: 'bg-gray-50 border-gray-200',
                        text: 'text-gray-600',
                        label: 'Past Event',
                        icon: <Clock className="w-3.5 h-3.5" />
                      }
                    }
                    if (event.myRequestStatus === 'APPROVED') {
                      return {
                        color: 'bg-green-500',
                        bg: 'bg-green-50 border-green-200',
                        text: 'text-green-700',
                        label: 'Participating',
                        icon: <CheckCircle className="w-3.5 h-3.5" />
                      }
                    }
                    if (event.myRequestStatus === 'PENDING') {
                      return {
                        color: 'bg-yellow-500',
                        bg: 'bg-yellow-50 border-yellow-200',
                        text: 'text-yellow-700',
                        label: 'Pending',
                        icon: <Clock className="w-3.5 h-3.5" />
                      }
                    }
                    return {
                      color: 'bg-blue-500',
                      bg: 'bg-blue-50 border-blue-200',
                      text: 'text-blue-700',
                      label: 'Available',
                      icon: <Calendar className="w-3.5 h-3.5" />
                    }
                  }

                  const statusConfig = getStatusConfig()

                  return (
                    <button
                      key={event.id}
                      onClick={() => {
                        setMoreEventsDate(null)
                        handleEventFromPopup(event)
                      }}
                      className={cn(
                        "w-full rounded-xl border text-left transition-all hover:shadow-md hover:-translate-y-0.5",
                        statusConfig.bg
                      )}
                    >
                      {/* Time header strip */}
                      <div className={cn("px-4 py-2 flex items-center gap-2", statusConfig.color)}>
                        <Clock className="w-4 h-4 text-white" />
                        <span className="text-sm font-semibold text-white">
                          {eventStart.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - 
                          {eventEnd.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </span>
                      </div>
                      
                      {/* Event details */}
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-gray-900 truncate">{event.title}</h3>
                            {event.location && (
                              <div className="flex items-center gap-1.5 mt-1 text-sm text-gray-500">
                                <MapPin className="w-3.5 h-3.5" />
                                <span className="truncate">{event.location.name}</span>
                              </div>
                            )}
                          </div>
                          <ExternalLink className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        </div>
                        
                        {/* Status badge */}
                        <div className="mt-3 flex items-center justify-between">
                          <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold", statusConfig.color, "bg-white/80")}>
                            <span className={statusConfig.text}>{statusConfig.icon}</span>
                            <span className={statusConfig.text}>{statusConfig.label}</span>
                          </span>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
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
