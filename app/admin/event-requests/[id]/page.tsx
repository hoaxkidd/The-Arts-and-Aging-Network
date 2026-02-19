import { auth } from "@/auth"
import { redirect, notFound } from "next/navigation"
import { getEventRequestDetail } from "@/app/actions/event-requests"
import { EventRequestDetail } from "@/components/event-requests/EventRequestDetail"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default async function AdminEventRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') redirect('/login')

  const { id } = await params
  const result = await getEventRequestDetail(id)

  if (result.error || !result.data) {
    notFound()
  }

  const request = result.data

  return (
    <div className="space-y-4">
      <div>
        <Link
          href="/admin/events?tab=requests"
          className="text-gray-500 hover:text-gray-700 flex items-center gap-2 mb-3 text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Event Requests
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Event Request Details</h1>
        <p className="text-gray-500 text-sm">
          Review and approve or decline this request
        </p>
      </div>

      <EventRequestDetail request={request} />
    </div>
  )
}
