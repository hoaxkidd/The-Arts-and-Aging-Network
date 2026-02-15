'use client'

import { useState } from 'react'
import { STYLES } from "@/lib/styles"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { Clock, CheckCircle, XCircle, AlertCircle, Trash2, Loader2 } from "lucide-react"
import { deleteTimesheet } from "@/app/actions/timesheet"
import { useRouter } from "next/navigation"

type Timesheet = {
  id: string
  weekStart: Date
  status: string
  totalHours: number
  submittedAt: Date | null
  user: {
    id: string
    name: string | null
    preferredName: string | null
    image: string | null
  }
}

export function TimesheetList({ timesheets }: { timesheets: Timesheet[] }) {
  const router = useRouter()
  const [filter, setFilter] = useState<'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'DRAFT'>('SUBMITTED')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const filtered = timesheets.filter(t => t.status === filter)

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.preventDefault() // Prevent navigation
    if (!confirm('Are you sure you want to delete this draft timesheet?')) return

    setDeletingId(id)
    const result = await deleteTimesheet(id)
    
    if (result.error) {
      alert(result.error)
    } else {
      router.refresh()
    }
    setDeletingId(null)
  }

  // Stats for tabs
  const counts = {
    SUBMITTED: timesheets.filter(t => t.status === 'SUBMITTED').length,
    APPROVED: timesheets.filter(t => t.status === 'APPROVED').length,
    REJECTED: timesheets.filter(t => t.status === 'REJECTED').length,
    DRAFT: timesheets.filter(t => t.status === 'DRAFT').length
  }

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-1 overflow-x-auto">
        {(['SUBMITTED', 'APPROVED', 'REJECTED', 'DRAFT'] as const).map((status) => (
            <button
                key={status}
                onClick={() => setFilter(status)}
                className={cn(
                    "px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2",
                    filter === status 
                        ? "border-primary-500 text-primary-700 bg-primary-50/50" 
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                )}
            >
                <div className="flex items-center gap-2">
                    {status === 'SUBMITTED' && <AlertCircle className="w-4 h-4" />}
                    {status === 'APPROVED' && <CheckCircle className="w-4 h-4" />}
                    {status === 'REJECTED' && <XCircle className="w-4 h-4" />}
                    {status === 'DRAFT' && <Clock className="w-4 h-4" />}
                    
                    <span className="capitalize">
                        {status === 'SUBMITTED' ? 'Pending' : status.toLowerCase()}
                    </span>
                    
                    {counts[status] > 0 && (
                        <span className={cn(
                            "px-1.5 py-0.5 rounded-full text-xs",
                            filter === status ? "bg-white text-primary-700 shadow-sm" : "bg-gray-200 text-gray-600"
                        )}>
                            {counts[status]}
                        </span>
                    )}
                </div>
            </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((ts) => {
            const displayName = ts.user.preferredName || ts.user.name || 'Unknown'
            const weekEnd = new Date(ts.weekStart)
            weekEnd.setDate(weekEnd.getDate() + 6)

            return (
                <Link 
                    key={ts.id} 
                    href={`/admin/timesheets/${ts.id}`}
                    className={cn(STYLES.card, "relative p-5 transition-colors group border-l-4",
                        ts.status === 'SUBMITTED' ? "border-l-yellow-400" :
                        ts.status === 'APPROVED' ? "border-l-green-400" :
                        ts.status === 'REJECTED' ? "border-l-red-400" :
                        "border-l-gray-300"
                    )}
                >
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                                {ts.user.image ? (
                                    <img src={ts.user.image} alt={displayName} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-gray-500 font-bold">{displayName.charAt(0)}</span>
                                )}
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                                    {displayName}
                                </h3>
                                <p className="text-xs text-gray-500">
                                    Submitted {ts.submittedAt ? new Date(ts.submittedAt).toLocaleDateString() : 'Not submitted'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        <div>
                            <p className="text-xs text-gray-500 uppercase font-semibold">Week Of</p>
                            <p className="text-sm font-medium text-gray-900">
                                {new Date(ts.weekStart).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - {weekEnd.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-gray-500 uppercase font-semibold">Total Hours</p>
                            <p className="text-xl font-bold text-gray-900">{(ts.totalHours || 0).toFixed(1)}</p>
                        </div>
                    </div>

                    {ts.status === 'DRAFT' && (
                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={(e) => handleDelete(e, ts.id)}
                                disabled={deletingId === ts.id}
                                className="p-2 bg-white text-red-600 rounded-full shadow-sm border border-gray-200 hover:bg-red-50 transition-colors"
                                title="Delete Draft"
                            >
                                {deletingId === ts.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Trash2 className="w-4 h-4" />
                                )}
                            </button>
                        </div>
                    )}
                </Link>
            )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="p-12 text-center text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
            <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p>No {filter.toLowerCase()} timesheets found.</p>
        </div>
      )}
    </div>
  )
}
