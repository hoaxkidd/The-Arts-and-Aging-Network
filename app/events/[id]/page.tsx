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
import { checkInNotOpenMessage, getCheckInWindowStart } from "@/lib/event-checkin"

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

  // Home admin: check if their facility is participating (approved request)
  let homeIsParticipating = false
  if (session?.user?.role === 'HOME_ADMIN' && session.user.id) {
    const home = await prisma.geriatricHome.findUnique({
      where: { userId: session.user.id },
      select: { id: true }
    })
    if (home) {
      const approvedRequest = await prisma.eventRequest.findFirst({
        where: {
          geriatricHomeId: home.id,
          status: 'APPROVED',
          OR: [
            { existingEventId: event.id },
            { approvedEventId: event.id }
          ]
        }
      })
      homeIsParticipating = !!approvedRequest
    }
  }

  const now = new Date()
  const isPast = event.endDateTime < now
  const lifecycleStatus = now >= event.endDateTime
    ? { label: 'Finished', className: 'bg-gray-100 text-gray-700 border-gray-200' }
    : now >= event.startDateTime
      ? { label: 'Ongoing', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' }
      : { label: 'Started', className: 'bg-blue-100 text-blue-700 border-blue-200' }
  const isEventDay = now.toDateString() === event.startDateTime.toDateString()
  const isCheckedIn = !!userAttendance?.checkInTime
  const isConfirmed = userAttendance?.status === 'YES'

  const checkInOpenTime = getCheckInWindowStart(new Date(event.startDateTime), event.checkInWindowMinutes)
  const canCheckIn = isConfirmed && !isCheckedIn && !isPast && now >= checkInOpenTime

  // Full content: admins, checked-in users, or home admins whose facility is participating
  const showFullContent = canManage || isCheckedIn || homeIsParticipating

  return (
    <div className="h-full min-h-0 flex flex-col">
      {/* Content */}
      <div className="flex-1 min-h-0 overflow-hidden space-y-3 flex flex-col">
        {/* Event Header */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex-shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Event details</p>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 truncate">{event.title}</h2>
            </div>
            <span className={cn(
              "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border whitespace-nowrap",
              lifecycleStatus.className
            )}>
              {lifecycleStatus.label}
            </span>
          </div>
        </div>

        {/* Event Info - Always Visible */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex-shrink-0">
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary-500" />
              <span className="font-medium">
                {event.startDateTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
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
            <p className="mt-3 pt-3 border-t border-gray-100 text-sm text-gray-600 leading-relaxed">{event.description}</p>
          )}
        </div>

        {/* RSVP Section - Only for upcoming, non-checked-in users */}
        {!isPast && !showFullContent && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex-shrink-0">
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
                  <p className="text-xs text-gray-500">{checkInNotOpenMessage(event.checkInWindowMinutes)}</p>
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

        {/* Full Content - Only after check-in */}
        {showFullContent && (
          <div className="min-h-0 flex-1">
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
          </div>
        )}

        {/* Admin Attendance Table */}
        {canManage && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm flex-shrink-0">
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
