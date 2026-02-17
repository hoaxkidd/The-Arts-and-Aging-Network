import { auth } from "@/auth"
import { redirect, notFound } from "next/navigation"
import { getEventRequestDetail } from "@/app/actions/event-requests"
import { AdminRequestList } from "@/components/event-requests/AdminRequestList"
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

  const request = result.data as any

  return (
    <div className="h-full flex flex-col">
      <header className="flex-shrink-0 pb-4">
        <Link
          href="/admin/event-requests"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Event Requests
        </Link>
        <h1 className="text-lg font-bold text-gray-900">Event Request Details</h1>
        <p className="text-xs text-gray-500">
          Review and approve or decline this request
        </p>
      </header>

      <div className="flex-1 min-h-0 overflow-auto">
        <AdminRequestList requests={[request]} />
      </div>
    </div>
  )
}
