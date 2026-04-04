import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Calendar, Clock, ArrowUpRight, ArrowUp, ArrowDown, MapPin, Plus, Users, FileText, Settings, CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { logger } from "@/lib/logger"

const quickActions = [
  { label: "New Request", icon: Plus, href: "/dashboard/requests/new", color: "bg-primary-500", hover: "hover:bg-primary-600" },
  { label: "Browse Events", icon: Calendar, href: "/dashboard/events", color: "bg-blue-500", hover: "hover:bg-blue-600" },
  { label: "My Events", icon: CheckCircle, href: "/dashboard/my-events", color: "bg-green-500", hover: "hover:bg-green-600" },
  { label: "Contacts", icon: Users, href: "/dashboard/contacts", color: "bg-purple-500", hover: "hover:bg-purple-600" },
  { label: "Forms", icon: FileText, href: "/dashboard/forms", color: "bg-amber-500", hover: "hover:bg-amber-600" },
  { label: "Profile", icon: Settings, href: "/dashboard/profile", color: "bg-gray-500", hover: "hover:bg-gray-600" },
]

export default async function HomeAdminDashboard() {
  const session = await auth()

  const home = await prisma.geriatricHome.findUnique({
    where: { userId: session?.user?.id },
    select: { id: true, name: true }
  })

  let events: any[] = []

  try {
    events = await prisma.event.findMany({
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
    logger.serverAction("Failed to fetch dashboard events:", e)
  }

  const now = new Date()
  const upcoming = events.filter(e => new Date(e.startDateTime) > now)
  const past = events.filter(e => new Date(e.startDateTime) <= now)
  const pendingCount = upcoming.filter(e => e.attendances?.[0]?.status === 'MAYBE').length

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0 overflow-auto pt-4">
        <div className="space-y-5">
          {/* Row: Stats + Action Buttons (50:50 split) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Stats (2x2 grid, compact) */}
            <div className="flex flex-col">
              <div className="grid grid-cols-2 gap-2 content-start">
                <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-200 p-2 min-h-[50px]">
                  <div className="w-6 h-6 rounded bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                    <Calendar className="w-3 h-3" />
                  </div>
                  <div className="flex items-center gap-1">
                    <p className="text-sm font-bold text-gray-900">{events.length}</p>
                    <p className="text-[10px] text-gray-500">Total</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-200 p-2 min-h-[50px]">
                  <div className="w-6 h-6 rounded bg-green-100 text-green-600 flex items-center justify-center shrink-0">
                    <ArrowUp className="w-3 h-3" />
                  </div>
                  <div className="flex items-center gap-1">
                    <p className="text-sm font-bold text-gray-900">{upcoming.length}</p>
                    <p className="text-[10px] text-gray-500">Upcoming</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-200 p-2 min-h-[50px]">
                  <div className="w-6 h-6 rounded bg-yellow-100 text-yellow-600 flex items-center justify-center shrink-0">
                    <Clock className="w-3 h-3" />
                  </div>
                  <div className="flex items-center gap-1">
                    <p className="text-sm font-bold text-gray-900">{pendingCount}</p>
                    <p className="text-[10px] text-gray-500">Pending</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-200 p-2 min-h-[50px]">
                  <div className="w-6 h-6 rounded bg-gray-100 text-gray-600 flex items-center justify-center shrink-0">
                    <ArrowDown className="w-3 h-3" />
                  </div>
                  <div className="flex items-center gap-1">
                    <p className="text-sm font-bold text-gray-900">{past.length}</p>
                    <p className="text-[10px] text-gray-500">Past</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Action Buttons (2x3 grid) */}
            <div className="flex flex-col">
              <div className="grid grid-cols-2 gap-2 flex-1 content-start">
                {quickActions.map((action) => (
                  <Link
                    key={action.label}
                    href={action.href}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-xl text-white transition-all duration-200 shadow-sm",
                      action.color,
                      action.hover
                    )}
                  >
                    <action.icon className="w-4 h-4 shrink-0" />
                    <span className="text-sm font-medium">{action.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Full Width: Upcoming Schedule */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary-500" />
                Upcoming Schedule
              </h3>
              <Link
                href="/dashboard/events"
                className="text-xs font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1"
              >
                View all <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
            <div>
              {upcoming.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {upcoming.slice(0, 6).map((event, index) => (
                    <Link
                      key={event.id}
                      href={`/events/${event.id}`}
                      className={cn(
                        "flex items-center gap-3 p-3 hover:bg-gray-50/50 transition-colors",
                        index === 0 && "bg-primary-50/30"
                      )}
                    >
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0",
                        index === 0 ? "bg-primary-500 text-white" : "bg-primary-50 text-primary-700"
                      )}>
                        <span className="text-[9px] font-semibold uppercase">
                          {new Date(event.startDateTime).toLocaleDateString('en-US', { month: 'long' })}
                        </span>
                        <span className="text-lg font-bold leading-none">
                          {new Date(event.startDateTime).getDate()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-gray-900 truncate">{event.title}</h4>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(event.startDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {event.location && (
                            <span className="text-xs text-gray-500 flex items-center gap-1 truncate">
                              <MapPin className="w-3 h-3 shrink-0" />
                              {event.location.name}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className={cn(
                        "px-2 py-1 rounded-lg text-[10px] font-semibold shrink-0",
                        event.attendances?.[0]?.status === 'YES' ? "bg-green-100 text-green-700" :
                        event.attendances?.[0]?.status === 'NO' ? "bg-red-100 text-red-700" :
                        event.attendances?.[0]?.status === 'MAYBE' ? "bg-yellow-100 text-yellow-700" :
                        "bg-blue-100 text-blue-700"
                      )}>
                        {event.attendances?.[0]?.status === 'YES' ? 'Going' :
                         event.attendances?.[0]?.status === 'NO' ? 'Not Going' :
                         event.attendances?.[0]?.status === 'MAYBE' ? 'Maybe' :
                         'Available'}
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Calendar className="w-7 h-7 text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-900">No upcoming events</p>
                  <p className="text-xs text-gray-500 mt-1 mb-4">Browse events to find opportunities for your residents.</p>
                  <Link
                    href="/dashboard/events"
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    Browse Events
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
