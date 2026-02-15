import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { getHomeEventRequests } from "@/app/actions/event-requests"
import { RequestList } from "@/components/event-requests/RequestList"
import { Plus, ClipboardList, Clock, CheckCircle, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { STYLES } from "@/lib/styles"

export default async function HomeRequestsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const result = await getHomeEventRequests()

  if (result.error) {
    return (
      <div className="p-8 text-center">
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center">
              <ClipboardList className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">My Event Requests</h1>
              <p className="text-xs text-gray-500">Track your event participation requests</p>
            </div>
          </div>
          <Link
            href="/dashboard/requests/new"
            className={cn(STYLES.btn, STYLES.btnPrimary, "py-2 text-sm")}
          >
            <Plus className="w-4 h-4" />
            New Request
          </Link>
        </div>
      </header>

      {/* Compact Stats */}
      <div className="flex-shrink-0 grid grid-cols-3 gap-2 pb-3">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2.5 flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-yellow-100 flex items-center justify-center">
            <Clock className="w-3.5 h-3.5 text-yellow-600" />
          </div>
          <div>
            <p className="text-lg font-bold text-yellow-700">{pending}</p>
            <p className="text-[10px] text-yellow-600">Pending</p>
          </div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-2.5 flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-green-100 flex items-center justify-center">
            <CheckCircle className="w-3.5 h-3.5 text-green-600" />
          </div>
          <div>
            <p className="text-lg font-bold text-green-700">{approved}</p>
            <p className="text-[10px] text-green-600">Approved</p>
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center">
            <XCircle className="w-3.5 h-3.5 text-red-600" />
          </div>
          <div>
            <p className="text-lg font-bold text-red-700">{rejected}</p>
            <p className="text-[10px] text-red-600">Declined</p>
          </div>
        </div>
      </div>

      {/* Request List */}
      <div className="flex-1 min-h-0 overflow-auto">
        <RequestList requests={requests as any} userRole="HOME_ADMIN" />
      </div>
    </div>
  )
}
