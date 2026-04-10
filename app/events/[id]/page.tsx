import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { deleteEvent } from "@/app/actions/events"
import { rsvpToEvent, checkInToEvent } from "@/app/actions/attendance"
import {
  Calendar,
  Clock,
  Users,
  Check,
  X,
  HelpCircle,
  ArrowLeft,
  Edit2,
  Trash2,
  Star,
  CalendarPlus,
  CheckCircle,
  MessageSquare,
  Image as ImageIcon
} from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { AddToCalendar } from "@/components/events/AddToCalendar"
import { EventMapModal } from '@/components/events/EventMapModal'
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
  const canManage = session?.user?.role === 'ADMIN'

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
      : { label: 'Upcoming', className: 'bg-blue-100 text-blue-700 border-blue-200' }
  const isEventDay = now.toDateString() === event.startDateTime.toDateString()
  const isCheckedIn = !!userAttendance?.checkInTime
  const isConfirmed = userAttendance?.status === 'YES'
  const rsvpStatus = userAttendance?.status || 'NOT_RESPONDED'
  const rsvpStatusBadge = rsvpStatus === 'YES'
    ? { label: 'RSVP: Going', className: 'bg-green-100 text-green-700 border-green-200' }
    : rsvpStatus === 'MAYBE'
      ? { label: 'RSVP: Maybe', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' }
      : rsvpStatus === 'NO'
        ? { label: 'RSVP: Declined', className: 'bg-red-100 text-red-700 border-red-200' }
        : { label: 'RSVP: Not responded', className: 'bg-gray-100 text-gray-600 border-gray-200' }

  const checkInOpenTime = getCheckInWindowStart(new Date(event.startDateTime), event.checkInWindowMinutes)
  const canCheckIn = isConfirmed && !isCheckedIn && !isPast && now >= checkInOpenTime

  const formatClock = (date: Date) =>
    date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })

  const sameDay = event.startDateTime.toDateString() === event.endDateTime.toDateString()
  const startDateLabel = event.startDateTime.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const endDateLabel = event.endDateTime.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  const schedulePrimary = sameDay
    ? event.startDateTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : `${startDateLabel} ${formatClock(event.startDateTime)} – ${endDateLabel} ${formatClock(event.endDateTime)}`

  const scheduleSecondary = sameDay
    ? `${formatClock(event.startDateTime)} – ${formatClock(event.endDateTime)}`
    : 'Multi-day event'

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
              <Link href="/events" className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700">
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Events
              </Link>
              <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Event details</p>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 truncate">{event.title}</h2>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className={cn(
                "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border whitespace-nowrap",
                lifecycleStatus.className
              )}>
                {lifecycleStatus.label}
              </span>
              {!showFullContent && !isPast ? (
                <span className={cn(
                  "inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border whitespace-nowrap",
                  rsvpStatusBadge.className
                )}>
                  {rsvpStatusBadge.label}
                </span>
              ) : null}
            </div>
          </div>
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
                  <button className={cn(STYLES.btn, STYLES.btnPrimary, "px-6") }>
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
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <AddToCalendar event={{
                    title: event.title,
                    description: event.description,
                    location: event.location.address,
                    startDateTime: event.startDateTime,
                    endDateTime: event.endDateTime
                  }} />
                  <form action={async () => { 'use server'; await rsvpToEvent(event.id, 'NO') }}>
                    <button className={cn(STYLES.btn, STYLES.btnSecondary, "py-2 text-sm")}>
                      <X className="w-4 h-4" /> Change RSVP
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              // RSVP Options
              <div className="text-center space-y-3">
                {session?.user?.role === 'ADMIN' ? (
                  <div className="flex items-center justify-center gap-2">
                    <Users className="w-5 h-5 text-primary-500" />
                    <span className="text-lg font-bold">{yesCount}/{event.maxAttendees}</span>
                    <span className="text-xs text-gray-500">confirmed</span>
                  </div>
                ) : null}
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

        {/* Event Info - Always Visible */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex-shrink-0">
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary-500" />
              <span className="font-medium">
                {schedulePrimary}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" />
              <span>{scheduleSecondary}</span>
            </div>
            <EventMapModal
              locationName={event.location.name}
              address={event.location.address}
            />
          </div>

          {/* Description if exists */}
          {event.description && (
            <p className="mt-3 pt-3 border-t border-gray-100 text-sm text-gray-600 leading-relaxed">{event.description}</p>
          )}
        </div>

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
