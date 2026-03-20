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
      <EventRequestDetail request={request} />
    </div>
  )
}
