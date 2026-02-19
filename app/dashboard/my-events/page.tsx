import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getHomeEventHistory } from "@/app/actions/event-requests"
import { HomeEventHistory } from "@/components/dashboard/HomeEventHistory"
import { CheckCircle, Calendar } from "lucide-react"

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

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="flex-shrink-0 pb-3">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">
            <CheckCircle className="w-4 h-4" />
          </div>
          My Events
        </h1>
        <p className="text-sm text-gray-500 mt-1 ml-10">
          View all events your facility has participated in or is scheduled for.
        </p>
      </header>

      {/* Compact Stats */}
      <div className="flex-shrink-0 grid grid-cols-2 sm:grid-cols-3 gap-3 pb-3">
        <div className="bg-white rounded-lg border border-gray-200 p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
            <Calendar className="w-4 h-4 text-gray-600" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">{events.length}</p>
            <p className="text-xs text-gray-500">Total</p>
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
            <Calendar className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <p className="text-lg font-bold text-blue-700">{upcoming}</p>
            <p className="text-xs text-blue-600">Upcoming</p>
          </div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
            <CheckCircle className="w-4 h-4 text-green-600" />
          </div>
          <div>
            <p className="text-lg font-bold text-green-700">{completed}</p>
            <p className="text-xs text-green-600">Completed</p>
          </div>
        </div>
      </div>

      {/* Event List */}
      <div className="flex-1 min-h-0 overflow-auto">
        <HomeEventHistory events={events} />
      </div>
    </div>
  )
}
