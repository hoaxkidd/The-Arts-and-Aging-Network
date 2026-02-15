'use client'

import { useState, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Calendar,
  MapPin,
  Clock,
  Users,
  Search,
  CheckCircle,
  XCircle,
  Loader2,
  Building2,
  ExternalLink
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { STYLES } from '@/lib/styles'
import { confirmStaffAttendance, withdrawStaffAttendance } from '@/app/actions/staff-attendance'

type Event = {
  id: string
  title: string
  description: string | null
  startDateTime: string
  endDateTime: string
  location: { id: string; name: string; address: string } | null
  geriatricHome: { id: string; name: string; address: string } | null
  maxAttendees: number
  myAttendanceStatus: string | null
  confirmedCount: number
  spotsRemaining: number
  photosCount: number
}

export function StaffEventList({ events }: { events: Event[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [actionEventId, setActionEventId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'AVAILABLE' | 'CONFIRMED'>('ALL')

  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      // Search filter
      const matchesSearch =
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.location?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.geriatricHome?.name.toLowerCase().includes(searchQuery.toLowerCase())

      // Status filter
      let matchesFilter = true
      if (filterStatus === 'AVAILABLE') {
        matchesFilter = event.myAttendanceStatus !== 'YES' && event.spotsRemaining > 0
      } else if (filterStatus === 'CONFIRMED') {
        matchesFilter = event.myAttendanceStatus === 'YES'
      }

      return matchesSearch && matchesFilter
    })
  }, [events, searchQuery, filterStatus])

  const handleConfirm = (eventId: string) => {
    setActionEventId(eventId)
    startTransition(async () => {
      const result = await confirmStaffAttendance(eventId)
      if (result.error) {
        alert(result.error)
      }
      router.refresh()
      setActionEventId(null)
    })
  }

  const handleWithdraw = (eventId: string) => {
    setActionEventId(eventId)
    startTransition(async () => {
      const result = await withdrawStaffAttendance(eventId)
      if (result.error) {
        alert(result.error)
      }
      router.refresh()
      setActionEventId(null)
    })
  }

  return (
    <div className="space-y-4">
      {/* Search & Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(STYLES.input, "pl-10 py-2")}
            />
          </div>

          {/* Filter Buttons */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            {(['ALL', 'AVAILABLE', 'CONFIRMED'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                  filterStatus === status
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                )}
              >
                {status === 'ALL' ? 'All' : status === 'AVAILABLE' ? 'Available' : 'Confirmed'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Event Count */}
      <p className="text-xs text-gray-500">
        {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''} found
      </p>

      {/* Event List */}
      {filteredEvents.length > 0 ? (
        <div className="space-y-2">
          {filteredEvents.map((event) => {
            const eventDate = new Date(event.startDateTime)
            const endDate = new Date(event.endDateTime)
            const isLoading = isPending && actionEventId === event.id
            const isConfirmed = event.myAttendanceStatus === 'YES'
            const isFull = event.spotsRemaining <= 0

            return (
              <div
                key={event.id}
                className={cn(
                  "bg-white rounded-lg border overflow-hidden transition-all hover:shadow-sm",
                  isConfirmed ? "border-green-200 bg-green-50/30" : "border-gray-200"
                )}
              >
                <div className="p-3">
                  <div className="flex items-start gap-3">
                    {/* Date Badge */}
                    <div className={cn(
                      "w-12 h-12 rounded-lg flex flex-col items-center justify-center flex-shrink-0",
                      isConfirmed ? "bg-green-100 text-green-700" : "bg-primary-100 text-primary-700"
                    )}>
                      <span className="text-[10px] font-medium uppercase">
                        {eventDate.toLocaleDateString('en-US', { month: 'short' })}
                      </span>
                      <span className="text-lg font-bold leading-none">
                        {eventDate.getDate()}
                      </span>
                    </div>

                    {/* Event Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <Link
                            href={`/staff/events/${event.id}`}
                            className="font-semibold text-gray-900 hover:text-primary-600 text-sm"
                          >
                            {event.title}
                          </Link>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - {endDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                            </span>
                            {event.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {event.location.name}
                              </span>
                            )}
                            {event.geriatricHome && (
                              <span className="flex items-center gap-1">
                                <Building2 className="w-3 h-3" />
                                {event.geriatricHome.name}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Status & Spots */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {isConfirmed && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-[10px] font-medium flex items-center gap-0.5">
                              <CheckCircle className="w-2.5 h-2.5" /> Confirmed
                            </span>
                          )}
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-medium",
                            isFull && !isConfirmed
                              ? "bg-red-100 text-red-600"
                              : "bg-gray-100 text-gray-600"
                          )}>
                            {event.confirmedCount}/{event.maxAttendees}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 mt-2">
                        <Link
                          href={`/staff/events/${event.id}`}
                          className="px-2.5 py-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md flex items-center gap-1"
                        >
                          View <ExternalLink className="w-2.5 h-2.5" />
                        </Link>
                        {isConfirmed ? (
                          <button
                            onClick={() => handleWithdraw(event.id)}
                            disabled={isLoading}
                            className="px-2.5 py-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-md flex items-center gap-1 disabled:opacity-50"
                          >
                            {isLoading ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <XCircle className="w-3 h-3" />
                            )}
                            Withdraw
                          </button>
                        ) : (
                          <button
                            onClick={() => handleConfirm(event.id)}
                            disabled={isLoading || isFull}
                            className={cn(
                              "px-2.5 py-1 text-xs font-medium rounded-md flex items-center gap-1",
                              isFull
                                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                : "bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
                            )}
                          >
                            {isLoading ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <CheckCircle className="w-3 h-3" />
                            )}
                            {isFull ? "Full" : "Confirm"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Calendar className="w-6 h-6 text-gray-400" />
          </div>
          <h3 className="text-sm font-medium text-gray-900 mb-1">No Events Found</h3>
          <p className="text-xs text-gray-500">
            {searchQuery || filterStatus !== 'ALL'
              ? "Try adjusting your search or filters."
              : "There are no upcoming events available."}
          </p>
        </div>
      )}
    </div>
  )
}
