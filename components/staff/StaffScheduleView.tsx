'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle,
  Filter,
  CalendarPlus,
  Building2
} from 'lucide-react'
import { cn } from '@/lib/utils'

type Event = {
  id: string
  title: string
  description: string | null
  startDateTime: string
  endDateTime: string
  location: { name: string; address: string } | null
  geriatricHome: { name: string } | null
  myCheckInTime: string | null
  eventStatus: 'upcoming' | 'today' | 'past'
  confirmedStaff: Array<{ user: { name: string; role: string } }>
}

export function StaffScheduleView({ events }: { events: Event[] }) {
  const [filter, setFilter] = useState<'ALL' | 'UPCOMING' | 'TODAY' | 'PAST'>('UPCOMING')

  const filteredEvents = useMemo(() => {
    if (filter === 'ALL') return events
    if (filter === 'TODAY') return events.filter(e => e.eventStatus === 'today')
    if (filter === 'PAST') return events.filter(e => e.eventStatus === 'past')
    return events.filter(e => e.eventStatus === 'upcoming' || e.eventStatus === 'today')
  }, [events, filter])

  // Group events by date
  const groupedEvents = useMemo(() => {
    const groups: Record<string, Event[]> = {}
    filteredEvents.forEach(event => {
      const dateKey = new Date(event.startDateTime).toDateString()
      if (!groups[dateKey]) groups[dateKey] = []
      groups[dateKey].push(event)
    })
    return Object.entries(groups).sort(([a], [b]) =>
      new Date(a).getTime() - new Date(b).getTime()
    )
  }, [filteredEvents])

  const stats = {
    total: events.length,
    upcoming: events.filter(e => e.eventStatus === 'upcoming' || e.eventStatus === 'today').length,
    today: events.filter(e => e.eventStatus === 'today').length,
    checkedIn: events.filter(e => e.myCheckInTime).length
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Events</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Upcoming</p>
          <p className="text-2xl font-bold text-blue-600">{stats.upcoming}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Today</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.today}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Checked In</p>
          <p className="text-2xl font-bold text-green-600">{stats.checkedIn}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-600 mr-2">Show:</span>
          {(['UPCOMING', 'TODAY', 'PAST', 'ALL'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                filter === f
                  ? "bg-primary-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              {f === 'ALL' ? 'All' : f === 'UPCOMING' ? 'Upcoming' : f === 'TODAY' ? 'Today' : 'Past'}
            </button>
          ))}
        </div>
      </div>

      {/* Events by Date */}
      {groupedEvents.length > 0 ? (
        <div className="space-y-6">
          {groupedEvents.map(([dateStr, dateEvents]) => {
            const date = new Date(dateStr)
            const isToday = date.toDateString() === new Date().toDateString()

            return (
              <div key={dateStr}>
                <div className="flex items-center gap-3 mb-3">
                  <div className={cn(
                    "w-12 h-12 rounded-lg flex flex-col items-center justify-center",
                    isToday ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-600"
                  )}>
                    <span className="text-xs font-medium uppercase">
                      {date.toLocaleDateString('en-US', { month: 'short' })}
                    </span>
                    <span className="text-lg font-bold">{date.getDate()}</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {date.toLocaleDateString('en-US', { weekday: 'long' })}
                      {isToday && <span className="ml-2 text-yellow-600">(Today)</span>}
                    </p>
                    <p className="text-sm text-gray-500">
                      {dateEvents.length} event{dateEvents.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 ml-15">
                  {dateEvents.map((event) => {
                    const eventTime = new Date(event.startDateTime)
                    const endTime = new Date(event.endDateTime)
                    const isPast = event.eventStatus === 'past'

                    return (
                      <Link
                        key={event.id}
                        href={`/staff/events/${event.id}`}
                        className={cn(
                          "block bg-white rounded-lg border p-4 transition-colors",
                          isPast ? "border-gray-200 opacity-75" : "border-gray-200 hover:border-primary-200"
                        )}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-gray-900 truncate">{event.title}</h3>
                              {event.myCheckInTime && (
                                <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3" /> Checked In
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {eventTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} -
                                {endTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                              </span>
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {event.location?.name}
                              </span>
                              {event.geriatricHome && (
                                <span className="flex items-center gap-1">
                                  <Building2 className="w-3 h-3" />
                                  {event.geriatricHome.name}
                                </span>
                              )}
                            </div>
                          </div>

                          {!isPast && !event.myCheckInTime && (
                            <a
                              href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${eventTime.toISOString().replace(/[-:]/g, '').replace('.000', '')}/${endTime.toISOString().replace(/[-:]/g, '').replace('.000', '')}&location=${encodeURIComponent(event.location?.address || '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
                              title="Add to Calendar"
                            >
                              <CalendarPlus className="w-5 h-5" />
                            </a>
                          )}
                        </div>

                        {event.confirmedStaff.length > 1 && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <p className="text-xs text-gray-500">
                              +{event.confirmedStaff.length - 1} other staff member{event.confirmedStaff.length > 2 ? 's' : ''} confirmed
                            </p>
                          </div>
                        )}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-6 h-6 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Events Found</h3>
          <p className="text-gray-500 mb-4">
            {filter === 'ALL'
              ? "You haven't confirmed attendance for any events yet."
              : `No ${filter.toLowerCase()} events in your schedule.`}
          </p>
          <Link
            href="/staff/events"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700"
          >
            Browse Available Events
          </Link>
        </div>
      )}
    </div>
  )
}
