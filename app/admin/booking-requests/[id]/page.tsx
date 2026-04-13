import { auth } from "@/auth"
import { redirect, notFound } from "next/navigation"
import { getEventRequestDetail } from "@/app/actions/booking-requests"
import { EventRequestDetail } from "@/components/booking-requests/EventRequestDetail"
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
      <Link href="/admin/booking-requests" className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900">
        <ArrowLeft className="w-4 h-4" /> Back to Booking Requests
      </Link>
      <EventRequestDetail request={request} />
    </div>
  )
}
