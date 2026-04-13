import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getMyConfirmedEvents } from "@/app/actions/staff-attendance"
import { StaffScheduleView } from "@/components/staff/StaffScheduleView"

export const revalidate = 30

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
    <StaffScheduleView events={result.data || []} />
  )
}
