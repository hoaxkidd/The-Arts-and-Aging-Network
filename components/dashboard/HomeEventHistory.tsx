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
  ExternalLink,
  X,
  FileText
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { STYLES } from '@/lib/styles'
import { AddToCalendar } from '@/components/bookings/AddToCalendar'

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
  const [previewEvent, setPreviewEvent] = useState<Event | null>(null)

  const toLocalDateInput = (iso: string) => {
    const date = new Date(iso)
    const year = date.getFullYear()
    const month = `${date.getMonth() + 1}`.padStart(2, '0')
    const day = `${date.getDate()}`.padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const getUpdateDetailsHref = (event: Event) => {
    const params = new URLSearchParams()
    params.set('date', toLocalDateInput(event.startDateTime))
    params.set('prefillMode', 'update')
    params.set('prefillBookingId', event.id)
    params.set('prefillBookingTitle', event.title)
    params.set('prefillNotes', `Update details request for booking: ${event.title}`)
    return `/dashboard/requests/new?${params.toString()}`
  }

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
              href="#"
              onClick={(e) => {
                e.preventDefault()
                setPreviewEvent(event)
              }}
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
          <p className="text-sm font-medium text-gray-900">No bookings found.</p>
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
              <th className={STYLES.tableHeader}>Booking</th>
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
                  <tr
                    key={event.id}
                    className={cn(STYLES.tableRow, 'cursor-pointer')}
                    onClick={() => setPreviewEvent(event)}
                  >
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
                      <button type="button" className="font-medium text-gray-900 hover:text-primary-600 text-left">
                        {event.title}
                      </button>
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
                  <p className="text-sm text-gray-500">No bookings found</p>
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
            placeholder="Search bookings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(STYLES.input, "pl-10 py-2 text-sm")}
          />
        </div>
      </div>

      {/* Views */}
      <MobileCardView />
      <DesktopTableView />

      {previewEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            onClick={() => setPreviewEvent(null)}
            className="absolute inset-0 bg-gray-900/40"
            aria-label="Close preview"
          />
          <div className="relative w-full max-w-2xl overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Program Preview</h3>
                <p className="text-xs text-gray-500">Review booking details and quick actions</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewEvent(null)}
                className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-auto px-4 py-4 space-y-4">
              <div>
                <p className="text-lg font-semibold text-gray-900">{previewEvent.title}</p>
                <p className="mt-1 text-sm text-gray-600">{previewEvent.description || 'No description provided.'}</p>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Date & Time</p>
                  <p className="mt-1 font-medium">
                    {new Date(previewEvent.startDateTime).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </p>
                  <p className="text-xs text-gray-600">
                    {new Date(previewEvent.startDateTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Location</p>
                  <p className="mt-1 font-medium">{previewEvent.location?.name || 'TBD'}</p>
                  <p className="text-xs text-gray-600">{previewEvent.location?.address || 'No address listed'}</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Staffing</p>
                  <p className="mt-1 font-medium">{previewEvent.stats.confirmedStaffCount} confirmed</p>
                  <p className="text-xs text-gray-600">{previewEvent.stats.checkedInCount} checked in</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Features</p>
                  <p className="mt-1 font-medium">{previewEvent.stats.photosCount} photos</p>
                  <p className="text-xs text-gray-600">{previewEvent.stats.commentsCount} comments</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-gray-100 px-4 py-3">
              <AddToCalendar
                event={{
                  title: previewEvent.title,
                  description: previewEvent.description,
                  location: previewEvent.location?.address || previewEvent.location?.name || '',
                  startDateTime: new Date(previewEvent.startDateTime),
                  endDateTime: new Date(previewEvent.endDateTime),
                }}
              />
              <Link href={getUpdateDetailsHref(previewEvent)} className={cn(STYLES.btn, STYLES.btnSecondary, 'inline-flex items-center gap-2')}>
                <FileText className="h-4 w-4" />
                Update Details Request
              </Link>
              <Link href={`/dashboard/my-bookings/${previewEvent.id}`} className={cn(STYLES.btn, STYLES.btnPrimary, 'inline-flex items-center gap-2')}>
                <ExternalLink className="h-4 w-4" />
                View Full Program
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
