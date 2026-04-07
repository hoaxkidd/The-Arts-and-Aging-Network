'use client'

import Link from 'next/link'
import { Calendar, Clock, MapPin } from 'lucide-react'
import { STYLES } from '@/lib/styles'

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
    month: 'long',
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
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="table-scroll-wrapper max-h-[calc(100vh-320px)]">
        <table className={STYLES.table}>
          <thead className="bg-gray-50">
            <tr className={STYLES.tableHeadRow}>
              <th className={STYLES.tableHeader}>Program</th>
              <th className={STYLES.tableHeader}>Place</th>
              <th className={STYLES.tableHeader}>Date</th>
              <th className={STYLES.tableHeader}>Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {bookings.map((booking) => (
              <tr key={booking.id} className={STYLES.tableRow}>
                <td className={STYLES.tableCell}>
                  <Link
                    href={`/staff/events/${booking.id}`}
                    className="text-primary-600 hover:text-primary-700 font-medium"
                  >
                    {booking.program}
                  </Link>
                  <div className="text-xs text-gray-500 mt-0.5">{booking.title}</div>
                </td>
                <td className={STYLES.tableCell}>
                  <div className="flex items-center gap-1.5 text-sm text-gray-700">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    {booking.place}
                  </div>
                </td>
                <td className={STYLES.tableCell}>
                  <div className="flex items-center gap-1.5 text-sm text-gray-700">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    {formatDate(booking.date)}
                  </div>
                </td>
                <td className={STYLES.tableCell}>
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
    </div>
  )
}
