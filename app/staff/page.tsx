import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link from "next/link"
import {
  Calendar,
  CheckCircle,
  Clock,
  ArrowRight,
  MapPin,
  LayoutDashboard,
  ArrowUpRight
} from "lucide-react"
import { cn } from "@/lib/utils"

const db = prisma as any

export default async function StaffDashboard() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  // Get my confirmed events
  let myAttendances: any[] = []
  try {
    const rows = await db.eventAttendance.findMany({
      where: {
        userId: session.user.id,
        status: 'YES'
      },
      include: {
        event: {
          include: {
            location: true,
            geriatricHome: { select: { name: true } }
          }
        }
      },
      orderBy: { event: { startDateTime: 'asc' } }
    })
    myAttendances = rows
  } catch (err) {
    // Fallback: query without relation orderBy (more compatible with some DB/Prisma setups)
    try {
      const rows = await db.eventAttendance.findMany({
        where: {
          userId: session.user.id,
          status: 'YES'
        },
        include: {
          event: {
            include: {
              location: true,
              geriatricHome: { select: { name: true } }
            }
          }
        }
      })
      myAttendances = rows.sort(
        (a: any, b: any) =>
          new Date(a.event.startDateTime).getTime() - new Date(b.event.startDateTime).getTime()
      )
    } catch {
      // DB error: show empty state
    }
  }

  const now = new Date()

  // Filter events
  const upcomingEvents = myAttendances.filter((a: any) =>
    new Date(a.event.startDateTime) >= now && a.event.status === 'PUBLISHED'
  )

  const todayEvents = upcomingEvents.filter((a: any) =>
    new Date(a.event.startDateTime).toDateString() === now.toDateString()
  )

  const checkedInCount = myAttendances.filter((a: any) => a.checkInTime).length

  return (
    <div className="h-full flex flex-col">
      {/* Compact Header */}
      <header className="flex-shrink-0 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center">
            <LayoutDashboard className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Staff Dashboard</h1>
            <p className="text-xs text-gray-500">Welcome back, {session.user?.name ?? 'User'}</p>
          </div>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-auto space-y-4">
        {/* Compact Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <Link href="/staff/my-events" className="bg-white rounded-lg border border-gray-200 p-3 transition-colors">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-4 h-4 text-primary-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{upcomingEvents.length}</p>
                <p className="text-[10px] text-gray-500">Upcoming</p>
              </div>
            </div>
          </Link>
          <Link href="/staff/my-events" className="bg-white rounded-lg border border-gray-200 p-3 transition-colors">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-secondary-100 rounded-lg flex items-center justify-center">
                <Clock className="w-4 h-4 text-secondary-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{todayEvents.length}</p>
                <p className="text-[10px] text-gray-500">Today</p>
              </div>
            </div>
          </Link>
          <Link href="/staff/my-events" className="bg-white rounded-lg border border-gray-200 p-3 transition-colors">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{checkedInCount}</p>
                <p className="text-[10px] text-gray-500">Check-ins</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Today's Events Banner */}
        {todayEvents.length > 0 && (
          <div className="bg-gradient-to-r from-secondary-100 to-secondary-50 border border-secondary-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-secondary-400 rounded-lg flex items-center justify-center text-white">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Today&apos;s Events</h2>
                <p className="text-xs text-gray-600">{todayEvents.length} event(s) scheduled</p>
              </div>
            </div>
            <div className="space-y-2">
              {todayEvents.map((attendance: any) => {
                const event = attendance.event
                const eventTime = new Date(event.startDateTime).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit'
                })
                const canCheckIn = !attendance.checkInTime

                return (
                  <Link
                    key={event.id}
                    href={`/staff/events/${event.id}`}
                    className="flex items-center justify-between bg-white rounded-lg p-3 transition-colors border border-gray-100"
                  >
                    <div className="flex items-center gap-3">
                      <div className="px-2 py-1 bg-primary-50 rounded text-sm font-bold text-primary-600">
                        {eventTime}
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900">{event.title}</h3>
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <MapPin className="w-2.5 h-2.5" /> {event.location?.name}
                        </p>
                      </div>
                    </div>
                    {canCheckIn ? (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-[10px] font-medium animate-pulse">
                        Check In
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-medium flex items-center gap-0.5">
                        <CheckCircle className="w-2.5 h-2.5" /> Done
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Upcoming Events */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary-500" />
              Upcoming Schedule
            </h3>
            <Link
              href="/staff/my-events"
              className="text-xs text-primary-500 hover:text-primary-600 font-medium flex items-center gap-1"
            >
              View All <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          {upcomingEvents.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {upcomingEvents.slice(0, 5).map((attendance: any, index: number) => {
                const event = attendance.event
                const eventDate = new Date(event.startDateTime)

                return (
                  <Link
                    key={event.id}
                    href={`/staff/events/${event.id}`}
                    className={cn(
                      "flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors",
                      index === 0 && "bg-primary-50/50"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex flex-col items-center justify-center",
                      index === 0 ? "bg-primary-500 text-white" : "bg-gray-100"
                    )}>
                      <span className={cn(
                        "text-[9px] font-medium uppercase",
                        index === 0 ? "text-primary-100" : "text-primary-500"
                      )}>
                        {eventDate.toLocaleDateString('en-US', { month: 'short' })}
                      </span>
                      <span className={cn(
                        "text-sm font-bold leading-none",
                        index === 0 ? "text-white" : "text-gray-900"
                      )}>
                        {eventDate.getDate()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 truncate">{event.title}</h3>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {event.location?.name}
                        </span>
                      </div>
                    </div>
                    {event.geriatricHome && (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-medium">
                        {event.geriatricHome.name}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="p-8 text-center">
              <div className="w-12 h-12 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <Calendar className="w-6 h-6 text-primary-400" />
              </div>
              <p className="text-sm font-medium text-gray-900">No Upcoming Events</p>
              <p className="text-xs text-gray-500 mt-1">Browse available events and confirm your attendance.</p>
              <Link
                href="/staff/events"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 mt-3 text-xs font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Browse Events
              </Link>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/staff/events"
            className="group flex items-center gap-3 p-3 bg-gradient-to-br from-primary-50 to-primary-100 rounded-lg border border-primary-200 hover:border-primary-400 transition-colors"
          >
            <div className="w-9 h-9 bg-white shadow-sm rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <Calendar className="w-4 h-4 text-primary-500" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-gray-900">Browse Events</h3>
              <p className="text-[10px] text-gray-500">Find and confirm attendance</p>
            </div>
            <ArrowRight className="w-4 h-4 text-primary-300 group-hover:text-primary-500" />
          </Link>

          <Link
            href="/staff/my-events"
            className="group flex items-center gap-3 p-3 bg-gradient-to-br from-accent-50 to-accent-100 rounded-lg border border-accent-200 hover:border-accent-400 transition-colors"
          >
            <div className="w-9 h-9 bg-white shadow-sm rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <CheckCircle className="w-4 h-4 text-accent-500" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-gray-900">My Schedule</h3>
              <p className="text-[10px] text-gray-500">View confirmed events</p>
            </div>
            <ArrowRight className="w-4 h-4 text-accent-300 group-hover:text-accent-500" />
          </Link>
        </div>
      </div>
    </div>
  )
}
