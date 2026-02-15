import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getAllEventRequests } from "@/app/actions/event-requests"
import { AdminRequestList } from "@/components/event-requests/AdminRequestList"
import { ClipboardList, Clock, CheckCircle, XCircle } from "lucide-react"

export default async function AdminEventRequestsPage() {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') redirect('/login')

  const result = await getAllEventRequests()

  if (result.error) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-red-600">{result.error}</p>
      </div>
    )
  }

  const requests = result.data || []

  // Stats
  const pending = requests.filter((r: any) => r.status === 'PENDING').length
  const approved = requests.filter((r: any) => r.status === 'APPROVED').length
  const rejected = requests.filter((r: any) => r.status === 'REJECTED').length

  return (
    <div className="h-full flex flex-col">
      {/* Compact Header */}
      <header className="flex-shrink-0 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center">
            <ClipboardList className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Event Requests</h1>
            <p className="text-xs text-gray-500">Review requests from geriatric homes</p>
          </div>
        </div>
      </header>

      {/* Compact Stats */}
      <div className="flex-shrink-0 grid grid-cols-4 gap-2 pb-3">
        <div className="bg-white rounded-lg border border-gray-200 p-2.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gray-100 rounded-md flex items-center justify-center">
              <ClipboardList className="w-3.5 h-3.5 text-gray-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">{requests.length}</p>
              <p className="text-[10px] text-gray-500">Total</p>
            </div>
          </div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-yellow-100 rounded-md flex items-center justify-center">
              <Clock className="w-3.5 h-3.5 text-yellow-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-yellow-700">{pending}</p>
              <p className="text-[10px] text-yellow-600">Pending</p>
            </div>
          </div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-2.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-green-100 rounded-md flex items-center justify-center">
              <CheckCircle className="w-3.5 h-3.5 text-green-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-green-700">{approved}</p>
              <p className="text-[10px] text-green-600">Approved</p>
            </div>
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-2.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-red-100 rounded-md flex items-center justify-center">
              <XCircle className="w-3.5 h-3.5 text-red-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-red-700">{rejected}</p>
              <p className="text-[10px] text-red-600">Declined</p>
            </div>
          </div>
        </div>
      </div>

      {/* Request List */}
      <div className="flex-1 min-h-0 overflow-auto">
        <AdminRequestList requests={requests as any} />
      </div>
    </div>
  )
}
