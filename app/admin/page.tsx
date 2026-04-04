import { auth } from "@/auth"
import { Users, Mail, Activity, ShieldCheck, LayoutDashboard, ArrowUpRight, Calendar, ClipboardList, Building2, TrendingUp, MailPlus, PlusCircle, BuildingIcon, ClipboardCheck, DollarSign, Plus } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { formatDateShort, getRelativeTime } from "@/lib/date-utils"
import { STYLES } from "@/lib/styles"

export const revalidate = 60

export default async function AdminDashboard() {
  const session = await auth()

  // Calculate date for "this month"
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  // Batch all count queries for performance
  const [userCount, activeEventsCount, pendingRequestsCount, homeCount, monthEventsCount, inviteCount, logCount] = await Promise.all([
    prisma.user.count(),
    prisma.event.count({
      where: { startDateTime: { gte: new Date() }, status: 'PUBLISHED' }
    }),
    prisma.eventRequest.count({
      where: { status: 'PENDING' }
    }),
    prisma.geriatricHome.count(),
    prisma.event.count({
      where: { createdAt: { gte: startOfMonth } }
    }),
    prisma.invitation.count({ where: { status: 'PENDING' } }),
    prisma.auditLog.count()
  ])

  const recentLogs = await prisma.auditLog.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: { user: true }
  })

  function formatAction(action: string) {
    return action.split('_').map(word => word.charAt(0) + word.slice(1).toLowerCase()).join(' ')
  }

  function getTimeAgo(date: Date) {
    return getRelativeTime(date)
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0 overflow-auto space-y-4 pt-4 pb-6">
        {/* Stats Cards - 6 columns */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Stats Card 1: Total Users */}
          <div className={STYLES.statsCard}>
            <div className="flex items-center gap-3">
              <div className={cn(STYLES.statsIcon, "bg-primary-100 text-primary-600")}>
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className={STYLES.statsValue}>{userCount}</p>
                <p className={STYLES.statsLabel}>Users</p>
              </div>
            </div>
          </div>

          {/* Stats Card 2: Active Events */}
          <div className={STYLES.statsCard}>
            <div className="flex items-center gap-3">
              <div className={cn(STYLES.statsIcon, "bg-green-100 text-green-600")}>
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <p className={STYLES.statsValue}>{activeEventsCount}</p>
                <p className={STYLES.statsLabel}>Active Events</p>
              </div>
            </div>
          </div>

          {/* Stats Card 3: Pending Requests */}
          <div className={STYLES.statsCard}>
            <div className="flex items-center gap-3">
              <div className={cn(STYLES.statsIcon, "bg-amber-100 text-amber-600")}>
                <ClipboardList className="w-5 h-5" />
              </div>
              <div>
                <p className={STYLES.statsValue}>{pendingRequestsCount}</p>
                <p className={STYLES.statsLabel}>Pending Requests</p>
              </div>
            </div>
          </div>

          {/* Stats Card 4: Facilities */}
          <div className={STYLES.statsCard}>
            <div className="flex items-center gap-3">
              <div className={cn(STYLES.statsIcon, "bg-blue-100 text-blue-600")}>
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <p className={STYLES.statsValue}>{homeCount}</p>
                <p className={STYLES.statsLabel}>Facilities</p>
              </div>
            </div>
          </div>

          {/* Stats Card 5: This Month Events */}
          <div className={STYLES.statsCard}>
            <div className="flex items-center gap-3">
              <div className={cn(STYLES.statsIcon, "bg-purple-100 text-purple-600")}>
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <p className={STYLES.statsValue}>{monthEventsCount}</p>
                <p className={STYLES.statsLabel}>This Month</p>
              </div>
            </div>
          </div>

          {/* Stats Card 6: Pending Invites */}
          <div className={STYLES.statsCard}>
            <div className="flex items-center gap-3">
              <div className={cn(STYLES.statsIcon, "bg-rose-100 text-rose-600")}>
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <p className={STYLES.statsValue}>{inviteCount}</p>
                <p className={STYLES.statsLabel}>Pending Invites</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Recent Activity */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-gray-400" />
                Recent Activity
              </h3>
              <Link
                href="/admin/audit-log"
                className="text-xs font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1"
              >
                View all <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="divide-y divide-gray-100">
              {recentLogs.length > 0 ? recentLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors"
                >
                  <div className={cn(
                    "w-2 h-2 mt-1.5 rounded-full",
                    log.action.includes('CREATED') ? 'bg-green-500' :
                    log.action.includes('UPDATED') ? 'bg-blue-500' :
                    log.action.includes('DELETED') || log.action.includes('CANCELLED') ? 'bg-red-500' :
                    'bg-gray-400'
                  )}></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {formatAction(log.action)}
                    </p>
                    <p className="text-xs text-gray-500">
                      by {log.user?.name || 'Unknown'} · {getTimeAgo(log.createdAt)}
                    </p>
                  </div>
                </div>
              )) : (
                <div className="p-6 text-center">
                  <Activity className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs text-gray-500">No recent activity</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions - 6 actions */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-900">Quick Actions</h3>
            </div>
            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {/* Action 1: Invite User */}
              <Link
                href="/admin/invitations"
                className="group flex flex-col items-center p-4 bg-gradient-to-br from-primary-50 to-primary-100 rounded-lg border border-primary-200 hover:border-primary-400 transition-all hover:shadow-md"
              >
                <div className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <MailPlus className="w-5 h-5 text-primary-500" />
                </div>
                <span className="text-xs font-semibold text-gray-900">Invite User</span>
              </Link>

              {/* Action 2: Create Event */}
              <Link
                href="/admin/events/new"
                className="group flex flex-col items-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200 hover:border-green-400 transition-all hover:shadow-md"
              >
                <div className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <PlusCircle className="w-5 h-5 text-green-600" />
                </div>
                <span className="text-xs font-semibold text-gray-900">Create Event</span>
              </Link>

              {/* Action 3: Manage Users */}
              <Link
                href="/admin/users"
                className="group flex flex-col items-center p-4 bg-gradient-to-br from-accent-50 to-accent-100 rounded-lg border border-accent-200 hover:border-accent-400 transition-all hover:shadow-md"
              >
                <div className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <Users className="w-5 h-5 text-accent-500" />
                </div>
                <span className="text-xs font-semibold text-gray-900">Manage Users</span>
              </Link>

              {/* Action 4: Add Facility */}
              <Link
                href="/admin/users?tab=homes"
                className="group flex flex-col items-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200 hover:border-blue-400 transition-all hover:shadow-md"
              >
                <div className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <div className="relative">
                    <BuildingIcon className="w-5 h-5 text-blue-600" />
                    <Plus className="w-3 h-3 text-blue-600 absolute -bottom-1 -right-1" />
                  </div>
                </div>
                <span className="text-xs font-semibold text-gray-900">Add Facility</span>
              </Link>

              {/* Action 5: View Requests */}
              <Link
                href="/admin/event-requests"
                className="group flex flex-col items-center p-4 bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg border border-amber-200 hover:border-amber-400 transition-all hover:shadow-md"
              >
                <div className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <ClipboardCheck className="w-5 h-5 text-amber-600" />
                </div>
                <span className="text-xs font-semibold text-gray-900">View Requests</span>
              </Link>

              {/* Action 6: Financials */}
              <Link
                href="/admin/financials"
                className="group flex flex-col items-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200 hover:border-purple-400 transition-all hover:shadow-md"
              >
                <div className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <DollarSign className="w-5 h-5 text-purple-600" />
                </div>
                <span className="text-xs font-semibold text-gray-900">Financials</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
