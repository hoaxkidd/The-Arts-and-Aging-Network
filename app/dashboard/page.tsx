import Link from "next/link"
import { CalendarDays, ClipboardList, Clock } from "lucide-react"
import { getEventSignupForms } from "@/app/actions/form-templates"
import { getHomeEventRequests, getHomeEventHistory } from "@/app/actions/booking-requests"
import { DashboardProgramBrowser } from "@/components/dashboard/DashboardProgramBrowser"

export default async function ProgramCoordinatorDashboard() {
  const [formsResult, requestsResult, historyResult] = await Promise.all([
    getEventSignupForms(),
    getHomeEventRequests(),
    getHomeEventHistory(),
  ])

  const forms = formsResult.success && formsResult.data ? formsResult.data : []
  const requests = requestsResult.data || []
  const events = historyResult.data || []

  const pendingRequests = requests.filter((request: any) => request.status === "PENDING").length
  const now = new Date()
  const upcomingBookings = events.filter((event: any) => new Date(event.startDateTime) > now).length

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link href="/dashboard/my-bookings?section=requests" className="bg-white border border-gray-200 rounded-xl p-4 hover:border-primary-300">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <ClipboardList className="w-4 h-4" />
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-900">{pendingRequests}</p>
              <p className="text-xs text-gray-500">Pending Requests</p>
            </div>
          </div>
        </Link>

        <Link href="/dashboard/my-bookings?section=upcoming" className="bg-white border border-gray-200 rounded-xl p-4 hover:border-primary-300">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-green-100 text-green-700 flex items-center justify-center">
              <CalendarDays className="w-4 h-4" />
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-900">{upcomingBookings}</p>
              <p className="text-xs text-gray-500">Upcoming Bookings</p>
            </div>
          </div>
        </Link>
      </section>

      <DashboardProgramBrowser forms={forms as any} />

      <Link href="/dashboard/my-bookings?view=calendar" className="inline-flex items-center gap-2 text-sm font-medium text-primary-700 hover:text-primary-800">
        <Clock className="w-4 h-4" />
        Open My Bookings (Calendar or List)
      </Link>
    </div>
  )
}
