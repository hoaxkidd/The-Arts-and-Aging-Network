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

  // Parallel fetch for better performance
  const [homeRequests, allEvents, homeEvents] = await Promise.all([
    db.eventRequest.findMany({
      where: {
        geriatricHomeId: home.id,
        status: { in: ['PENDING', 'APPROVED'] }
      },
      select: {
        existingEventId: true,
        approvedEventId: true,
        status: true
      }
    }),
    db.event.findMany({
      where: {
        status: 'PUBLISHED',
        startDateTime: {
          gte: new Date(new Date().setMonth(new Date().getMonth() - 1))
        }
      },
      take: 50,
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
    }),
    db.event.findMany({
      take: 20,
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
  ])

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
    <div className="h-full flex flex-col px-4 sm:px-6 py-5">
      <div className="flex-shrink-0 sticky top-0 z-10 bg-white pb-3 mb-3 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Events</h1>
            <p className="text-sm text-gray-500 mt-1">Browse events, request participation, and create custom event requests</p>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <HomeEventsClient events={formattedEvents} />
      </div>
    </div>
  )
}
