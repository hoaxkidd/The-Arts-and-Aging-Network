import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { EventManagementHubClient } from "./EventManagementHubClient"
import { getAllEventRequests } from "@/app/actions/event-requests"

export default async function EventManagementHubPage() {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') redirect('/dashboard')

  // Fetch Events
  const events = await prisma.event.findMany({
    orderBy: { startDateTime: 'asc' },
    include: {
      location: true,
      attendances: {
        include: { user: true }
      }
    }
  })

  // Fetch Requests
  const requestResult = await getAllEventRequests()
  const requests = requestResult.data || []

  return (
    <EventManagementHubClient 
        events={events}
        requests={requests}
    />
  )
}
