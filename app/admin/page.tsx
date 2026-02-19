import { auth } from "@/auth"
import { Users, Mail, Activity, ShieldCheck, LayoutDashboard, ArrowUpRight } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { cn } from "@/lib/utils"
import Link from "next/link"

export default async function AdminDashboard() {
  const session = await auth()

  const userCount = await prisma.user.count()
  const inviteCount = await prisma.invitation.count({ where: { status: 'PENDING' } })
  const logCount = await prisma.auditLog.count()

  const recentLogs = await prisma.auditLog.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: { user: true }
  })

  function formatAction(action: string) {
    return action.split('_').map(word => word.charAt(0) + word.slice(1).toLowerCase()).join(' ')
  }

  function getTimeAgo(date: Date) {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)
    if (seconds < 60) return 'Just now'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="h-full flex flex-col">
      {/* Compact Header */}
      <header className="flex-shrink-0 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center">
            <LayoutDashboard className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-xs text-gray-500">Welcome back, {session?.user?.name}</p>
          </div>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-auto space-y-4">
        {/* Compact Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="bg-white rounded-lg border border-gray-200 p-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                <Users className="w-4 h-4 text-primary-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{userCount}</p>
                <p className="text-[10px] text-gray-500">Users</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                <Mail className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{inviteCount}</p>
                <p className="text-[10px] text-gray-500">Pending Invites</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Activity className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{logCount}</p>
                <p className="text-[10px] text-gray-500">Log Entries</p>
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

          {/* Quick Actions */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-900">Quick Actions</h3>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3">
              <Link
                href="/admin/invitations"
                className="group flex flex-col items-center p-4 bg-gradient-to-br from-primary-50 to-primary-100 rounded-lg border border-primary-200 hover:border-primary-400 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <Mail className="w-5 h-5 text-primary-500" />
                </div>
                <span className="text-xs font-semibold text-gray-900">Invite User</span>
              </Link>
              <Link
                href="/admin/users"
                className="group flex flex-col items-center p-4 bg-gradient-to-br from-accent-50 to-accent-100 rounded-lg border border-accent-200 hover:border-accent-400 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <Users className="w-5 h-5 text-accent-500" />
                </div>
                <span className="text-xs font-semibold text-gray-900">Manage Users</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
