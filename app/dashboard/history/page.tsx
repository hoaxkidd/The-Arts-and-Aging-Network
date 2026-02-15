import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Clock, CheckCircle, Calendar, MapPin, Search } from "lucide-react"
import { STYLES } from "@/lib/styles"
import { cn } from "@/lib/utils"
import Link from "next/link"

export default async function HistoryPage() {
  const session = await auth()
  const prismaClient = prisma as any

  // Fetch PAST events for this user (attended or hosted)
  const events = await prismaClient.event.findMany({
    where: {
      startDateTime: { lte: new Date() },
      OR: [
        { attendances: { some: { userId: session?.user?.id, status: 'YES' } } },
      ]
    },
    include: {
      location: { select: { name: true } }
    },
    orderBy: { startDateTime: 'desc' }
  })

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="flex-shrink-0 pb-4">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
          Event History
        </h1>
        <p className="text-sm text-gray-500 mt-1 ml-10">
          A record of past events and activities.
        </p>
      </header>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-auto">
        {events.length > 0 ? (
          <div className="space-y-2">
            {events.map((event: any) => {
              const eventDate = new Date(event.startDateTime)
              return (
                <div
                  key={event.id}
                  className="bg-white rounded-lg border border-gray-200 p-3 flex items-center gap-3 transition-colors"
                >
                  {/* Date Badge */}
                  <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gray-100 flex flex-col items-center justify-center text-gray-600">
                    <span className="text-[10px] font-medium uppercase">
                      {eventDate.toLocaleDateString('en-US', { month: 'short' })}
                    </span>
                    <span className="text-lg font-bold leading-none">
                      {eventDate.getDate()}
                    </span>
                  </div>

                  {/* Event Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 text-sm truncate">{event.title}</h3>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </span>
                      {event.location && (
                        <span className="flex items-center gap-1 truncate">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{event.location.name}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status */}
                  <div className="flex-shrink-0">
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded text-xs font-medium">
                      <CheckCircle className="w-3 h-3" />
                      Completed
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-6 h-6 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No History Yet</h3>
            <p className="text-gray-500 text-sm mb-4">
              You haven't attended any events yet. Browse available events to get started.
            </p>
            <Link
              href="/dashboard/events"
              className={cn(STYLES.btn, STYLES.btnPrimary)}
            >
              Browse Events
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
