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
  CheckCircle,
  ExternalLink
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

export function HomeEventHistory({ 
  events, 
  activeFilter = 'ALL' 
}: { 
  events: Event[]
  activeFilter?: 'ALL' | 'UPCOMING' | 'PAST'
}) {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredEvents = useMemo(() => {
    const now = new Date()
    return events.filter(event => {
      const matchesSearch = !searchQuery ||
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.location?.name.toLowerCase().includes(searchQuery.toLowerCase())

      let matchesFilter = true
      const eventEnd = new Date(event.endDateTime)
      if (activeFilter === 'UPCOMING') matchesFilter = eventEnd >= now
      if (activeFilter === 'PAST') matchesFilter = eventEnd < now

      return matchesSearch && matchesFilter
    })
  }, [events, searchQuery, activeFilter])

  // Mobile card view
  const MobileCardView = () => (
    <div className="md:hidden space-y-2">
      {filteredEvents.length > 0 ? (
        filteredEvents.map((event) => {
          const eventDate = new Date(event.startDateTime)
          const endDate = new Date(event.endDateTime)
          const isPast = endDate < new Date()
          const isToday = eventDate.toDateString() === new Date().toDateString()

          return (
            <Link
              key={event.id}
              href={`/dashboard/my-events/${event.id}`}
              className="block bg-white rounded-lg border border-gray-200 p-3 shadow-sm"
            >
              <div className="flex items-center gap-2 mb-2">
                {isPast ? (
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-medium">Done</span>
                ) : isToday ? (
                  <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">Today</span>
                ) : (
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">Soon</span>
                )}
              </div>
              <h3 className="text-gray-900 text-sm font-medium mb-1">{event.title}</h3>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {eventDate.toLocaleDateString()}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </span>
                {event.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {event.location.name}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3 text-blue-500" />
                  {event.stats.confirmedStaffCount}
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  {event.stats.checkedInCount}
                </span>
              </div>
            </Link>
          )
        })
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
          <Calendar className="w-8 h-8 mx-auto text-gray-300 mb-2" />
          <p className="text-sm font-medium text-gray-900">No events found.</p>
        </div>
      )}
    </div>
  )

  // Desktop table view
  const DesktopTableView = () => (
    <div className="hidden md:block bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="table-scroll-wrapper max-h-[calc(100vh-320px)]">
        <table className={STYLES.table}>
          <thead className="bg-gray-50">
            <tr className={STYLES.tableHeadRow}>
              <th className={STYLES.tableHeader}>Status</th>
              <th className={STYLES.tableHeader}>Event</th>
              <th className={STYLES.tableHeader}>Date</th>
              <th className={STYLES.tableHeader}>Time</th>
              <th className={STYLES.tableHeader}>Location</th>
              <th className={cn(STYLES.tableHeader, "text-right")}>Staff</th>
              <th className={cn(STYLES.tableHeader, "text-right")}>Checked In</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredEvents.length > 0 ? (
              filteredEvents.map((event) => {
                const eventDate = new Date(event.startDateTime)
                const endDate = new Date(event.endDateTime)
                const isPast = endDate < new Date()
                const isToday = eventDate.toDateString() === new Date().toDateString()

                return (
                  <tr key={event.id} className={STYLES.tableRow}>
                    <td className={STYLES.tableCell}>
                      {isPast ? (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-medium">Done</span>
                      ) : isToday ? (
                        <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">Today</span>
                      ) : (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">Soon</span>
                      )}
                    </td>
                    <td className={STYLES.tableCell}>
                      <Link href={`/dashboard/my-events/${event.id}`} className="font-medium text-gray-900 hover:text-primary-600">
                        {event.title}
                      </Link>
                    </td>
                    <td className={STYLES.tableCell}>
                      <span className="text-sm text-gray-600">
                        {eventDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      </span>
                    </td>
                    <td className={STYLES.tableCell}>
                      <span className="text-sm text-gray-600">
                        {eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </span>
                    </td>
                    <td className={STYLES.tableCell}>
                      <span className="text-sm text-gray-600">{event.location?.name || '-'}</span>
                    </td>
                    <td className={cn(STYLES.tableCell, "text-right")}>
                      <span className="text-sm text-gray-600">{event.stats.confirmedStaffCount}</span>
                    </td>
                    <td className={cn(STYLES.tableCell, "text-right")}>
                      <span className="text-sm text-gray-600">{event.stats.checkedInCount}</span>
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan={7} className={cn(STYLES.tableCell, "text-center py-8")}>
                  <Calendar className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500">No events found</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(STYLES.input, "pl-10 py-2 text-sm")}
          />
        </div>
      </div>

      {/* Views */}
      <MobileCardView />
      <DesktopTableView />
    </div>
  )
}
