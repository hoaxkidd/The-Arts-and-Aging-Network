import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getHomeEventHistory, getHomeEventRequests } from "@/app/actions/booking-requests"
import { MyBookingsClient } from "./MyBookingsClient"

export default async function HomeMyBookingsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const [historyResult, requestsResult] = await Promise.all([
    getHomeEventHistory(),
    getHomeEventRequests(),
  ])

  if (historyResult.error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600">{historyResult.error}</p>
      </div>
    )
  }

  if (requestsResult.error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600">{requestsResult.error}</p>
      </div>
    )
  }

  const events = historyResult.data || []
  const requests = requestsResult.data || []

  return <MyBookingsClient events={events as any[]} requests={requests as any[]} />
}
