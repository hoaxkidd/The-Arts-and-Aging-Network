import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Building2, Calendar, Clock, ArrowUpRight, CalendarCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"

export default async function HomeAdminDashboard() {
  const session = await auth()

  // Use any to bypass TS inference issues during build when client is out of sync
  const prismaClient = prisma as any

  // Fetch home ID for the current user
  const home = await prismaClient.geriatricHome.findUnique({
    where: { userId: session?.user?.id },
    select: { id: true, name: true }
  })

  let events: any[] = []

  try {
    events = await prismaClient.event.findMany({
        where: {
            OR: [
                { geriatricHomeId: home?.id },
                { attendances: { some: { userId: session?.user?.id } } }
            ]
        },
        include: {
            location: true,
            attendances: {
                where: { userId: session?.user?.id }
            }
        },
        orderBy: { startDateTime: 'asc' }
    })
  } catch (e) {
    console.error("Failed to fetch dashboard events:", e)
  }

  const now = new Date()
  const upcoming = events.filter(e => new Date(e.startDateTime) > now)
  const past = events.filter(e => new Date(e.startDateTime) <= now)

  // Safe access to attendance
  const pendingCount = upcoming.filter(e => e.attendances?.[0]?.status === 'MAYBE').length

  return (
    <div className="h-full flex flex-col">
      {/* Compact Header */}
      <header className="flex-shrink-0 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">{home?.name || "Home Dashboard"}</h1>
              <p className="text-xs text-gray-500">Welcome back, {session?.user?.name}</p>
            </div>
          </div>
          <Link
            href="/events"
            className="px-3 py-1.5 text-xs font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-1.5"
          >
            <CalendarCheck className="w-3.5 h-3.5" />
            View Calendar
          </Link>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-auto space-y-4">
        {/* Compact Stats */}
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-white rounded-lg border border-gray-200 p-2.5 text-center">
            <p className="text-xl font-bold text-gray-900">{events.length}</p>
            <p className="text-[10px] text-gray-500">Total</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 text-center">
            <p className="text-xl font-bold text-blue-700">{upcoming.length}</p>
            <p className="text-[10px] text-blue-600">Upcoming</p>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2.5 text-center">
            <p className="text-xl font-bold text-yellow-700">{pendingCount}</p>
            <p className="text-[10px] text-yellow-600">Pending</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-center">
            <p className="text-xl font-bold text-gray-700">{past.length}</p>
            <p className="text-[10px] text-gray-500">Past</p>
          </div>
        </div>

        {/* Upcoming Schedule Card */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary-500" />
              Upcoming Schedule
            </h3>
            <Link
              href="/events"
              className="text-xs font-medium text-primary-500 hover:text-primary-600 flex items-center gap-1"
            >
              View all <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <div>
            {upcoming.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {upcoming.slice(0, 5).map((event, index) => (
                  <Link
                    key={event.id}
                    href={`/events/${event.id}`}
                    className={cn(
                      "flex items-center justify-between p-3 hover:bg-gray-50 transition-colors",
                      index === 0 && "bg-primary-50/50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex flex-col items-center justify-center",
                        index === 0 ? "bg-primary-500 text-white" : "bg-gray-100 text-gray-600"
                      )}>
                        <span className="text-[9px] font-medium uppercase">
                          {new Date(event.startDateTime).toLocaleDateString('en-US', { month: 'short' })}
                        </span>
                        <span className="text-sm font-bold leading-none">
                          {new Date(event.startDateTime).getDate()}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900">{event.title}</h3>
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(event.startDateTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </p>
                      </div>
                    </div>
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-medium",
                      event.attendances?.[0]?.status === 'YES' ? "bg-green-100 text-green-700" :
                      event.attendances?.[0]?.status === 'NO' ? "bg-red-100 text-red-700" :
                      "bg-yellow-100 text-yellow-700"
                    )}>
                      {event.attendances?.[0]?.status || 'Pending'}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <div className="w-12 h-12 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Calendar className="w-6 h-6 text-primary-400" />
                </div>
                <p className="text-sm font-medium text-gray-900">No upcoming events</p>
                <p className="text-xs text-gray-500 mt-1">Check the calendar to find and request new events.</p>
                <Link
                  href="/events"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 mt-3 text-xs font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  Browse Events
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
