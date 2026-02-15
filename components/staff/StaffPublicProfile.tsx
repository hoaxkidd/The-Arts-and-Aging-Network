'use client'

import { useState } from 'react'
import { MapPin, Briefcase, Mail, Calendar, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { UpcomingBookingsTable } from './UpcomingBookingsTable'
import { DirectMessageModal } from '@/components/communication/DirectMessageModal'
import { MeetingRequestModal } from '@/components/communication/MeetingRequestModal'
import { PhoneRequestButton } from '@/components/communication/PhoneRequestButton'

type StaffMember = {
  id: string
  name: string | null
  preferredName: string | null
  pronouns: string | null
  image: string | null
  role: string
  position: string | null
  region: string | null
  bio: string | null
}

type Booking = {
  id: string
  title: string
  program: string
  place: string
  date: Date | string
  startTime: Date | string
  endTime: Date | string
}

type Props = {
  staff: StaffMember
  upcomingEvents: Booking[]
  phoneRequestStatus: string | null
  currentUserId: string
}

const roleLabels: Record<string, string> = {
  ADMIN: 'Administrator',
  HOME_ADMIN: 'Home Administrator',
  FACILITATOR: 'Facilitator',
  CONTRACTOR: 'Contractor',
  VOLUNTEER: 'Volunteer'
}

export function StaffPublicProfile({ staff, upcomingEvents, phoneRequestStatus, currentUserId }: Props) {
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [showMeetingModal, setShowMeetingModal] = useState(false)

  const displayName = staff.preferredName || staff.name || 'Unknown'
  const initials = displayName.charAt(0).toUpperCase()
  const isOwnProfile = staff.id === currentUserId

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back Button */}
      <Link
        href="/staff/directory"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Directory
      </Link>

      {/* Profile Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row md:items-start gap-6">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {staff.image ? (
              <img
                src={staff.image}
                alt={displayName}
                className="w-24 h-24 rounded-full object-cover border-4 border-gray-100"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 text-3xl font-bold border-4 border-primary-50">
                {initials}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">{displayName}</h1>
              {staff.pronouns && (
                <span className="text-sm text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                  {staff.pronouns}
                </span>
              )}
            </div>

            {/* Position/Role */}
            <div className="flex items-center gap-2 mt-2 text-gray-600">
              <Briefcase className="w-4 h-4" />
              <span>{staff.position || roleLabels[staff.role] || staff.role}</span>
            </div>

            {/* Region */}
            {staff.region && (
              <div className="flex items-center gap-2 mt-1 text-gray-500">
                <MapPin className="w-4 h-4" />
                <span>{staff.region}</span>
              </div>
            )}

            {/* Bio */}
            {staff.bio && (
              <p className="mt-4 text-gray-600 whitespace-pre-wrap">{staff.bio}</p>
            )}
          </div>

          {/* Action Buttons (only show for other users) */}
          {!isOwnProfile && (
            <div className="flex flex-col gap-2 md:ml-4">
              <button
                onClick={() => setShowMessageModal(true)}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Mail className="w-4 h-4" />
                Send Message
              </button>

              <button
                onClick={() => setShowMeetingModal(true)}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Calendar className="w-4 h-4" />
                Request Meeting
              </button>

              <PhoneRequestButton
                staffId={staff.id}
                currentStatus={phoneRequestStatus}
              />
            </div>
          )}
        </div>
      </div>

      {/* Upcoming Bookings */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary-600" />
          Upcoming Bookings
        </h2>
        <UpcomingBookingsTable bookings={upcomingEvents} />
      </div>

      {/* Communication Modals */}
      <DirectMessageModal
        recipientId={staff.id}
        recipientName={displayName}
        isOpen={showMessageModal}
        onClose={() => setShowMessageModal(false)}
      />

      <MeetingRequestModal
        staffId={staff.id}
        staffName={displayName}
        isOpen={showMeetingModal}
        onClose={() => setShowMeetingModal(false)}
      />
    </div>
  )
}
