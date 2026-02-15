import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { Calendar } from "lucide-react"
import { StaffEventsClient } from "./StaffEventsClient"

const db = prisma as any

export default async function StaffEventsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  // Get published events (past month + future) for calendar view
  const events = await db.event.findMany({
    where: {
      status: 'PUBLISHED',
      startDateTime: {
        gte: new Date(new Date().setMonth(new Date().getMonth() - 1))
      }
    },
    include: {
      location: true,
      geriatricHome: { select: { id: true, name: true, address: true } },
      attendances: {
        include: { user: { select: { id: true, name: true, role: true } } }
      },
      _count: { select: { attendances: true, photos: true } }
    },
    orderBy: { startDateTime: 'asc' }
  })

  // Add user's attendance status to each event
  const eventsWithStatus = events.map((event: any) => {
    const myAttendance = event.attendances.find(
      (a: any) => a.userId === session.user?.id
    )
    const confirmedCount = event.attendances.filter((a: any) => a.status === 'YES').length

    return {
      id: event.id,
      title: event.title,
      description: event.description,
      startDateTime: event.startDateTime.toISOString(),
      endDateTime: event.endDateTime.toISOString(),
      status: event.status,
      location: event.location,
      geriatricHome: event.geriatricHome,
      maxAttendees: event.maxAttendees,
      myAttendanceStatus: myAttendance?.status || null,
      confirmedCount,
      spotsRemaining: event.maxAttendees - confirmedCount,
      photosCount: event._count.photos
    }
  })

  const userRole = session?.user?.role || 'FACILITATOR'
  const canCreateEvents = ['ADMIN', 'HOME_ADMIN', 'FACILITATOR'].includes(userRole)

  return (
    <div className="h-full flex flex-col">
      <header className="flex-shrink-0 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Events</h1>
            <p className="text-xs text-gray-500">Browse events and manage your attendances</p>
          </div>
        </div>
      </header>

      <div className="flex-1 min-h-0">
        <StaffEventsClient
          events={eventsWithStatus}
          userRole={userRole}
          canCreateEvents={canCreateEvents}
        />
      </div>
    </div>
  )
}
