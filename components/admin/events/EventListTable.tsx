'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Calendar, MapPin, Users, Edit2, Trash2, Eye, X, Check, Clock, FileText, AlertTriangle } from 'lucide-react'
import { STYLES } from '@/lib/styles'
import { cn } from '@/lib/utils'
import { deleteEvent } from '@/app/actions/events'

type Attendee = {
  id: string
  status: string
  checkInTime: Date | null
  user: { id: string; name: string | null; email: string }
}

type Event = {
  id: string
  title: string
  description: string | null
  status: string
  startDateTime: Date
  endDateTime: Date
  maxAttendees: number
  checkInWindowMinutes: number
  organizerName: string | null
  organizerRole: string | null
  organizerEmail: string | null
  organizerPhone: string | null
  location: { name: string; address: string }
  requiredFormTemplate?: { id: string; title: string } | null
  attendances: Attendee[]
}

function EventRowActions({
  event,
  onViewDetails,
  onRequestDelete,
}: {
  event: Event
  onViewDetails: () => void
  onRequestDelete: () => void
}) {
  return (
    <>
      <button
        onClick={onViewDetails}
        className="p-2 text-gray-500 hover:text-primary-600 hover:bg-gray-100 rounded-lg transition-colors"
        title="View Event Details"
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
      <button
        type="button"
        onClick={onRequestDelete}
        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        title="Delete Event"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </>
  )
}

