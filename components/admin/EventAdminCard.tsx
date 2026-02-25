'use client'

import { useState } from 'react'
import Link from "next/link"
import { Calendar, MapPin, Users, Clock, Edit2, Trash2, X, Check, Eye } from "lucide-react"
import { STYLES } from "@/lib/styles"
import { cn } from "@/lib/utils"
import { deleteEvent } from "@/app/actions/events"

type Attendee = {
  id: string
  status: string
  checkInTime: Date | null
  user: {
    id: string
    name: string | null
    email: string
  }
}

type EventAdminCardProps = {
  event: {
    id: string
    title: string
    status: string
    startDateTime: Date
    endDateTime: Date
    maxAttendees: number
    location: { name: string; address: string }
    attendances: Attendee[]
  }
}

export function EventAdminCard({ event }: EventAdminCardProps) {
  const [showModal, setShowModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const startDate = new Date(event.startDateTime)
  const endDate = new Date(event.endDateTime)
  const confirmedCount = event.attendances.filter(a => a.status === 'YES').length

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this event?')) {
      setIsDeleting(true)
      await deleteEvent(event.id)
    }
  }

  return (
    <>
      <div className={cn(STYLES.card, "transition-colors", isDeleting && "opacity-50 pointer-events-none")}>
        {/* Header: Title, Status, and Actions */}
        <div className="flex justify-between items-start gap-3 mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-gray-900 truncate">{event.title}</h3>
            <span className={cn(STYLES.badge, "mt-1",
              event.status === 'PUBLISHED' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
            )}>
              {event.status}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1 border border-gray-100">
            <button
              onClick={() => setShowModal(true)}
              className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-white rounded transition-colors"
              title="View Attendees"
            >
              <Eye className="w-4 h-4" />
            </button>
            <Link
              href={`/admin/events/${event.id}/edit`}
              className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-white rounded transition-colors"
              title="Edit Event"
            >
              <Edit2 className="w-4 h-4" />
            </Link>
            <button
              onClick={handleDelete}
              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-white rounded transition-colors"
              title="Delete Event"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Event Details */}
        <div className="grid grid-cols-1 gap-2 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <MapPin className="w-4 h-4 text-primary-600 flex-shrink-0" />
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location.address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium truncate hover:text-primary-600 hover:underline transition-colors"
            >
              {event.location.name}
            </a>
          </div>
          <div className="flex items-center gap-2 text-gray-700">
            <Calendar className="w-4 h-4 text-primary-600 flex-shrink-0" />
            <span>
              {startDate.toDateString() === endDate.toDateString()
                ? startDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
                : `${startDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}`
              }
            </span>
          </div>
          <div className="flex items-center gap-2 text-gray-700">
            <Clock className="w-4 h-4 text-primary-600 flex-shrink-0" />
            <span>
              {startDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {endDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </span>
          </div>
          <div className="flex items-center gap-2 text-gray-700">
            <Users className="w-4 h-4 text-primary-600 flex-shrink-0" />
            <span className="font-medium">{confirmedCount} / {event.maxAttendees}</span>
            <span className="text-gray-500">attendees</span>
          </div>
        </div>
      </div>

      {/* Attendance Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Attendance List</h2>
                <p className="text-sm text-gray-500 mt-0.5">{event.title}</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {/* Stats Summary */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-green-50 rounded-lg p-3 text-center border border-green-100">
                  <div className="text-2xl font-bold text-green-700">{event.attendances.filter(a => a.status === 'YES').length}</div>
                  <div className="text-xs text-green-600 font-medium">Going</div>
                </div>
                <div className="bg-yellow-50 rounded-lg p-3 text-center border border-yellow-100">
                  <div className="text-2xl font-bold text-yellow-700">{event.attendances.filter(a => a.status === 'MAYBE').length}</div>
                  <div className="text-xs text-yellow-600 font-medium">Maybe</div>
                </div>
                <div className="bg-red-50 rounded-lg p-3 text-center border border-red-100">
                  <div className="text-2xl font-bold text-red-700">{event.attendances.filter(a => a.status === 'NO').length}</div>
                  <div className="text-xs text-red-600 font-medium">Declined</div>
                </div>
              </div>

              {/* Attendee List */}
              {event.attendances.length > 0 ? (
                <div className="space-y-2">
                  {event.attendances.map((record) => (
                    <div key={record.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-bold">
                          {record.user.name?.[0]?.toUpperCase() || (record.user.email?.[0]?.toUpperCase() || 'U')}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 text-sm">{record.user.name || 'Unknown'}</div>
                          <div className="text-xs text-gray-500">{record.user.email || 'No email'}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {record.checkInTime && (
                          <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded border border-green-100 font-medium">
                            <Check className="w-3 h-3 inline mr-1" />
                            Checked In
                          </span>
                        )}
                        <span className={cn(STYLES.badge,
                          record.status === 'YES' ? "bg-green-100 text-green-800" :
                          record.status === 'NO' ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"
                        )}>
                          {record.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p className="font-medium">No attendees yet</p>
                  <p className="text-sm">RSVPs will appear here</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowModal(false)}
                className={cn(STYLES.btn, "w-full bg-gray-100 text-gray-700 hover:bg-gray-200")}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
