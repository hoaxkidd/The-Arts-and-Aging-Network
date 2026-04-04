import { prisma } from '@/lib/prisma'
import { verifyCalendarFeedToken } from '@/lib/calendar-feed'
import { generateICSFeedFile } from '@/lib/email/calendar'

function toSafeDate(value: Date): Date {
  return new Date(value)
}

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url)
  const userId = (searchParams.get('u') || '').trim()
  const token = (searchParams.get('t') || '').trim()

  if (!userId || !token) {
    return new Response('Missing feed credentials', { status: 400 })
  }

  if (!verifyCalendarFeedToken(userId, token)) {
    return new Response('Invalid feed token', { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, geriatricHome: { select: { id: true } } },
  })

  if (!user) {
    return new Response('User not found', { status: 404 })
  }

  const attendedEvents = await prisma.eventAttendance.findMany({
    where: {
      userId: user.id,
      status: 'YES',
      event: {
        status: { in: ['PUBLISHED', 'COMPLETED'] },
        endDateTime: { gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30) },
      },
    },
    select: {
      event: {
        select: {
          id: true,
          title: true,
          description: true,
          startDateTime: true,
          endDateTime: true,
          location: { select: { name: true, address: true } },
        },
      },
    },
    orderBy: { event: { startDateTime: 'asc' } },
  })

  const homeEvents = user.role === 'HOME_ADMIN' && user.geriatricHome?.id
    ? await prisma.event.findMany({
        where: {
          geriatricHomeId: user.geriatricHome.id,
          status: { in: ['PUBLISHED', 'COMPLETED'] },
          endDateTime: { gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30) },
        },
        select: {
          id: true,
          title: true,
          description: true,
          startDateTime: true,
          endDateTime: true,
          location: { select: { name: true, address: true } },
        },
        orderBy: { startDateTime: 'asc' },
      })
    : []

  const eventMap = new Map<string, {
    id: string
    title: string
    description: string | null
    startDateTime: Date
    endDateTime: Date
    location: { name: string; address: string | null }
  }>()

  for (const row of attendedEvents) {
    if (row.event) eventMap.set(row.event.id, row.event)
  }
  for (const row of homeEvents) {
    eventMap.set(row.id, row)
  }

  const appUrl = (process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '')
  const events = Array.from(eventMap.values()).map((event) => ({
    uid: `event-${event.id}@artsandaging.com`,
    title: event.title,
    description: event.description || undefined,
    startDateTime: toSafeDate(event.startDateTime),
    endDateTime: toSafeDate(event.endDateTime),
    location: event.location?.name || event.location?.address || undefined,
    url: appUrl ? `${appUrl}/events/${event.id}` : undefined,
  }))

  const ics = generateICSFeedFile(events)

  return new Response(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="arts-and-aging-feed.ics"',
      'Cache-Control': 'private, max-age=300',
    },
  })
}
