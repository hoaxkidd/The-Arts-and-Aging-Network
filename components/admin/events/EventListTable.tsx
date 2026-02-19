'use client'

import { useState } from 'react'
import Link from "next/link"
import { Calendar, MapPin, Users, Edit2, Trash2, Eye, X, Check } from "lucide-react"
import { STYLES } from "@/lib/styles"
import { cn } from "@/lib/utils"
import { deleteEvent } from "@/app/actions/events"

type Attendee = {
  id: string
  status: string
  checkInTime: Date | null
  user: { id: string; name: string | null; email: string }
}

type Event = {
  id: string
  title: string
  status: string
  startDateTime: Date
  endDateTime: Date
  maxAttendees: number
  location: { name: string; address: string }
  attendances: Attendee[]
}

export function EventListTable({ events }: { events: Event[] }) {
  const [attendanceEvent, setAttendanceEvent] = useState<Event | null>(null)

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="table-scroll-wrapper max-h-[calc(100vh-320px)]">
          <table className={STYLES.table}>
            <thead className="bg-gray-50">
              <tr>
                <th className={STYLES.tableHeader}>Event</th>
                <th className={STYLES.tableHeader}>Date & Time</th>
                <th className={STYLES.tableHeader}>Location</th>
                <th className={cn(STYLES.tableHeader, "text-right")}>Attendees</th>
                <th className={cn(STYLES.tableHeader, "text-right")}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {events.map((event) => {
                const start = new Date(event.startDateTime)
                const end = new Date(event.endDateTime)
                const confirmed = event.attendances.filter(a => a.status === 'YES').length
                return (
                  <tr key={event.id} className={STYLES.tableRow}>
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium text-gray-900">{event.title}</div>
                        <span className={cn(
                          "inline-flex px-2 py-0.5 rounded text-xs font-medium",
                          event.status === 'PUBLISHED' ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                        )}>
                          {event.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        {start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                        <Users className="w-3 h-3" />
                        {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location.address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-primary-600"
                      >
                        <MapPin className="w-3.5 h-3.5 text-gray-400" />
                        {event.location.name}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-600">
                      {confirmed} / {event.maxAttendees}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setAttendanceEvent(event)}
                          className="p-2 text-gray-500 hover:text-primary-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="View Attendees"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <Link
                          href={`/admin/events/${event.id}/edit`}
                          className="p-2 text-gray-500 hover:text-primary-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Edit Event"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Link>
                        <form action={async () => {
                          if (confirm('Delete this event?')) await deleteEvent(event.id)
                        }} className="inline">
                          <button
                            type="submit"
                            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Event"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Attendance Modal */}
      {attendanceEvent && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setAttendanceEvent(null)}>
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
              <div>
                <h2 className="font-semibold text-gray-900">Attendance</h2>
                <p className="text-sm text-gray-500">{attendanceEvent.title}</p>
              </div>
              <button onClick={() => setAttendanceEvent(null)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh] space-y-2">
              {attendanceEvent.attendances.length > 0 ? (
                attendanceEvent.attendances.map((r) => (
                  <div key={r.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium text-sm text-gray-900">{r.user.name || 'Unknown'}</div>
                      <div className="text-xs text-gray-500">{r.user.email}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {r.checkInTime && (
                        <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded flex items-center gap-1">
                          <Check className="w-3 h-3" /> Checked in
                        </span>
                      )}
                      <span className={cn(
                        "px-2 py-0.5 rounded text-xs font-medium",
                        r.status === 'YES' ? "bg-green-100 text-green-700" :
                        r.status === 'NO' ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                      )}>
                        {r.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center py-6 text-gray-500 text-sm">No attendees yet</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
