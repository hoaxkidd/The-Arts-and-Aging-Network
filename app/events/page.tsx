import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { PublicCalendarView } from "@/components/events/PublicCalendarView"
import { Calendar } from "lucide-react"

export default async function EventFeedPage() {
  const session = await auth()

  // Fetch ALL published events
  const events = await prisma.event.findMany({
    where: {
      status: 'PUBLISHED',
      startDateTime: {
        gte: new Date(new Date().setMonth(new Date().getMonth() - 1)) // From last month
      }
    },
    orderBy: { startDateTime: 'asc' },
    include: {
      location: { select: { name: true } }
    }
  })

  const userRole = session?.user?.role || 'VOLUNTEER'

  // Roles that can create events
  const canCreateEvents = ['ADMIN', 'HOME_ADMIN', 'FACILITATOR'].includes(userRole)

  // Format events for calendar
  const formattedEvents = events.map(e => ({
    id: e.id,
    title: e.title,
    startDateTime: e.startDateTime,
    endDateTime: e.endDateTime,
    status: e.status,
    location: e.location
  }))

  return (
    <div className="h-full flex flex-col">
      {/* Compact Header */}
      <header className="flex-shrink-0 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Events Calendar</h1>
            <p className="text-xs text-gray-500">Browse all upcoming events and activities</p>
          </div>
        </div>
      </header>

      {/* Calendar takes remaining space */}
      <div className="flex-1 min-h-0">
        <PublicCalendarView
          events={formattedEvents}
          userRole={userRole}
          canCreateEvents={canCreateEvents}
        />
      </div>
    </div>
  )
}
