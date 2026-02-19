import { redirect } from "next/navigation"

export default function AdminEventRequestsPage() {
  redirect("/admin/events?tab=requests")
}
