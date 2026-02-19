'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { HomeCalendarView } from '@/components/dashboard/HomeCalendarView'
import { Calendar, List, Plus, Clock, MapPin, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { STYLES } from '@/lib/styles'

interface CalendarEvent {
  id: string
  title: string
  startDateTime: string | Date
  endDateTime: string | Date
  status: string
  location?: { name: string } | null
  myRequestStatus?: 'PENDING' | 'APPROVED' | null
  requiredFormTemplateId?: string | null
}

export function HomeEventsClient({ events }: { events: CalendarEvent[] }) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'calendar' | 'list'>('calendar')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredEvents = searchQuery
    ? events.filter(
        (e) =>
          e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.location?.name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : events

  const handleEventClick = (event: CalendarEvent) => {
    const eventEnd = new Date(event.endDateTime)
    const isPastEvent = eventEnd < new Date()

    if (event.myRequestStatus === 'APPROVED') {
      router.push(`/events/${event.id}`)
      return
    }
    if (event.myRequestStatus === 'PENDING') {
      router.push('/dashboard/requests')
      return
    }
    if (isPastEvent) {
      router.push(`/events/${event.id}`)
      return
    }
    if (event.requiredFormTemplateId) {
      router.push(`/dashboard/events/${event.id}/sign-up`)
      return
    }
    router.push(`/events/${event.id}`)
  }

  return (
    <div className="h-full flex flex-col gap-3">
      {/* Tabs + Search + Create */}
      <div className="flex-shrink-0 bg-white rounded-lg border border-gray-200 p-3">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          {/* Tab switcher */}
          <div className="flex rounded-lg border border-gray-200 p-0.5 bg-gray-50">
            <button
              onClick={() => setActiveTab('calendar')}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
                activeTab === 'calendar'
                  ? 'bg-white text-primary-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              <Calendar className="w-4 h-4" />
              Calendar
            </button>
            <button
              onClick={() => setActiveTab('list')}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
                activeTab === 'list'
                  ? 'bg-white text-primary-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              <List className="w-4 h-4" />
              List
            </button>
          </div>

          {/* Search */}
          <div className="relative flex-1 min-w-0">
            <input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(STYLES.input, 'pl-9 py-2 w-full')}
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
          </div>

          {/* Create Custom Event */}
          <Link
            href="/dashboard/requests/new"
            className={cn(STYLES.btn, STYLES.btnPrimary, 'py-2 shrink-0')}
          >
            <Plus className="w-4 h-4" />
            Create Custom Request
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === 'calendar' && (
          <div className="h-full">
            <HomeCalendarView events={filteredEvents} hideSearch />
          </div>
        )}

        {activeTab === 'list' && (
          <div className="h-full overflow-auto bg-white rounded-lg border border-gray-200">
            <div className="divide-y divide-gray-100">
              {filteredEvents.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">No events match your search</p>
                </div>
              ) : (
                filteredEvents.map((event) => {
                  const eventStart = new Date(event.startDateTime)
                  const eventEnd = new Date(event.endDateTime)
                  const isPast = eventEnd < new Date()
                  return (
                    <button
                      key={event.id}
                      onClick={() => handleEventClick(event)}
                      className={cn(
                        'w-full p-4 text-left hover:bg-gray-50 transition-colors flex items-center gap-4',
                        event.myRequestStatus === 'APPROVED' && 'bg-green-50/50',
                        event.myRequestStatus === 'PENDING' && 'bg-yellow-50/50'
                      )}
                    >
                      <div className="w-12 h-12 rounded-lg flex flex-col items-center justify-center shrink-0 bg-primary-50 text-primary-700">
                        <span className="text-[10px] font-semibold uppercase">
                          {eventStart.toLocaleDateString('en-US', { month: 'short' })}
                        </span>
                        <span className="text-base font-bold leading-none">
                          {eventStart.getDate()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-gray-900 truncate">{event.title}</h3>
                          {event.myRequestStatus === 'APPROVED' && (
                            <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-[10px] font-medium rounded flex items-center gap-0.5">
                              <CheckCircle className="w-3 h-3" /> Participating
                            </span>
                          )}
                          {event.myRequestStatus === 'PENDING' && (
                            <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 text-[10px] font-medium rounded">
                              Pending
                            </span>
                          )}
                          {!event.myRequestStatus && !isPast && (
                            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-medium rounded">
                              Available
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {eventStart.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} –{' '}
                            {eventEnd.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                          </span>
                          {event.location && (
                            <span className="flex items-center gap-1 truncate">
                              <MapPin className="w-3 h-3 shrink-0" />
                              {event.location.name}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-primary-600 text-sm font-medium shrink-0">View →</span>
                    </button>
                  )
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
