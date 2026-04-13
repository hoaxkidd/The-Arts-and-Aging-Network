import { redirect } from "next/navigation"

export default function HistoryRedirectPage() {
  redirect('/dashboard/my-bookings?section=past&tab=PAST')
}
