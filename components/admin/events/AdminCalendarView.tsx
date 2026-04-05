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
  X,
  Plus,
  Calendar,
  CheckCircle,
  ExternalLink,
  Edit,
  Users,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { STYLES } from '@/lib/styles'

// Type definition aligned with Admin requirements
interface CalendarEvent {
  id: string
  title: string
  startDateTime: string | Date
  endDateTime: string | Date
  status: string
  location?: { name: string } | null
  attendances: { id: string; status: string }[]
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
                const attendeeCount = event.attendances.filter(a => a.status === 'YES').length

                return (
                  <button
                    key={event.id}
                    onClick={() => onEventClick(event)}
                    className={cn(
                      "w-full p-3 rounded-lg border text-left transition-all hover:shadow-sm group",
                      isPastEvent
                        ? "bg-gray-50 border-gray-200 hover:bg-gray-100"
                        : "bg-white border-gray-200 hover:border-primary-300 hover:bg-primary-50"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-medium text-gray-900 text-sm truncate group-hover:text-primary-700">{event.title}</h3>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {eventStart.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                          </span>
                          {event.location && (
                            <span className="flex items-center gap-1 truncate">
                              <MapPin className="w-3 h-3" />
                              {event.location.name}
                            </span>
                          )}
                           <span className="flex items-center gap-1 truncate">
                              <Users className="w-3 h-3" />
                              {attendeeCount}
                            </span>
                        </div>
                      </div>
                      <Edit className="w-4 h-4 text-gray-400 group-hover:text-primary-600 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
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
              <button
                onClick={onCreateEvent}
                className={cn(STYLES.btn, STYLES.btnPrimary, "text-sm")}
              >
                <Plus className="w-4 h-4" />
                Create Event
              </button>
            </div>
          )}
        </div>

        {/* Footer - Create Event for future dates */}
        {events.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
            <button
              onClick={onCreateEvent}
              className="w-full px-3 py-2 text-sm text-primary-600 hover:bg-primary-50 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Another Event
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export function AdminCalendarView({
  events
}: {
  events: CalendarEvent[]
}) {
  const router = useRouter()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [searchQuery, setSearchQuery] = useState('')
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

  const handleDateClick = (date: Date) => {
    setSelectedDate(date)
  }

  const handleEventFromPopup = (event: CalendarEvent) => {
    // Admin action: Edit Event
    router.push(`/admin/events/${event.id}/edit`)
  }

  const handleCreateEventFromPopup = () => {
    if (!selectedDate) return
    const dateStr = selectedDate.toISOString().split('T')[0]
    setSelectedDate(null)
    router.push(`/admin/events/new?date=${dateStr}`)
  }

  return (
    <div className="h-full flex flex-col gap-3">
      {/* Search and Filters */}
      <div className="flex-shrink-0 bg-white rounded-lg border border-gray-200 p-3">
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              id="admin-calendar-search"
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
             <div className="flex items-center gap-3 text-xs text-gray-500 border-r border-gray-200 pr-3">
                <div className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                    <span>Event</span>
                </div>
            </div>
            <Link
              href="/admin/events/new"
              className={cn(STYLES.btn, STYLES.btnPrimary, "py-2")}
            >
              <Plus className="w-4 h-4" />
              Create
            </Link>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className="flex-1 min-h-0 bg-white rounded-lg border border-gray-200 flex flex-col overflow-hidden">
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
            const hasEvents = dateEvents.length > 0

            const getCellBackground = () => {
              if (!date) return 'bg-gray-100/30'
              if (!hasEvents) return isPast ? 'bg-gray-100/50' : 'bg-gray-50 hover:bg-gray-100'
              return 'bg-blue-50 hover:bg-blue-100'
            }

            const getDateStyle = () => {
              if (isToday) return 'bg-primary-600 text-white'
              if (isPast && !hasEvents) return 'text-gray-400'
              if (hasEvents) return 'text-blue-700 bg-blue-100'
              return 'text-gray-700'
            }

            const getEventStatus = (event: CalendarEvent) => {
              const yesCount = event.attendances.filter(a => a.status === 'YES').length
              const maybeCount = event.attendances.filter(a => a.status === 'MAYBE').length
              if (yesCount > 0) return 'approved'
              if (maybeCount > 0) return 'pending'
              return 'available'
            }

            return (
              <div
                key={day.key}
                onClick={() => date && handleDateClick(date)}
                className={cn(
                  "min-h-0 rounded-lg transition-all relative flex flex-col overflow-hidden cursor-pointer hover:shadow-md",
                  day.isPadding ? 'invisible' : getCellBackground()
                )}
              >
                {date && (
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
                        const status = getEventStatus(event)
                        return (
                          <div
                            key={event.id}
                            className={cn(
                              "text-xs px-2 py-1 rounded-md truncate font-medium shadow-sm",
                              status === 'approved' && 'bg-green-500 text-white',
                              status === 'pending' && 'bg-yellow-500 text-white',
                              status === 'available' && !isPast && 'bg-blue-500 text-white',
                              status === 'available' && isPast && 'bg-gray-200 text-gray-700'
                            )}
                            title={event.title}
                          >
                            <span className="flex items-center gap-1">
                              {status === 'approved' && <CheckCircle className="w-3 h-3 flex-shrink-0" />}
                              {status === 'pending' && <AlertCircle className="w-3 h-3 flex-shrink-0" />}
                              {status === 'available' && !isPast && <CheckCircle className="w-3 h-3 flex-shrink-0" />}
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
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-purple-50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500 text-white flex items-center justify-center">
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
                  const attendeeCount = event.attendances.filter(a => a.status === 'YES').length

                  const getStatusConfig = () => {
                    const yesCount = event.attendances.filter(a => a.status === 'YES').length
                    const maybeCount = event.attendances.filter(a => a.status === 'MAYBE').length
                    
                    if (isPastEvent) {
                      return {
                        color: 'bg-gray-400',
                        bg: 'bg-gray-50 border-gray-200',
                        text: 'text-gray-600',
                        label: 'Past Event',
                        icon: <Clock className="w-3.5 h-3.5" />
                      }
                    }
                    if (yesCount > 0) {
                      return {
                        color: 'bg-green-500',
                        bg: 'bg-green-50 border-green-200',
                        text: 'text-green-700',
                        label: `${attendeeCount} Attending`,
                        icon: <CheckCircle className="w-3.5 h-3.5" />
                      }
                    }
                    if (maybeCount > 0) {
                      return {
                        color: 'bg-yellow-500',
                        bg: 'bg-yellow-50 border-yellow-200',
                        text: 'text-yellow-700',
                        label: 'Pending RSVPs',
                        icon: <AlertCircle className="w-3.5 h-3.5" />
                      }
                    }
                    return {
                      color: 'bg-blue-500',
                      bg: 'bg-blue-50 border-blue-200',
                      text: 'text-blue-700',
                      label: 'No RSVPs Yet',
                      icon: <Calendar className="w-3.5 h-3.5" />
                    }
                  }

                  const statusConfig = getStatusConfig()

                  return (
                    <button
                      key={event.id}
                      onClick={() => {
                        setMoreEventsDate(null)
                        router.push(`/admin/events/${event.id}/edit`)
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
                          <Edit className="w-5 h-5 text-gray-400 flex-shrink-0" />
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
    </div>
  )
}
