import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getMyConfirmedEvents } from "@/app/actions/staff-attendance"
import { StaffScheduleView } from "@/components/staff/StaffScheduleView"

export default async function StaffMyEventsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const result = await getMyConfirmedEvents()

  if (result.error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600">{result.error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Schedule</h1>
        <p className="text-gray-600 mt-1">
          View and manage your confirmed event attendance.
        </p>
      </div>

      <StaffScheduleView events={result.data || []} />
    </div>
  )
}
