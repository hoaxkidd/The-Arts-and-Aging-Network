import { redirect } from "next/navigation"

export default function CalendarRedirect() {
  redirect("/dashboard/my-bookings?view=calendar")
}
