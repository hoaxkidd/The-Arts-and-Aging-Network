'use client'

import { useState } from 'react'
import { Calendar, List } from 'lucide-react'
import { PublicCalendarView } from '@/components/events/PublicCalendarView'
import { StaffEventList } from '@/components/staff/StaffEventList'
import { cn } from '@/lib/utils'

type StaffEventsClientProps = {
  events: any[]
  userRole: string
  canCreateEvents: boolean
}

export function StaffEventsClient({ events, userRole, canCreateEvents }: StaffEventsClientProps) {
  const [view, setView] = useState<'calendar' | 'list'>('calendar')

  // Format events for calendar view (needs simpler shape)
  const calendarEvents = events.map(e => ({
    id: e.id,
    title: e.title,
    startDateTime: e.startDateTime,
    endDateTime: e.endDateTime,
    status: e.status,
    location: e.location
  }))

  // Only future events for list view
  const upcomingEvents = events.filter(e => new Date(e.endDateTime) >= new Date())

  return (
    <div className="h-full flex flex-col">
      {/* View Toggle */}
      <div className="flex-shrink-0 flex items-center gap-1 mb-3 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setView('calendar')}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
            view === 'calendar'
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          )}
        >
          <Calendar className="w-4 h-4" />
          Calendar
        </button>
        <button
          onClick={() => setView('list')}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
            view === 'list'
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          )}
        >
          <List className="w-4 h-4" />
          List
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
        {view === 'calendar' ? (
          <PublicCalendarView
            events={calendarEvents}
            userRole={userRole}
            canCreateEvents={canCreateEvents}
          />
        ) : (
          <div className="overflow-auto h-full">
            <StaffEventList events={upcomingEvents} />
          </div>
        )}
      </div>
    </div>
  )
}
