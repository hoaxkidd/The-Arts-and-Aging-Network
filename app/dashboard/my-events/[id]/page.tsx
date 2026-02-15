import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Users,
  Star,
  CheckCircle,
  Image,
  ExternalLink
} from "lucide-react"
import { cn } from "@/lib/utils"
import { STYLES } from "@/lib/styles"
import { AddToCalendar } from "@/components/events/AddToCalendar"

const db = prisma as any

export default async function HomeEventDetailPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const { id } = await params

  // Get home for this user
  const home = await db.geriatricHome.findUnique({
    where: { userId: session.user.id }
  })

  if (!home) redirect('/dashboard')

  // Get event with all details
  const event = await db.event.findUnique({
    where: { id },
    include: {
      location: true,
      attendances: {
        include: {
          user: { select: { id: true, name: true, role: true, image: true } }
        }
      },
      photos: {
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: { uploader: { select: { name: true } } }
      },
      comments: {
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { name: true, image: true } } }
      },
      _count: { select: { photos: true, comments: true, attendances: true } }
    }
  })

  if (!event) notFound()

  // Calculate stats
  const confirmedStaff = event.attendances.filter(
    (a: any) => a.status === 'YES' && ['FACILITATOR', 'CONTRACTOR'].includes(a.user.role)
  )
  const checkedInStaff = confirmedStaff.filter((a: any) => a.checkInTime)
  const feedbackRatings = event.attendances
    .filter((a: any) => a.feedbackRating)
    .map((a: any) => a.feedbackRating)
  const avgRating = feedbackRatings.length > 0
    ? feedbackRatings.reduce((a: number, b: number) => a + b, 0) / feedbackRatings.length
    : null

  const eventDate = new Date(event.startDateTime)
  const endDate = new Date(event.endDateTime)
  const isPast = endDate < new Date()
  const isToday = eventDate.toDateString() === new Date().toDateString()

  return (
    <div className="h-full flex flex-col">
      {/* Compact Header */}
      <header className="flex-shrink-0 pb-3">
        <Link
          href="/dashboard/my-events"
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 mb-2"
        >
          <ArrowLeft className="w-3 h-3" />
          Back to My Events
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={cn(
              "px-2 py-0.5 rounded text-[10px] font-medium",
              isPast ? "bg-gray-100 text-gray-600" :
              isToday ? "bg-yellow-100 text-yellow-700" :
              "bg-green-100 text-green-700"
            )}>
              {isPast ? 'Completed' : isToday ? 'Today' : 'Upcoming'}
            </span>
            {event.origin === 'HOME_REQUESTED' && (
              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-[10px] font-medium">
                Your Request
              </span>
            )}
          </div>
          {/* Add to Calendar */}
          {!isPast && (
            <AddToCalendar event={{
              title: event.title,
              description: event.description,
              location: event.location?.address || '',
              startDateTime: event.startDateTime,
              endDateTime: event.endDateTime
            }} />
          )}
        </div>
        <h1 className="text-lg font-bold text-gray-900 mt-1">{event.title}</h1>
      </header>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-auto space-y-4">
        {/* Event Info Card */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="grid sm:grid-cols-2 gap-4">
            {/* Left: Details */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-4 h-4 text-primary-600" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase">Date</p>
                  <p className="text-sm font-medium text-gray-900">
                    {eventDate.toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Clock className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase">Time</p>
                  <p className="text-sm font-medium text-gray-900">
                    {eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - {endDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              {event.location && (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase">Location</p>
                    <p className="text-sm font-medium text-gray-900">{event.location.name}</p>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location.address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary-600 hover:underline flex items-center gap-0.5"
                    >
                      View on map <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Stats */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <Users className="w-4 h-4 text-blue-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-blue-700">{confirmedStaff.length}</p>
                <p className="text-[10px] text-blue-600">Staff</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <CheckCircle className="w-4 h-4 text-green-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-green-700">{checkedInStaff.length}</p>
                <p className="text-[10px] text-green-600">Checked In</p>
              </div>
              {avgRating && (
                <div className="bg-yellow-50 rounded-lg p-3 text-center">
                  <Star className="w-4 h-4 text-yellow-600 mx-auto mb-1" />
                  <p className="text-lg font-bold text-yellow-700">{avgRating.toFixed(1)}</p>
                  <p className="text-[10px] text-yellow-600">Rating</p>
                </div>
              )}
              <div className="bg-purple-50 rounded-lg p-3 text-center">
                <Image className="w-4 h-4 text-purple-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-purple-700">{event._count.photos}</p>
                <p className="text-[10px] text-purple-600">Photos</p>
              </div>
            </div>
          </div>

          {/* Description */}
          {event.description && (
            <div className="mt-4 pt-3 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-500 mb-1">Description</p>
              <p className="text-sm text-gray-600">{event.description}</p>
            </div>
          )}
        </div>

        {/* Assigned Staff */}
        {confirmedStaff.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50">
              <h2 className="text-sm font-semibold text-gray-900">Assigned Staff ({confirmedStaff.length})</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {confirmedStaff.slice(0, 5).map((attendance: any) => (
                <div key={attendance.user.id} className="px-4 py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center text-xs font-medium text-gray-600">
                      {attendance.user.name?.charAt(0) || '?'}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{attendance.user.name}</p>
                      <p className="text-[10px] text-gray-500">{attendance.user.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {attendance.checkInTime && (
                      <span className="text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                        <CheckCircle className="w-2.5 h-2.5" />
                        {new Date(attendance.checkInTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </span>
                    )}
                    {attendance.feedbackRating && (
                      <span className="text-[10px] text-yellow-600 bg-yellow-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                        <Star className="w-2.5 h-2.5" /> {attendance.feedbackRating}/5
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {confirmedStaff.length > 5 && (
                <div className="px-4 py-2 text-xs text-gray-500 text-center">
                  +{confirmedStaff.length - 5} more staff members
                </div>
              )}
            </div>
          </div>
        )}

        {/* Photos */}
        {event.photos.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50">
              <h2 className="text-sm font-semibold text-gray-900">Photos ({event._count.photos})</h2>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-4 gap-2">
                {event.photos.map((photo: any) => (
                  <div key={photo.id} className="aspect-square bg-gray-100 rounded overflow-hidden">
                    <img
                      src={photo.url}
                      alt={photo.caption || 'Event photo'}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Comments */}
        {event.comments.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50">
              <h2 className="text-sm font-semibold text-gray-900">Discussion ({event._count.comments})</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {event.comments.slice(0, 5).map((comment: any) => (
                <div key={comment.id} className="px-4 py-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-[10px] font-medium text-gray-600">
                      {comment.user.name?.charAt(0) || '?'}
                    </div>
                    <p className="text-xs font-medium text-gray-900">{comment.user.name}</p>
                    <p className="text-[10px] text-gray-400">
                      {new Date(comment.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <p className="text-sm text-gray-600 ml-8">{comment.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* View Full Event Link */}
        <div className="text-center py-2">
          <Link
            href={`/events/${event.id}`}
            className="inline-flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            View Full Event Page <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  )
}
