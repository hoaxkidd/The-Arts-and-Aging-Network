import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { deleteEvent } from "@/app/actions/events"
import { rsvpToEvent, checkInToEvent } from "@/app/actions/attendance"
import {
  Calendar,
  MapPin,
  Clock,
  Users,
  Check,
  X,
  HelpCircle,
  ArrowLeft,
  Edit2,
  Trash2,
  ExternalLink,
  Lock,
  Star,
  CalendarPlus,
  CheckCircle,
  MessageSquare,
  Image as ImageIcon
} from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { AddToCalendar } from "@/components/events/AddToCalendar"
import EventCommunityTabs from "@/components/events/EventCommunityTabs"
import { STYLES } from "@/lib/styles"

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      location: true,
      attendances: { include: { user: true } },
      comments: {
        where: { parentId: null },
        include: {
          user: { select: { id: true, name: true, image: true, role: true } },
          reactions: { include: { user: { select: { id: true, name: true } } } },
          replies: {
            include: {
              user: { select: { id: true, name: true, image: true, role: true } },
              reactions: { include: { user: { select: { id: true, name: true } } } }
            },
            orderBy: { createdAt: 'asc' }
          }
        },
        orderBy: { createdAt: 'desc' }
      },
      photos: {
        include: {
          uploader: { select: { id: true, name: true, image: true } },
          reactions: { include: { user: { select: { id: true, name: true } } } }
        },
        orderBy: { createdAt: 'desc' }
      }
    }
  })

  if (!event) return <div className="p-8 text-center text-gray-500">Event not found</div>

  const userAttendance = event.attendances.find(a => a.userId === session?.user?.id)
  const yesCount = event.attendances.filter(a => a.status === 'YES').length
  const isFull = yesCount >= event.maxAttendees
  const canManage = session?.user?.role === 'ADMIN' || session?.user?.role === 'PAYROLL'

  const now = new Date()
  const isPast = event.endDateTime < now
  const isEventDay = now.toDateString() === event.startDateTime.toDateString()
  const isCheckedIn = !!userAttendance?.checkInTime
  const isConfirmed = userAttendance?.status === 'YES'

  // Check-in available 24 hours before
  const checkInOpenTime = new Date(event.startDateTime.getTime() - 24 * 60 * 60 * 1000)
  const canCheckIn = isConfirmed && !isCheckedIn && !isPast && now >= checkInOpenTime

  // Full content only after check-in or for admins
  const showFullContent = canManage || isCheckedIn

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="flex-shrink-0 pb-3">
        <Link
          href="/events"
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 mb-2"
        >
          <ArrowLeft className="w-3 h-3" /> Back to Events
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn(
              "px-2 py-0.5 rounded text-[10px] font-medium",
              event.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' :
              event.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
              'bg-gray-100 text-gray-600'
            )}>
              {event.status === 'PUBLISHED' ? 'Active' : event.status}
            </span>
            {isPast && <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-medium">Past</span>}
            {isEventDay && !isPast && <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-[10px] font-medium animate-pulse">Today</span>}
            {isCheckedIn && (
              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-[10px] font-medium flex items-center gap-0.5">
                <CheckCircle className="w-2.5 h-2.5" /> Attended
              </span>
            )}
          </div>
          {canManage && (
            <div className="flex items-center gap-1">
              <Link href={`/events/${event.id}/edit`} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg">
                <Edit2 className="w-3.5 h-3.5" />
              </Link>
              <form action={async () => { 'use server'; await deleteEvent(event.id) }}>
                <button className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          )}
        </div>
        <h1 className="text-lg font-bold text-gray-900 mt-1">{event.title}</h1>
      </header>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-auto space-y-3">
        {/* Event Info - Always Visible */}
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary-500" />
              <span className="font-medium">
                {event.startDateTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" />
              <span>
                {event.startDateTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} – {event.endDateTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
              </span>
            </div>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location.address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-gray-600 hover:text-primary-600"
            >
              <MapPin className="w-4 h-4 text-green-500" />
              <span>{event.location.name}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Description if exists */}
          {event.description && (
            <p className="mt-3 pt-3 border-t border-gray-100 text-sm text-gray-600">{event.description}</p>
          )}
        </div>

        {/* RSVP Section - Only for upcoming, non-checked-in users */}
        {!isPast && !showFullContent && (
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            {canCheckIn ? (
              // Check-in Available
              <div className="text-center space-y-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Check-in Open</h3>
                  <p className="text-xs text-gray-500">Confirm your attendance to access event content</p>
                </div>
                <form action={async () => { 'use server'; await checkInToEvent(event.id) }}>
                  <button className={cn(STYLES.btn, STYLES.btnPrimary, "px-6")}>
                    <CheckCircle className="w-4 h-4" /> Check In
                  </button>
                </form>
              </div>
            ) : isConfirmed ? (
              // Confirmed - Add to Calendar
              <div className="text-center space-y-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                  <CalendarPlus className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">You're Confirmed!</h3>
                  <p className="text-xs text-gray-500">Check-in opens 24 hours before the event</p>
                </div>
                <AddToCalendar event={{
                  title: event.title,
                  description: event.description,
                  location: event.location.address,
                  startDateTime: event.startDateTime,
                  endDateTime: event.endDateTime
                }} />
                <form action={async () => { 'use server'; await rsvpToEvent(event.id, 'NO') }}>
                  <button className="text-xs text-red-500 hover:text-red-600 mt-2">Cancel RSVP</button>
                </form>
              </div>
            ) : (
              // RSVP Options
              <div className="text-center space-y-3">
                <div className="flex items-center justify-center gap-2">
                  <Users className="w-5 h-5 text-primary-500" />
                  <span className="text-lg font-bold">{yesCount}/{event.maxAttendees}</span>
                  <span className="text-xs text-gray-500">confirmed</span>
                </div>
                <p className="text-sm text-gray-600">
                  {isFull ? 'Event is full' : `${event.maxAttendees - yesCount} spots remaining`}
                </p>
                <div className="flex justify-center gap-2">
                  <form action={async () => { 'use server'; await rsvpToEvent(event.id, 'YES') }}>
                    <button
                      disabled={isFull}
                      className={cn(
                        "px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5",
                        userAttendance?.status === 'YES'
                          ? "bg-green-600 text-white"
                          : "bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                      )}
                    >
                      <Check className="w-4 h-4" /> Going
                    </button>
                  </form>
                  <form action={async () => { 'use server'; await rsvpToEvent(event.id, 'MAYBE') }}>
                    <button className={cn(
                      "px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5",
                      userAttendance?.status === 'MAYBE'
                        ? "bg-yellow-500 text-white"
                        : "bg-white border border-gray-200 hover:bg-gray-50"
                    )}>
                      <HelpCircle className="w-4 h-4" /> Maybe
                    </button>
                  </form>
                  <form action={async () => { 'use server'; await rsvpToEvent(event.id, 'NO') }}>
                    <button className={cn(
                      "px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5",
                      userAttendance?.status === 'NO'
                        ? "bg-red-500 text-white"
                        : "bg-white border border-gray-200 hover:bg-gray-50"
                    )}>
                      <X className="w-4 h-4" /> Decline
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Past Event Notice */}
        {isPast && !isCheckedIn && !canManage && (
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-6 text-center">
            <Lock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <h3 className="font-semibold text-gray-700">Event Has Ended</h3>
            <p className="text-sm text-gray-500">This event has already taken place.</p>
          </div>
        )}

        {/* Full Content - Only after check-in */}
        {showFullContent && (
          <EventCommunityTabs
            eventId={event.id}
            description={event.description || ""}
            photos={event.photos}
            comments={event.comments}
            currentUserId={session?.user?.id || ""}
            canManage={canManage}
            userAttendance={{
              status: userAttendance?.status || 'MAYBE',
              feedbackRating: userAttendance?.feedbackRating || null
            }}
          />
        )}

        {/* Admin Attendance Table */}
        {canManage && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-4 py-2 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-400" /> Attendance
              </h3>
              <span className="text-xs text-gray-500">{yesCount}/{event.maxAttendees}</span>
            </div>
            <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
              {event.attendances.filter((r: any) => r.status === 'YES').map((record: any) => (
                <div key={record.id} className="px-4 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-medium">
                      {record.user.name?.[0] || 'U'}
                    </div>
                    <span className="text-sm font-medium text-gray-900">{record.user.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {record.checkInTime ? (
                      <span className="text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                        <Check className="w-2.5 h-2.5" />
                        {record.checkInTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </span>
                    ) : (
                      <span className="text-[10px] text-gray-400">Not checked in</span>
                    )}
                    {record.feedbackRating && (
                      <span className="text-[10px] flex items-center gap-0.5">
                        <Star className="w-2.5 h-2.5 text-yellow-400 fill-current" />
                        {record.feedbackRating}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {event.attendances.filter((r: any) => r.status === 'YES').length === 0 && (
                <div className="px-4 py-6 text-center text-sm text-gray-400">No confirmed attendees</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
