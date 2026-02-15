'use client'

import { useState, useMemo } from 'react'
import Link from "next/link"
import { Calendar, MapPin, Clock, Search, Filter, Plus, SlidersHorizontal, Check, HelpCircle, X, UserCheck } from "lucide-react"
import { STYLES } from "@/lib/styles"
import { cn } from "@/lib/utils"
import { rsvpToEvent, checkInToEvent } from "@/app/actions/attendance"

type Event = {
  id: string
  title: string
  description: string | null
  startDateTime: Date
  endDateTime: Date
  location: { name: string; address: string }
  attendance: { status: string, checkInTime?: Date }[]
  status: string
}

export function EventList({ events, canManage }: { events: any[], canManage: boolean }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('UPCOMING') // UPCOMING, PAST, ALL
  const [loadingId, setLoadingId] = useState<string | null>(null)
  
  const handleRsvp = async (e: React.MouseEvent, eventId: string, status: 'YES' | 'NO' | 'MAYBE') => {
    e.preventDefault()
    e.stopPropagation()
    setLoadingId(eventId)
    await rsvpToEvent(eventId, status)
    setLoadingId(null)
  }

  const handleCheckIn = async (e: React.MouseEvent, eventId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setLoadingId(eventId)
    await checkInToEvent(eventId)
    setLoadingId(null)
  }
  
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            event.location.name.toLowerCase().includes(searchQuery.toLowerCase())
      
      const now = new Date()
      const isPast = new Date(event.endDateTime) < now
      
      let matchesFilter = true
      if (filterType === 'UPCOMING') matchesFilter = !isPast
      if (filterType === 'PAST') matchesFilter = isPast
      
      return matchesSearch && matchesFilter
    })
  }, [events, searchQuery, filterType])

  return (
    <div className="space-y-6">
      {/* Controls Header */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
        <div className="relative w-full lg:w-96">
          <input
            type="text"
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(STYLES.input, "pl-10")}
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
          <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
            <button
              onClick={() => setFilterType('UPCOMING')}
              className={cn("px-4 py-1.5 text-sm font-medium rounded-md transition-all flex-1 sm:flex-none text-center", 
                filterType === 'UPCOMING' ? "bg-white text-primary-900 shadow-sm ring-1 ring-black/5" : "text-gray-500 hover:text-gray-700"
              )}
            >
              Upcoming
            </button>
            <button
              onClick={() => setFilterType('PAST')}
              className={cn("px-4 py-1.5 text-sm font-medium rounded-md transition-all flex-1 sm:flex-none text-center", 
                filterType === 'PAST' ? "bg-white text-primary-900 shadow-sm ring-1 ring-black/5" : "text-gray-500 hover:text-gray-700"
              )}
            >
              Past
            </button>
          </div>

          {canManage && (
            <Link 
              href="/admin/events" 
              className={cn(STYLES.btn, STYLES.btnPrimary, "whitespace-nowrap px-6 w-auto")}
            >
              <Plus className="w-4 h-4" /> Create Event
            </Link>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEvents.map((event: any) => {
          const userStatus = event.attendance[0]?.status
          const startDate = new Date(event.startDateTime)
          const isPast = new Date(event.endDateTime) < new Date()
          
          return (
            <div key={event.id} className={cn(STYLES.card, "hover:border-primary-300 transition-all h-full flex flex-col relative", isPast && "opacity-75")}>
              {loadingId === event.id && (
                  <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center rounded-lg">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                  </div>
              )}

              <div className="flex justify-between items-start mb-4">
                <div className={cn("rounded-lg p-2 text-center min-w-[60px]", isPast ? "bg-gray-100 text-gray-500" : "bg-primary-50 text-primary-700")}>
                  <span className="block text-xs font-bold uppercase">{startDate.toLocaleString('default', { month: 'short' })}</span>
                  <span className="block text-2xl font-bold">{startDate.getDate()}</span>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {isPast && (
                    <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs font-medium">
                      Past Event
                    </span>
                  )}
                  {userStatus && (
                    <span className={cn(STYLES.badge,
                      isPast && userStatus === 'YES' ? 'bg-blue-100 text-blue-800' :
                      userStatus === 'YES' ? 'bg-green-100 text-green-800' :
                      userStatus === 'NO' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                    )}>
                      {isPast && userStatus === 'YES' ? 'Attended' : userStatus === 'YES' ? 'Going' : userStatus === 'NO' ? 'Declined' : 'Maybe'}
                    </span>
                  )}
                </div>
              </div>

              <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">{event.title}</h3>

              <div className="space-y-2 text-sm text-gray-600 mt-auto mb-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span>{startDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location.address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate hover:text-primary-600 hover:underline transition-colors"
                  >
                    {event.location.name}
                  </a>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="border-t border-gray-100 pt-3 mt-auto flex gap-2">
                {isPast ? (
                  <Link
                    href={`/events/${event.id}`}
                    className={cn(STYLES.btn, "w-full py-2 text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200")}
                  >
                    View Event
                  </Link>
                ) : userStatus === 'YES' && startDate.toDateString() === new Date().toDateString() ? (
                  event.attendance[0]?.checkInTime ? (
                    <Link
                      href={`/events/${event.id}`}
                      className={cn(STYLES.btn, "w-full py-2 text-sm font-bold bg-gray-900 text-white hover:bg-gray-800 shadow-md")}
                    >
                      View Event
                    </Link>
                  ) : (
                    <button
                      onClick={(e) => handleCheckIn(e, event.id)}
                      className={cn(STYLES.btn, STYLES.btnPrimary, "w-full py-2 text-sm font-bold animate-pulse shadow-md")}
                    >
                      <UserCheck className="w-4 h-4 mr-2" /> Check In Now
                    </button>
                  )
                ) : (
                  <>
                    <button
                      onClick={(e) => handleRsvp(e, event.id, 'YES')}
                      className={cn("flex-1 py-2 text-xs font-medium rounded border flex items-center justify-center gap-1 transition-colors",
                        userStatus === 'YES' ? "bg-green-50 text-green-700 border-green-200" : "bg-white text-gray-600 border-gray-200 hover:bg-green-50 hover:text-green-700 hover:border-green-200"
                      )}
                    >
                      <Check className="w-3 h-3" /> Going
                    </button>
                    <button
                      onClick={(e) => handleRsvp(e, event.id, 'MAYBE')}
                      className={cn("flex-1 py-2 text-xs font-medium rounded border flex items-center justify-center gap-1 transition-colors",
                        userStatus === 'MAYBE' ? "bg-yellow-50 text-yellow-700 border-yellow-200" : "bg-white text-gray-600 border-gray-200 hover:bg-yellow-50 hover:text-yellow-700 hover:border-yellow-200"
                      )}
                    >
                      <HelpCircle className="w-3 h-3" /> Maybe
                    </button>
                    <button
                      onClick={(e) => handleRsvp(e, event.id, 'NO')}
                      className={cn("flex-1 py-2 text-xs font-medium rounded border flex items-center justify-center gap-1 transition-colors",
                        userStatus === 'NO' ? "bg-red-50 text-red-700 border-red-200" : "bg-white text-gray-600 border-gray-200 hover:bg-red-50 hover:text-red-700 hover:border-red-200"
                      )}
                    >
                      <X className="w-3 h-3" /> No
                    </button>
                  </>
                )}
              </div>
            </div>
          )
        })}
        
        {filteredEvents.length === 0 && (
          <div className="col-span-full text-center py-16 bg-white rounded-lg border border-gray-100 border-dashed shadow-sm">
            <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">No Events Found</h3>
            <p className="text-gray-500 mt-2">Try adjusting your search or filters.</p>
          </div>
        )}
      </div>
    </div>
  )
}