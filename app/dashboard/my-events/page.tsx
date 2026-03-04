import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getHomeEventHistory } from "@/app/actions/event-requests"
import { MyEventsClient } from "./MyEventsClient"

export default async function HomeMyEventsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const result = await getHomeEventHistory()

  if (result.error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600">{result.error}</p>
      </div>
    )
  }

  const events = result.data || []

  // Stats
  const now = new Date()
  const upcoming = events.filter((e: any) => new Date(e.startDateTime) > now).length
  const completed = events.filter((e: any) => new Date(e.endDateTime) < now).length

  const tabs = [
    { id: 'all', label: 'All Events', count: events.length },
    { id: 'UPCOMING', label: 'Upcoming', count: upcoming },
    { id: 'PAST', label: 'Past', count: completed },
  ]

  return (
    <MyEventsClient 
      events={events as any} 
      tabs={tabs} 
      initialTab="all"
    />
  )
}
