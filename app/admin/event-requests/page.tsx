import { redirect } from "next/navigation"

// Legacy route - redirects to unified events page with requests tab active
// This route exists for backwards compatibility with any saved links
export default function AdminEventRequestsPage() {
  redirect("/admin/events?tab=requests")
}