export function EventListTable({ events }: { events: Event[] }) {
  const router = useRouter()
  const [detailsEvent, setDetailsEvent] = useState<Event | null>(null)
  const [deleteEventTarget, setDeleteEventTarget] = useState<Event | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const sortedAttendees = useMemo(() => {
    if (!detailsEvent) return []
    return [...detailsEvent.attendances].sort((a, b) => {
      const an = (a.user.name || a.user.email || '').toLowerCase()
      const bn = (b.user.name || b.user.email || '').toLowerCase()
      return an.localeCompare(bn)
    })
  }, [detailsEvent])

  const handleDelete = async () => {
    if (!deleteEventTarget || deleting) return
    setDeleteError('')
    setDeleting(true)
    const result = await deleteEvent(deleteEventTarget.id)
    setDeleting(false)
    if (result?.success) {
      setDeleteEventTarget(null)
      if (detailsEvent?.id === deleteEventTarget.id) setDetailsEvent(null)
      router.refresh()
      return
    }

    setDeleteError(result?.error || 'Failed to delete event')
  }

  return (
    <>
      <div className="md:hidden space-y-3">
        {events.map((event) => {
          const start = new Date(event.startDateTime)
          const end = new Date(event.endDateTime)
          const confirmed = event.attendances.filter((a) => a.status === 'YES').length
          return (
            <div key={event.id} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h3 className="font-medium text-gray-900">{event.title}</h3>
                  <span
                    className={cn(
                      'inline-flex mt-1.5 px-2 py-0.5 rounded text-xs font-medium',
                      event.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600',
                    )}
                  >
                    {event.status}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <EventRowActions
                    event={event}
                    onViewDetails={() => setDetailsEvent(event)}
                    onRequestDelete={() => {
                      setDeleteError('')
                      setDeleteEventTarget(event)
                    }}
                  />
                </div>
              </div>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                  <span>{start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-400 shrink-0" />
                  <span>
                    {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} –{' '}
                    {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-gray-600 hover:text-primary-600 break-all"
                >
                  <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                  <span>{event.location.name}</span>
                </a>
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-gray-500">Attendees:</span>
                  <span className="font-medium">
                    {confirmed} / {event.maxAttendees}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="hidden md:block bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="table-scroll-wrapper max-h-[calc(100vh-320px)]">
          <table className={STYLES.table}>
            <thead className="bg-gray-50">
              <tr>
                <th className={STYLES.tableHeader}>Event</th>
                <th className={STYLES.tableHeader}>Date & Time</th>
                <th className={STYLES.tableHeader}>Location</th>
                <th className={cn(STYLES.tableHeader, 'text-right')}>Attendees</th>
                <th className={cn(STYLES.tableHeader, 'text-right')}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {events.map((event) => {
                const start = new Date(event.startDateTime)
                const end = new Date(event.endDateTime)
                const confirmed = event.attendances.filter((a) => a.status === 'YES').length
                return (
                  <tr key={event.id} className={STYLES.tableRow}>
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium text-gray-900">{event.title}</div>
                        <span
                          className={cn(
                            'inline-flex px-2 py-0.5 rounded text-xs font-medium',
                            event.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600',
                          )}
                        >
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
                        {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} –{' '}
                        {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                        <EventRowActions
                          event={event}
                          onViewDetails={() => setDetailsEvent(event)}
                          onRequestDelete={() => {
                            setDeleteError('')
                            setDeleteEventTarget(event)
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {detailsEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setDetailsEvent(null)}>
          <div
            className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Event Details</h3>
                <p className="text-sm text-gray-500">{detailsEvent.title}</p>
              </div>
              <button onClick={() => setDetailsEvent(null)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Status</p>
                  <span
                    className={cn(
                      'inline-flex mt-1 px-2 py-0.5 rounded text-xs font-medium',
                      detailsEvent.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600',
                    )}
                  >
                    {detailsEvent.status}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Capacity</p>
                  <p className="text-sm text-gray-700">
                    {detailsEvent.attendances.filter((r) => r.status === 'YES').length} / {detailsEvent.maxAttendees}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Date</p>
                  <p className="text-sm text-gray-700">
                    {new Date(detailsEvent.startDateTime).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Time</p>
                  <p className="text-sm text-gray-700 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    {new Date(detailsEvent.startDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} –{' '}
                    {new Date(detailsEvent.endDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs text-gray-500">Location</p>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(detailsEvent.location.address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-gray-700 hover:text-primary-600 inline-flex items-center gap-1"
                  >
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    {detailsEvent.location.name}
                  </a>
                </div>
              </div>

              {detailsEvent.description && (
                <div className="border-t pt-4">
                  <p className="text-xs text-gray-500 mb-1">Description</p>
                  <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">{detailsEvent.description}</p>
                </div>
              )}

              {(detailsEvent.organizerName || detailsEvent.organizerEmail || detailsEvent.organizerPhone || detailsEvent.organizerRole) && (
                <div className="border-t pt-4">
                  <p className="text-xs text-gray-500 mb-2">Organizer</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-700">
                    <p>{detailsEvent.organizerName || '—'}</p>
                    <p>{detailsEvent.organizerRole || '—'}</p>
                    <p>{detailsEvent.organizerEmail || '—'}</p>
                    <p>{detailsEvent.organizerPhone || '—'}</p>
                  </div>
                </div>
              )}

              <div className="border-t pt-4">
                <p className="text-xs text-gray-500 mb-2">Sign-up Form Template</p>
                <p className="text-sm text-gray-700 inline-flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-gray-400" />
                  {detailsEvent.requiredFormTemplate?.title || 'None required'}
                </p>
              </div>

              <div className="border-t pt-4">
                <p className="text-xs text-gray-500 mb-2">Attendees</p>
                {sortedAttendees.length > 0 ? (
                  <div className="space-y-2">
                    {sortedAttendees.map((r) => (
                      <div key={r.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{r.user.name || 'Unknown'}</p>
                          <p className="text-xs text-gray-500">{r.user.email || 'No email'}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {r.checkInTime && (
                            <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded flex items-center gap-1">
                              <Check className="w-3 h-3" /> Checked in
                            </span>
                          )}
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded text-xs font-medium',
                              r.status === 'YES' && 'bg-green-100 text-green-700',
                              r.status === 'NO' && 'bg-red-100 text-red-700',
                              r.status !== 'YES' && r.status !== 'NO' && 'bg-yellow-100 text-yellow-700',
                            )}
                          >
                            {r.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No attendees yet</p>
                )}
              </div>

              <div className="border-t pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDeleteEventTarget(detailsEvent)
                    setDetailsEvent(null)
                  }}
                  className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg"
                >
                  Delete Event
                </button>
                <Link
                  href={`/admin/events/${detailsEvent.id}/edit`}
                  onClick={() => setDetailsEvent(null)}
                  className="px-4 py-2 text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 rounded-lg"
                >
                  Edit Event
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteEventTarget && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            if (deleting) return
            setDeleteError('')
            setDeleteEventTarget(null)
          }}
        >
          <div className="bg-white rounded-lg p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Delete Event</h3>
                <p className="text-sm text-gray-600 mt-1">
                  You are about to delete <span className="font-medium">{deleteEventTarget.title}</span>.
                </p>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800 mb-5">
              This action is permanent and will remove related attendance records.
            </div>

            {deleteError && (
              <p className="text-sm text-red-700 mb-4">{deleteError}</p>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteError('')
                  setDeleteEventTarget(null)
                }}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete Event'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
