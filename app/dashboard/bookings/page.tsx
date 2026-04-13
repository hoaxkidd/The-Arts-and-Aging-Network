import { redirect } from "next/navigation"

export default function DashboardBookingsRedirectPage() {
  redirect('/dashboard/my-bookings?view=calendar')
}
