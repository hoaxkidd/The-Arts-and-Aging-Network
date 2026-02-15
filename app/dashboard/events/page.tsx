import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Calendar } from "lucide-react"
import { PublicCalendarView } from "@/components/events/PublicCalendarView"

export default async function BrowseEventsPage() {
  const session = await auth()

  // Fetch PUBLISHED events (past month and future)
  const events = await prisma.event.findMany({
    where: {
      status: 'PUBLISHED',
      startDateTime: {
        gte: new Date(new Date().setMonth(new Date().getMonth() - 1))
      }
    },
    include: {
      location: { select: { name: true } }
    },
    orderBy: { startDateTime: 'asc' }
  })

  const userRole = session?.user?.role || 'HOME_ADMIN'
  const canCreateEvents = ['ADMIN', 'HOME_ADMIN', 'FACILITATOR'].includes(userRole)

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
      <header className="flex-shrink-0 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Events Calendar</h1>
            <p className="text-xs text-gray-500">Browse and request events for your residents</p>
          </div>
        </div>
      </header>

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
