import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Calendar } from "lucide-react"
import { HomeCalendarView } from "@/components/dashboard/HomeCalendarView"

export default async function SchedulePage() {
  const session = await auth()
  if (!session?.user) return <div>Unauthorized</div>

  const prismaClient = prisma as any

  // Fetch events where the user is an attendee (STAFF/VOLUNTEER)
  const events = await prismaClient.event.findMany({
    where: {
        attendances: { some: { userId: session.user.id } }
    },
    include: {
        attendances: {
            where: { userId: session.user.id }
        },
        location: true
    }
  })

  const formattedEvents = events.map((e: any) => ({
    id: e.id,
    title: e.title,
    startDateTime: e.startDateTime,
    endDateTime: e.endDateTime,
    status: e.attendances[0]?.status === 'YES' ? 'BOOKED' : 'PENDING'
  }))

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Calendar className="w-8 h-8 text-primary-600" />
            My Schedule
        </h1>
        <p className="text-gray-600 mt-2">View your upcoming shifts and volunteer opportunities.</p>
      </header>

      {/* Reuse the Calendar View component */}
      <HomeCalendarView events={formattedEvents} />
      
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Upcoming Shifts</h2>
        </div>
        <div className="divide-y divide-gray-100">
            {events.length > 0 ? (
                events.map((event: any) => (
                    <div key={event.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                        <div>
                            <h3 className="font-medium text-gray-900">{event.title}</h3>
                            <p className="text-sm text-gray-500">
                                {new Date(event.startDateTime).toLocaleDateString()} @ {new Date(event.startDateTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">{event.location?.address}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            event.attendances[0]?.status === 'YES' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                            {event.attendances[0]?.status}
                        </span>
                    </div>
                ))
            ) : (
                <p className="p-8 text-center text-gray-500">No upcoming shifts scheduled.</p>
            )}
        </div>
      </div>
    </div>
  )
}
