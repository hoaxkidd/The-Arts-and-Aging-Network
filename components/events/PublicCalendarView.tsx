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
  ExternalLink
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

// Date Events Popup Modal
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
                      isPastEvent
                        ? "bg-gray-50 border-gray-200 hover:bg-gray-100"
                        : "bg-primary-50 border-primary-200 hover:bg-primary-100"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn(
                            "px-1.5 py-0.5 text-[10px] font-medium rounded",
                            isPastEvent
                              ? "bg-gray-100 text-gray-600"
                              : "bg-primary-100 text-primary-700"
                          )}>
                            {isPastEvent ? 'Past' : 'Upcoming'}
                          </span>
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
              {!isPastDate && canCreate && (
                <button
                  onClick={onCreateEvent}
                  className={cn(STYLES.btn, STYLES.btnPrimary, "text-sm")}
                >
                  <Plus className="w-4 h-4" />
                  Create Event
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer - Create Event for future dates */}
        {!isPastDate && canCreate && events.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
            <button
              onClick={onCreateEvent}
              className="w-full px-3 py-2 text-sm text-primary-600 hover:bg-primary-50 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Event for this Date
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

  // Roles that can create events
  const createEventRoles = ['ADMIN', 'HOME_ADMIN', 'FACILITATOR']
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

  const handleDateClick = (date: Date) => {
    setSelectedDate(date)
  }

  const handleEventFromPopup = (event: CalendarEvent) => {
    setSelectedDate(null)
    router.push(`/events/${event.id}`)
  }

  const getCreateEventUrl = () => {
    if (userRole === 'ADMIN') return '/admin/events'
    if (userRole === 'HOME_ADMIN') return '/dashboard/requests/new'
    if (userRole === 'FACILITATOR') return '/staff/events'
    return '/events'
  }

  const handleCreateEventFromPopup = () => {
    if (!selectedDate) return
    setSelectedDate(null)
    router.push(getCreateEventUrl())
  }

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Search and Actions Bar */}
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
            const hasEvents = dateEvents.length > 0
            const hasUpcoming = dateEvents.some(e => new Date(e.endDateTime) >= new Date())

            // Get cell background color
            const getCellBackground = () => {
              if (!date) return 'bg-gray-50/30'
              if (!hasEvents) return isPast ? 'bg-gray-50/50' : 'bg-white hover:bg-gray-50'
              if (hasUpcoming) return 'bg-primary-50 hover:bg-primary-100'
              return 'bg-gray-100 hover:bg-gray-200'
            }

            return (
              <div
                key={index}
                onClick={() => date && (hasEvents || (isFuture && showCreateButton)) && handleDateClick(date)}
                className={cn(
                  "p-1.5 overflow-hidden transition-all relative",
                  getCellBackground(),
                  date && (hasEvents || (isFuture && showCreateButton)) ? 'cursor-pointer' : 'cursor-default'
                )}
              >
                {date && (
                  <div className="h-full flex flex-col">
                    <div className="flex items-center justify-between mb-1">
                      <div className={cn(
                        "text-xs font-semibold flex-shrink-0",
                        isToday
                          ? 'bg-primary-600 text-white w-6 h-6 rounded-full flex items-center justify-center'
                          : hasUpcoming
                          ? 'text-primary-700'
                          : isPast && !hasEvents
                          ? 'text-gray-400'
                          : hasEvents
                          ? 'text-gray-600'
                          : 'text-gray-700'
                      )}>
                        {date.getDate()}
                      </div>
                      {/* Event count badge */}
                      {hasEvents && (
                        <div className={cn(
                          "text-[9px] font-bold px-1.5 py-0.5 rounded-full",
                          hasUpcoming
                            ? 'bg-primary-200 text-primary-800'
                            : 'bg-gray-200 text-gray-700'
                        )}>
                          {dateEvents.length}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-h-0 space-y-0.5 overflow-hidden">
                      {dateEvents.slice(0, 2).map(event => {
                        const eventIsPast = new Date(event.endDateTime) < new Date()
                        return (
                          <div
                            key={event.id}
                            className={cn(
                              "text-[10px] px-1.5 py-0.5 rounded truncate leading-tight font-medium",
                              eventIsPast
                                ? 'bg-gray-200/80 text-gray-700'
                                : 'bg-primary-200/80 text-primary-900'
                            )}
                          >
                            <span className="truncate">{event.title}</span>
                          </div>
                        )
                      })}
                      {dateEvents.length > 2 && (
                        <div className={cn(
                          "text-[9px] pl-1 font-semibold",
                          hasUpcoming ? 'text-primary-600' : 'text-gray-500'
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
          canCreate={showCreateButton}
        />
      )}
    </div>
  )
}
