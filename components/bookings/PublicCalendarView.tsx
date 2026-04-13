'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Search,
  Plus,
  Calendar,
  X,
  ExternalLink,
  CheckCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { STYLES } from '@/lib/styles'

interface CalendarEvent {
  id: string
  title: string
  startDateTime: string | Date
  endDateTime: string | Date
  status: string
  location?: { name: string } | null
}

interface PublicCalendarViewProps {
  events: CalendarEvent[]
  userRole: string
  canCreateEvents?: boolean
}

// Date Bookings Popup Modal
function DateEventsPopup({
  date,
  events,
  onClose,
  onEventClick,
  onCreateEvent,
  canCreate
}: {
  date: Date
  events: CalendarEvent[]
  onClose: () => void
  onEventClick: (event: CalendarEvent) => void
  onCreateEvent: () => void
  canCreate: boolean
}) {
  const isPastDate = date < new Date(new Date().setHours(0, 0, 0, 0))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
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

        {/* Bookings List */}
        <div className="p-4 max-h-[400px] overflow-auto">
          {events.length > 0 ? (
            <div className="space-y-3">
              {events.map(event => {
                const eventStart = new Date(event.startDateTime)
                const eventEnd = new Date(event.endDateTime)
                const isPastEvent = eventEnd < new Date()
                const spansMultipleDays = eventStart.toDateString() !== eventEnd.toDateString()

                return (
                  <button
                    key={event.id}
                    onClick={() => onEventClick(event)}
                    className={cn(
                      "w-full rounded-xl border-2 text-left transition-all hover:shadow-md hover:-translate-y-0.5",
                      isPastEvent
                        ? "bg-gray-50 border-gray-200"
                        : "bg-white border-gray-200 hover:border-primary-300"
                    )}
                  >
                    {/* Status bar */}
                    <div className={cn("h-1.5 rounded-t-[10px]", isPastEvent ? "bg-gray-400" : "bg-primary-500")} />
                    
                    {/* Event content */}
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-gray-900 text-sm leading-5 break-words line-clamp-2 min-w-0">{event.title}</h3>
                        <span className="text-xs text-gray-500 flex items-center gap-1 shrink-0 bg-gray-100 px-2 py-1 rounded-full">
                          <Calendar className="w-3 h-3" />
                          Event
                        </span>
                      </div>

                      <div className="mt-3 space-y-2 text-xs text-gray-600">
                        <div className="flex items-start gap-2">
                          <Calendar className="w-4 h-4 mt-0.5 shrink-0 text-primary-600" />
                          <span className="break-words min-w-0 font-medium">
                            {eventStart.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} at {eventStart.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="flex items-start gap-2">
                          <Clock className="w-4 h-4 mt-0.5 shrink-0 text-gray-500" />
                          <span className="break-words min-w-0">
                            Ends: {eventEnd.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} at {eventEnd.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                          </span>
                        </div>
                        {event.location && (
                          <div className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-gray-500" />
                            <span className="break-words min-w-0">{event.location.name}</span>
                          </div>
                        )}
                        {spansMultipleDays && (
                          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-1.5 font-medium">
                            ⚡ Multi-day event
                          </p>
                        )}
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
                <Calendar className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">No bookings scheduled</h3>
              <p className="text-sm text-gray-500 mb-5">There are no bookings on this day.</p>
              
              {!isPastDate && canCreate && (
                <button
                  onClick={onCreateEvent}
                  className={cn(STYLES.btn, STYLES.btnPrimary, "w-full py-3")}
                >
                  <Plus className="w-5 h-5" />
                  Create Booking
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer - Create Booking for future dates */}
        {!isPastDate && canCreate && events.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
            <button
              onClick={onCreateEvent}
              className="w-full px-4 py-3 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <Plus className="w-5 h-5" />
              Create Booking for This Date
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export function PublicCalendarView({
  events,
  userRole,
  canCreateEvents = false
}: PublicCalendarViewProps) {
  const router = useRouter()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [moreEventsDate, setMoreEventsDate] = useState<Date | null>(null)

  // Roles that can create events (ADMIN and HOME_ADMIN only)
  const createEventRoles = ['ADMIN', 'HOME_ADMIN']
  const showCreateButton = canCreateEvents || createEventRoles.includes(userRole)

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

  // Generate calendar grid with 42 real date cells (including adjacent months)
  const days: { date: Date; key: string; isCurrentMonth: boolean }[] = []
  const currentMonth = currentDate.getMonth()
  const currentYear = currentDate.getFullYear()

  const prevMonthDays = getDaysInMonth(currentYear, currentMonth - 1)

  // Add leading days from previous month
  for (let i = 0; i < firstDay; i++) {
    const dayNum = prevMonthDays - firstDay + i + 1
    const date = new Date(currentYear, currentMonth - 1, dayNum)
    days.push({ date, key: `prev-${date.toISOString()}`, isCurrentMonth: false })
  }

  // Add days of the month
  for (let i = 1; i <= daysInMonth; i++) {
    const date = new Date(currentYear, currentMonth, i)
    days.push({
      date,
      key: `cur-${date.toISOString()}`,
      isCurrentMonth: true
    })
  }

  // Add trailing days from next month to complete 42 cells
  const paddingNeeded = TOTAL_CELLS - days.length
  for (let i = 0; i < paddingNeeded; i++) {
    const date = new Date(currentYear, currentMonth + 1, i + 1)
    days.push({ date, key: `next-${date.toISOString()}`, isCurrentMonth: false })
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

  const handleDateClick = (date: Date) => {
    setSelectedDate(date)
  }

  const handleEventFromPopup = (event: CalendarEvent) => {
    setSelectedDate(null)
    router.push(`/bookings/${event.id}`)
  }

  const getCreateEventUrl = () => {
    if (userRole === 'ADMIN') return '/admin/bookings'
    if (userRole === 'HOME_ADMIN') return '/dashboard/requests/new'
    return '/bookings'
  }

  const handleCreateEventFromPopup = () => {
    if (!selectedDate) return
    const dateStr = selectedDate.toISOString().split('T')[0]
    setSelectedDate(null)
    if (userRole === 'ADMIN') {
      router.push(`/admin/bookings/new?date=${dateStr}`)
    } else if (userRole === 'HOME_ADMIN') {
      router.push(`/dashboard/requests/new?date=${dateStr}`)
    } else {
      router.push(getCreateEventUrl())
    }
  }

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Search and Actions Bar */}
      <div className="flex-shrink-0 bg-white rounded-lg border border-gray-200 p-3">
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              id="public-calendar-search"
              name="searchEvents"
              type="search"
              placeholder="Search bookings..."
              aria-label="Search bookings"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(STYLES.input, "pl-10 py-2")}
            />
          </div>
          <div className="flex items-center gap-3">
            {/* Legend */}
            <div className="hidden md:flex items-center gap-3 text-xs text-gray-500 border-r border-gray-200 pr-3">
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-full bg-primary-500"></div>
                <span>Upcoming</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-full bg-gray-400"></div>
                <span>Past</span>
              </div>
            </div>
            {showCreateButton && (
              <Link
                href={getCreateEventUrl()}
                className={cn(STYLES.btn, STYLES.btnPrimary, "py-2")}
              >
                <Plus className="w-4 h-4" />
                Create
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className="flex-1 min-h-0 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
          <h2 className="text-base font-semibold text-gray-900">
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
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
            className="h-full min-h-full grid grid-cols-7 gap-2"
            style={{ gridTemplateRows: 'repeat(6, minmax(0, 1fr))' }}
          >
          {days.map((day) => {
            const date = day.date
            const dateEvents = getEventsForDate(date)
            const isToday = date.toDateString() === new Date().toDateString()
            const isPast = date < new Date(new Date().setHours(0, 0, 0, 0))
            const isFuture = date >= new Date(new Date().setHours(0, 0, 0, 0))
            const hasEvents = dateEvents.length > 0
            const hasUpcoming = dateEvents.some(e => new Date(e.endDateTime) >= new Date())

            const getCellBackground = () => {
              if (!day.isCurrentMonth) return hasEvents ? 'bg-blue-50/70 hover:bg-blue-100/80' : 'bg-gray-50 hover:bg-gray-100'
              if (!hasEvents) return isPast ? 'bg-gray-100/50' : 'bg-gray-50 hover:bg-gray-100'
              if (hasUpcoming) return 'bg-blue-50 hover:bg-blue-100'
              return 'bg-gray-100 hover:bg-gray-200'
            }

            const getDateStyle = () => {
              if (isToday) return 'bg-primary-600 text-white'
              if (!day.isCurrentMonth) return hasEvents ? 'text-blue-600 bg-blue-100/80' : 'text-gray-400 bg-gray-100'
              if (hasUpcoming) return 'text-blue-700 bg-blue-100'
              if (isPast && !hasEvents) return 'text-gray-400'
              if (hasEvents) return 'text-gray-600 bg-gray-100'
              return 'text-gray-700'
            }

            return (
              <div
                key={day.key}
                onClick={() => (hasEvents || (isFuture && showCreateButton)) && handleDateClick(date)}
                className={cn(
                  "h-full min-h-0 rounded-lg transition-all relative flex flex-col overflow-hidden",
                  getCellBackground(),
                  (hasEvents || (isFuture && showCreateButton)) ? 'cursor-pointer hover:shadow-md' : 'cursor-default'
                )}
              >
                <>
                    {/* Date number */}
                    <div className="flex items-center justify-between p-2">
                      <div className={cn(
                        "text-sm font-bold flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full",
                        getDateStyle()
                      )}>
                        {date.getDate()}
                      </div>
                    </div>
                    {/* Event pills - max 2 events */}
                    <div className="flex-1 min-h-0 overflow-hidden px-2 pb-2 space-y-1">
                      {dateEvents.slice(0, 2).map(event => {
                        const eventIsPast = new Date(event.endDateTime) < new Date()
                        return (
                          <div
                            key={event.id}
                            className={cn(
                              "text-xs px-2 py-1 rounded-md truncate font-medium shadow-sm",
                              eventIsPast
                                ? 'bg-gray-200 text-gray-700'
                                : 'bg-blue-500 text-white'
                            )}
                            title={event.title}
                          >
                            <span className="flex items-center gap-1">
                              {!eventIsPast && <CheckCircle className="w-3 h-3 flex-shrink-0" />}
                              <span className="truncate">{event.title}</span>
                            </span>
                          </div>
                        )
                      })}
                      {dateEvents.length > 2 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setMoreEventsDate(date)
                          }}
                          className="w-full text-xs pl-2 py-1 font-medium rounded text-left hover:underline flex items-center gap-1 text-blue-600"
                        >
                          <Calendar className="w-3 h-3" />
                          {dateEvents.length - 2} more bookings available
                        </button>
                      )}
                    </div>
                  </>
              </div>
            )
          })}
          </div>
        </div>
      </div>

      {/* Date Bookings Popup */}
      {selectedDate && (
        <DateEventsPopup
          date={selectedDate}
          events={getEventsForDate(selectedDate)}
          onClose={() => setSelectedDate(null)}
          onEventClick={handleEventFromPopup}
          onCreateEvent={handleCreateEventFromPopup}
          canCreate={showCreateButton}
        />
      )}

      {/* More Bookings Popup */}
      {moreEventsDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMoreEventsDate(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center">
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

            {/* Bookings List */}
            <div className="p-4 max-h-[400px] overflow-auto">
              <div className="space-y-3">
                {getEventsForDate(moreEventsDate).map(event => {
                  const eventStart = new Date(event.startDateTime)
                  const eventEnd = new Date(event.endDateTime)
                  const isPastEvent = eventEnd < new Date()
                  const spansMultipleDays = eventStart.toDateString() !== eventEnd.toDateString()

                  return (
                    <button
                      key={event.id}
                      onClick={() => {
                        setMoreEventsDate(null)
                        handleEventFromPopup(event)
                      }}
                      className={cn(
                        "w-full rounded-xl border text-left transition-all hover:shadow-md hover:-translate-y-0.5",
                        isPastEvent
                          ? "bg-gray-50 border-gray-200"
                          : "bg-blue-50 border-blue-200 hover:bg-blue-100"
                      )}
                    >
                      {/* Time header strip */}
                      <div className={cn("px-4 py-2 flex items-center gap-2", isPastEvent ? "bg-gray-400" : "bg-blue-500")}>
                        <Clock className="w-4 h-4 text-white" />
                        <span className="text-sm font-semibold text-white">
                          {eventStart.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - 
                          {eventEnd.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </span>
                      </div>
                      
                      {/* Booking details */}
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={cn(
                                "px-2 py-0.5 text-xs font-semibold rounded",
                                isPastEvent ? "bg-gray-200 text-gray-600" : "bg-blue-100 text-blue-700"
                              )}>
                                {isPastEvent ? 'Past Booking' : 'Upcoming'}
                              </span>
                            </div>
                            <h3 className="font-semibold text-gray-900">{event.title}</h3>
                            {event.location && (
                              <div className="flex items-center gap-1.5 mt-1 text-sm text-gray-500">
                                <MapPin className="w-3.5 h-3.5" />
                                <span className="truncate">{event.location.name}</span>
                              </div>
                            )}
                            {spansMultipleDays && (
                              <p className="text-xs text-gray-500 mt-1">Ends {eventEnd.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                            )}
                          </div>
                          <ExternalLink className="w-5 h-5 text-gray-400 flex-shrink-0" />
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
    </div>
  )
}
