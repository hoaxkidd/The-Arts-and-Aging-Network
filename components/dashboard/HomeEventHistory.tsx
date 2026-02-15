'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Star,
  Search,
  CheckCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { STYLES } from '@/lib/styles'

type Event = {
  id: string
  title: string
  description: string | null
  startDateTime: string
  endDateTime: string
  status: string
  location: { name: string; address: string } | null
  stats: {
    confirmedStaffCount: number
    checkedInCount: number
    avgFeedbackRating: number | null
    photosCount: number
    commentsCount: number
  }
}

export function HomeEventHistory({ events }: { events: Event[] }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<'ALL' | 'UPCOMING' | 'PAST'>('ALL')

  const filteredEvents = useMemo(() => {
    const now = new Date()
    return events.filter(event => {
      const matchesSearch = !searchQuery ||
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.location?.name.toLowerCase().includes(searchQuery.toLowerCase())

      let matchesFilter = true
      const eventEnd = new Date(event.endDateTime)
      if (filter === 'UPCOMING') matchesFilter = eventEnd >= now
      if (filter === 'PAST') matchesFilter = eventEnd < now

      return matchesSearch && matchesFilter
    })
  }, [events, searchQuery, filter])

  return (
    <div className="space-y-3">
      {/* Compact Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-3">
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
          <div className="flex gap-1">
            {(['ALL', 'UPCOMING', 'PAST'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                  filter === f
                    ? "bg-primary-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
              >
                {f === 'ALL' ? 'All' : f === 'UPCOMING' ? 'Upcoming' : 'Past'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Compact Event Cards */}
      {filteredEvents.length > 0 ? (
        <div className="space-y-2">
          {filteredEvents.map((event) => {
            const eventDate = new Date(event.startDateTime)
            const endDate = new Date(event.endDateTime)
            const isPast = endDate < new Date()
            const isToday = eventDate.toDateString() === new Date().toDateString()

            return (
              <Link
                key={event.id}
                href={`/dashboard/my-events/${event.id}`}
                className={cn(
                  "bg-white rounded-lg border overflow-hidden transition-colors flex items-center gap-3 p-3",
                  isPast ? "border-gray-200" : "border-green-200"
                )}
              >
                {/* Date Badge */}
                <div className={cn(
                  "flex-shrink-0 w-11 h-11 rounded-lg flex flex-col items-center justify-center",
                  isPast ? "bg-gray-100 text-gray-600" :
                  isToday ? "bg-yellow-100 text-yellow-700" :
                  "bg-green-100 text-green-700"
                )}>
                  <span className="text-[10px] font-medium uppercase leading-none">
                    {eventDate.toLocaleDateString('en-US', { month: 'short' })}
                  </span>
                  <span className="text-base font-bold leading-none">
                    {eventDate.getDate()}
                  </span>
                </div>

                {/* Event Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 text-sm truncate">
                    {event.title}
                  </h3>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </span>
                    {event.location && (
                      <span className="flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{event.location.name}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Mini Stats */}
                <div className="hidden sm:flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3 text-blue-500" />
                    {event.stats.confirmedStaffCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-green-500" />
                    {event.stats.checkedInCount}
                  </span>
                  {event.stats.avgFeedbackRating && (
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-yellow-500" />
                      {event.stats.avgFeedbackRating.toFixed(1)}
                    </span>
                  )}
                </div>

                {/* Status Badge */}
                <div className="flex-shrink-0">
                  {isPast ? (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-[10px] font-medium">
                      Done
                    </span>
                  ) : isToday ? (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-[10px] font-medium">
                      Today
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-[10px] font-medium">
                      Soon
                    </span>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Calendar className="w-5 h-5 text-gray-400" />
          </div>
          <h3 className="text-sm font-medium text-gray-900 mb-1">No Events Found</h3>
          <p className="text-xs text-gray-500 mb-3">
            {searchQuery || filter !== 'ALL'
              ? "Try adjusting your search or filter."
              : "You haven't participated in any events yet."}
          </p>
          <Link
            href="/dashboard/events"
            className={cn(STYLES.btn, STYLES.btnPrimary, "text-sm py-2")}
          >
            Browse Events
          </Link>
        </div>
      )}
    </div>
  )
}
