import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { Calendar } from "lucide-react"
import { StaffEventsClient } from "./StaffEventsClient"
import { getPendingFacilitatorRsvpRequests } from "@/app/actions/booking-requests"
import { BOOKINGS_ACCESS_POLICY_TEMPLATE_TYPE, canRoleAccessBookings, parseBookingsAccessPolicyConfig } from "@/lib/bookings-access-policy"
import { getRoleHomePath } from "@/lib/role-routes"

const db = prisma as any

export const revalidate = 30

export default async function StaffEventsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const policyTemplate = await db.emailTemplate.findUnique({
    where: { type: BOOKINGS_ACCESS_POLICY_TEMPLATE_TYPE },
    select: { content: true },
  })
  const policyConfig = parseBookingsAccessPolicyConfig(policyTemplate?.content)

  if (session.user.role === 'HOME_ADMIN') {
    redirect('/dashboard/my-bookings')
  }

  if (!canRoleAccessBookings(session.user.role, policyConfig)) {
    redirect(getRoleHomePath(session.user.role))
  }

  // Get published events (past month + future) for calendar view
  const [events, pendingRsvpsResult] = await Promise.all([
    db.event.findMany({
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
  }),
    getPendingFacilitatorRsvpRequests()
  ])

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
  const canCreateEvents = ['ADMIN', 'HOME_ADMIN'].includes(userRole)
  const pendingFacilitatorRequests = pendingRsvpsResult.success ? pendingRsvpsResult.data : []

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0">
        <StaffEventsClient
          events={eventsWithStatus}
          pendingFacilitatorRequests={pendingFacilitatorRequests}
          userRole={userRole}
          canCreateEvents={canCreateEvents}
        />
      </div>
    </div>
  )
}
