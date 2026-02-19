import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { HomeEventsClient } from "./HomeEventsClient"
import { Calendar } from "lucide-react"

const db = prisma as any

export default async function HomeEventsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  // Get home for this user
  const home = await db.geriatricHome.findUnique({
    where: { userId: session.user.id },
    select: { id: true }
  })

  if (!home) redirect('/dashboard')

  // Get home's event requests to determine request status
  const homeRequests = await db.eventRequest.findMany({
    where: {
      geriatricHomeId: home.id,
      status: { in: ['PENDING', 'APPROVED'] }
    },
    select: {
      existingEventId: true,
      approvedEventId: true,
      status: true
    }
  })

  // Map of eventId -> request status
  const requestStatusMap = new Map<string, 'PENDING' | 'APPROVED'>()
  for (const req of homeRequests) {
    if (req.existingEventId) {
      requestStatusMap.set(req.existingEventId, req.status)
    }
    if (req.approvedEventId) {
      requestStatusMap.set(req.approvedEventId, req.status)
    }
  }

  // Fetch all published events (from admin templates + home's own)
  const allEvents = await db.event.findMany({
    where: {
      status: 'PUBLISHED',
      startDateTime: {
        gte: new Date(new Date().setMonth(new Date().getMonth() - 1))
      }
    },
    select: {
      id: true,
      title: true,
      startDateTime: true,
      endDateTime: true,
      status: true,
      requiredFormTemplateId: true,
      location: { select: { name: true } }
    },
    orderBy: { startDateTime: 'asc' }
  })

  // Also fetch events linked to this home (their own events)
  const homeEvents = await db.event.findMany({
    where: {
      geriatricHomeId: home.id
    },
    select: {
      id: true,
      title: true,
      startDateTime: true,
      endDateTime: true,
      status: true,
      requiredFormTemplateId: true,
      location: { select: { name: true } }
    }
  })

  // Combine and dedupe
  const eventMap = new Map()
  for (const e of [...allEvents, ...homeEvents]) {
    if (!eventMap.has(e.id)) {
      eventMap.set(e.id, e)
    }
  }

  const formattedEvents = Array.from(eventMap.values()).map((e: any) => ({
    id: e.id,
    title: e.title,
    startDateTime: e.startDateTime,
    endDateTime: e.endDateTime,
    status: e.status,
    location: e.location,
    myRequestStatus: requestStatusMap.get(e.id) || null,
    requiredFormTemplateId: e.requiredFormTemplateId ?? null
  }))

  return (
    <div className="h-full flex flex-col">
      <header className="flex-shrink-0 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Events</h1>
            <p className="text-xs text-gray-500">
              Browse events, request participation, and create custom event requests
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 min-h-0">
        <HomeEventsClient events={formattedEvents} />
      </div>
    </div>
  )
}
