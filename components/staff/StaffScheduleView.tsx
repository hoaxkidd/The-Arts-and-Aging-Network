'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Calendar,
  CalendarPlus,
  CheckCircle,
  Clock,
  MapPin,
  Building2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getStaffBasePathFromPathname } from '@/lib/role-routes'
import { STYLES } from '@/lib/styles'
import { LinedStatusTabs } from '@/components/ui/LinedStatusTabs'

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

type FilterId = 'ALL' | 'UPCOMING' | 'TODAY' | 'PAST'

function eventStatusBadge(event: Event) {
  const isPast = event.eventStatus === 'past'
  const eventDate = new Date(event.startDateTime)
  const isToday = eventDate.toDateString() === new Date().toDateString()
  if (isPast) {
    return (
      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-medium">Past</span>
    )
  }
  if (isToday || event.eventStatus === 'today') {
    return (
      <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">Today</span>
    )
  }
  return (
    <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">Upcoming</span>
  )
}

export function StaffScheduleView({ events }: { events: Event[] }) {
  const [filter, setFilter] = useState<FilterId>('UPCOMING')
  const pathname = usePathname()
  const basePath = getStaffBasePathFromPathname(pathname)

  const filteredEvents = useMemo(() => {
    if (filter === 'ALL') return events
    if (filter === 'TODAY') return events.filter((e) => e.eventStatus === 'today')
    if (filter === 'PAST') return events.filter((e) => e.eventStatus === 'past')
    return events.filter((e) => e.eventStatus === 'upcoming' || e.eventStatus === 'today')
  }, [events, filter])

  const sortedForTable = useMemo(
    () =>
      [...filteredEvents].sort(
        (a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime()
      ),
    [filteredEvents]
  )

  const stats = {
    total: events.length,
    upcoming: events.filter((e) => e.eventStatus === 'upcoming' || e.eventStatus === 'today').length,
    today: events.filter((e) => e.eventStatus === 'today').length,
    checkedIn: events.filter((e) => e.myCheckInTime).length,
  }

  const tabCounts = {
    UPCOMING: events.filter((e) => e.eventStatus === 'upcoming' || e.eventStatus === 'today').length,
    TODAY: events.filter((e) => e.eventStatus === 'today').length,
    PAST: events.filter((e) => e.eventStatus === 'past').length,
    ALL: events.length,
  }

  const linedTabs = [
    { id: 'UPCOMING' as const, label: 'Upcoming', count: tabCounts.UPCOMING },
    { id: 'TODAY' as const, label: 'Today', count: tabCounts.TODAY },
    { id: 'PAST' as const, label: 'Past', count: tabCounts.PAST },
    { id: 'ALL' as const, label: 'All', count: tabCounts.ALL },
  ]

  const emptyMessage =
    filter === 'ALL'
      ? "You haven't confirmed attendance for any bookings yet."
      : `No ${filter === 'UPCOMING' ? 'upcoming' : filter.toLowerCase()} bookings in your schedule.`

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <div className={cn(STYLES.statsCard, 'flex-1 min-w-[140px]')}>
          <p className="text-sm text-gray-500">Total Bookings</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className={cn(STYLES.statsCard, 'flex-1 min-w-[140px]')}>
          <p className="text-sm text-gray-500">Upcoming</p>
          <p className="text-2xl font-bold text-blue-600">{stats.upcoming}</p>
        </div>
        <div className={cn(STYLES.statsCard, 'flex-1 min-w-[140px]')}>
          <p className="text-sm text-gray-500">Today</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.today}</p>
        </div>
        <div className={cn(STYLES.statsCard, 'flex-1 min-w-[140px]')}>
          <p className="text-sm text-gray-500">Checked In</p>
          <p className="text-2xl font-bold text-green-600">{stats.checkedIn}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 pt-3">
          <LinedStatusTabs
            tabs={linedTabs}
            activeId={filter}
            onChange={setFilter}
            aria-label="Filter events by schedule"
          />
        </div>

        {sortedForTable.length === 0 ? (
          <div className="p-12 text-center border-t border-gray-100">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-6 h-6 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Bookings Found</h3>
            <p className="text-gray-500 mb-4">{emptyMessage}</p>
            <Link
              href={`${basePath}/bookings`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700"
            >
              Browse Available Bookings
            </Link>
          </div>
        ) : (
          <>
            <div className="md:hidden space-y-2 p-4 border-t border-gray-100">
              {sortedForTable.map((event) => {
                const eventTime = new Date(event.startDateTime)
                const endTime = new Date(event.endDateTime)

                return (
                  <Link
                    key={event.id}
                    href={`${basePath}/bookings/${event.id}`}
                    className="block bg-white rounded-lg border border-gray-200 p-3 shadow-sm"
                  >
                    <div className="flex items-center gap-2 mb-2">{eventStatusBadge(event)}</div>
                    <h3 className="text-gray-900 text-sm font-medium mb-1">{event.title}</h3>
                    {event.myCheckInTime && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium mb-2">
                        <CheckCircle className="w-3 h-3" /> Checked In
                      </span>
                    )}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {eventTime.toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {eventTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} –{' '}
                        {endTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </span>
                      {event.location?.name && (
                        <span className="flex items-center gap-1 min-w-0">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate">{event.location.name}</span>
                        </span>
                      )}
                      {event.geriatricHome && (
                        <span className="flex items-center gap-1 min-w-0">
                          <Building2 className="w-3 h-3 shrink-0" />
                          <span className="truncate">{event.geriatricHome.name}</span>
                        </span>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>

            <div className="hidden md:block border-t border-gray-100">
              <div className="table-scroll-wrapper max-h-[calc(100vh-320px)]">
                <table className={STYLES.table}>
                  <thead className="bg-gray-50">
                    <tr className={STYLES.tableHeadRow}>
                      <th className={STYLES.tableHeader}>Status</th>
                      <th className={STYLES.tableHeader}>Booking</th>
                      <th className={STYLES.tableHeader}>Date</th>
                      <th className={STYLES.tableHeader}>Time</th>
                      <th className={STYLES.tableHeader}>Location</th>
                      <th className={STYLES.tableHeader}>Facility</th>
                      <th className={cn(STYLES.tableHeader, 'text-center')}>Checked in</th>
                      <th className={cn(STYLES.tableHeader, 'text-right w-px')}>Calendar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sortedForTable.map((event) => {
                      const eventTime = new Date(event.startDateTime)
                      const endTime = new Date(event.endDateTime)
                      const isPast = event.eventStatus === 'past'
                      const calHref = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${eventTime.toISOString().replace(/[-:]/g, '').replace('.000', '')}/${endTime.toISOString().replace(/[-:]/g, '').replace('.000', '')}&location=${encodeURIComponent(event.location?.address || '')}`

                      return (
                        <tr key={event.id} className={STYLES.tableRow}>
                          <td className={STYLES.tableCell}>{eventStatusBadge(event)}</td>
                          <td className={STYLES.tableCell}>
                            <Link
                              href={`${basePath}/bookings/${event.id}`}
                              className="font-medium text-gray-900 hover:text-primary-600"
                            >
                              {event.title}
                            </Link>
                            {event.myCheckInTime && (
                              <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
                                <CheckCircle className="w-3 h-3" /> In
                              </span>
                            )}
                          </td>
                          <td className={STYLES.tableCell}>
                            {eventTime.toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </td>
                          <td className={STYLES.tableCell}>
                            {eventTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} –{' '}
                            {endTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                          </td>
                          <td className={STYLES.tableCell}>
                            <span className="text-sm text-gray-600">{event.location?.name ?? '—'}</span>
                          </td>
                          <td className={STYLES.tableCell}>
                            <span className="text-sm text-gray-600">{event.geriatricHome?.name ?? '—'}</span>
                          </td>
                          <td className={cn(STYLES.tableCell, 'text-center')}>
                            {event.myCheckInTime ? (
                              <CheckCircle className="w-4 h-4 text-green-600 inline-block" aria-label="Checked in" />
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className={cn(STYLES.tableCell, 'text-right')}>
                            {!isPast && !event.myCheckInTime ? (
                              <a
                                href={calHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
                                title="Add to Calendar"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <CalendarPlus className="w-4 h-4" />
                              </a>
                            ) : (
                              <span className="inline-block w-9" />
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
