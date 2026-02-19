'use client'

import Link from 'next/link'
import { Calendar, Clock, MapPin } from 'lucide-react'

type Booking = {
  id: string
  title: string
  program: string
  place: string
  date: Date | string
  startTime: Date | string
  endTime: Date | string
}

function formatDate(date: Date | string) {
  const d = new Date(date)
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

function formatTime(date: Date | string) {
  const d = new Date(date)
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}

export function UpcomingBookingsTable({ bookings }: { bookings: Booking[] }) {
  if (bookings.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Calendar className="w-10 h-10 mx-auto mb-2 text-gray-300" />
        <p>No upcoming bookings</p>
      </div>
    )
  }

  return (
    <div className="table-scroll-wrapper max-h-[400px] rounded-lg border border-gray-200 overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Program
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Place
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Date
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Time
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {bookings.map((booking) => (
            <tr key={booking.id} className="hover:bg-gray-50 transition-colors">
              <td className="py-3 px-4">
                <Link
                  href={`/staff/events/${booking.id}`}
                  className="text-primary-600 hover:text-primary-700 font-medium"
                >
                  {booking.program}
                </Link>
                <div className="text-xs text-gray-500 mt-0.5">{booking.title}</div>
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-1.5 text-sm text-gray-700">
                  <MapPin className="w-3.5 h-3.5 text-gray-400" />
                  {booking.place}
                </div>
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-1.5 text-sm text-gray-700">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  {formatDate(booking.date)}
                </div>
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-1.5 text-sm text-gray-700">
                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                  {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
