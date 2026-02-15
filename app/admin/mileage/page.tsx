import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { MapPin, CheckCircle, XCircle, AlertCircle, Car } from "lucide-react"
import { cn } from "@/lib/utils"
import { STYLES } from "@/lib/styles"
import { MileageApprovalActions } from "./MileageApprovalActions"

export default async function AdminMileagePage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  // Verify admin
  const user = await prisma.user.findUnique({
    where: { id: session.user.id }
  })
  if (user?.role !== 'ADMIN') redirect('/dashboard')

  const entries = await prisma.mileageEntry.findMany({
    include: {
      user: {
        select: { id: true, name: true, preferredName: true, image: true }
      }
    },
    orderBy: [
      { status: 'asc' }, // PENDING first
      { date: 'desc' }
    ]
  })

  // Group by status
  const pending = entries.filter(e => e.status === 'PENDING')
  const approved = entries.filter(e => e.status === 'APPROVED')
  const rejected = entries.filter(e => e.status === 'REJECTED')

  // Calculate totals
  const pendingKm = pending.reduce((sum, e) => sum + e.kilometers, 0)
  const approvedKm = approved.reduce((sum, e) => sum + e.kilometers, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mileage Review</h1>
          <p className="text-gray-500 text-sm">Review and approve staff mileage claims</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">
            <AlertCircle className="w-4 h-4" />
            {pending.length} Pending ({pendingKm.toFixed(1)} km)
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className={cn(STYLES.card, "p-4")}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{pending.length}</p>
              <p className="text-sm text-gray-500">Pending Review</p>
            </div>
          </div>
        </div>

        <div className={cn(STYLES.card, "p-4")}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{approvedKm.toFixed(1)}</p>
              <p className="text-sm text-gray-500">km Approved (This Month)</p>
            </div>
          </div>
        </div>

        <div className={cn(STYLES.card, "p-4")}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Car className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{entries.length}</p>
              <p className="text-sm text-gray-500">Total Entries</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Entries */}
      {pending.length > 0 && (
        <div className={cn(STYLES.card, "p-0 overflow-hidden border-yellow-200")}>
          <div className="px-6 py-3 bg-yellow-50 border-b border-yellow-200">
            <h2 className="font-semibold text-yellow-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Pending Approval ({pending.length})
            </h2>
          </div>

          <div className="divide-y divide-gray-100">
            {pending.map(entry => {
              const displayName = entry.user.preferredName || entry.user.name || 'Unknown'

              return (
                <div key={entry.id} className="px-6 py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        {entry.user.image ? (
                          <img
                            src={entry.user.image}
                            alt={displayName}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold">
                            {displayName.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{displayName}</span>
                          <span className="text-gray-400">•</span>
                          <span className="text-sm text-gray-500">
                            {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {entry.startLocation} → {entry.endLocation}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="font-semibold text-gray-900">{entry.kilometers} km</span>
                          {entry.fundingClass && (
                            <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded">
                              {entry.fundingClass}
                            </span>
                          )}
                          {entry.purpose && (
                            <span className="text-sm text-gray-500">{entry.purpose}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <MileageApprovalActions entryId={entry.id} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Recently Approved */}
      {approved.length > 0 && (
        <div className={cn(STYLES.card, "p-0 overflow-hidden")}>
          <div className="px-6 py-3 bg-green-50 border-b border-green-200">
            <h2 className="font-semibold text-green-800 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Recently Approved ({approved.length})
            </h2>
          </div>

          <div className="divide-y divide-gray-100">
            {approved.slice(0, 10).map(entry => {
              const displayName = entry.user.preferredName || entry.user.name || 'Unknown'

              return (
                <div key={entry.id} className="px-6 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold text-sm">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-900">{displayName}</span>
                      <span className="text-gray-400 mx-2">•</span>
                      <span className="text-sm text-gray-500">
                        {entry.startLocation} → {entry.endLocation}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-700">{entry.kilometers} km</span>
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
                      Approved
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {entries.length === 0 && (
        <div className={cn(STYLES.card, "text-center py-12")}>
          <Car className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No mileage entries found</p>
          <p className="text-sm text-gray-400 mt-1">Entries will appear here when staff submit them</p>
        </div>
      )}
    </div>
  )
}
