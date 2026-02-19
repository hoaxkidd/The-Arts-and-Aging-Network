import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import {
  Clock,
  AlertCircle,
  DollarSign,
  Calendar,
  FileText,
  TrendingUp,
  User,
  LayoutDashboard,
  ArrowUpRight
} from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { QuickActionHandler } from "@/components/QuickActionHandler"
import { cn } from "@/lib/utils"

export default async function PayrollDashboard() {
  const session = await auth()
  const userId = session?.user?.id

  if (!userId) redirect("/login")

  let pendingRequests = 0
  let monthlyHours = 0
  let weeklyHours = 0
  let recentActivity: { type: string; date: Date; [key: string]: unknown }[] = []

  try {
    pendingRequests = await prisma.expenseRequest.count({
      where: { userId, status: 'PENDING' }
    })

    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)
    const monthlyEntries = await prisma.timeEntry.findMany({
      where: { userId, date: { gte: startOfMonth } }
    })
    monthlyHours = monthlyEntries.reduce((acc, entry) => acc + entry.hours, 0)

    const startOfWeek = new Date()
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
    startOfWeek.setHours(0, 0, 0, 0)
    const weeklyEntries = await prisma.timeEntry.findMany({
      where: { userId, date: { gte: startOfWeek } }
    })
    weeklyHours = weeklyEntries.reduce((acc, entry) => acc + entry.hours, 0)

    const [recentTimeEntries, recentExpenses] = await Promise.all([
      prisma.timeEntry.findMany({
        where: { userId },
        orderBy: { date: 'desc' },
        take: 3
      }),
      prisma.expenseRequest.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 3
      })
    ])

    recentActivity = [
      ...recentTimeEntries.map(e => ({ type: 'TIME', ...e, date: new Date(e.date) })),
      ...recentExpenses.map(e => ({ type: 'EXPENSE', ...e, date: new Date(e.createdAt) }))
    ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5)
  } catch (err) {
    console.error("[PayrollDashboard] DB error:", err instanceof Error ? err.message : err)
  }

  return (
    <div className="h-full flex flex-col">
      <QuickActionHandler />

      {/* Compact Header */}
      <header className="flex-shrink-0 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center">
            <LayoutDashboard className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Payroll Dashboard</h1>
            <p className="text-xs text-gray-500">Welcome back, {session?.user?.name}</p>
          </div>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-auto space-y-4">
        {/* Compact Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-amber-700">{pendingRequests}</p>
                <p className="text-[10px] text-amber-600">Pending</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                <Clock className="w-4 h-4 text-primary-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{monthlyHours.toFixed(1)}</p>
                <p className="text-[10px] text-gray-500">This Month</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Clock className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{weeklyHours.toFixed(1)}</p>
                <p className="text-[10px] text-gray-500">This Week</p>
              </div>
            </div>
          </div>
        </div>

        {/* Check-in Banner */}
        <div className="relative overflow-hidden rounded-lg bg-gradient-to-r from-primary-500 to-primary-600 p-4 text-white">
          <div className="absolute right-0 top-0 -mt-4 -mr-4 h-20 w-20 rounded-full bg-white/10"></div>
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold">Log Today&apos;s Hours</h2>
                <p className="text-primary-100 text-xs">
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                </p>
              </div>
            </div>
            <Link
              href="/payroll/check-in"
              className="flex items-center gap-1.5 px-4 py-2 bg-secondary-400 text-primary-800 font-semibold rounded-lg hover:bg-secondary-300 transition-colors text-sm"
            >
              Check In <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Quick Actions */}
          <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-900">Quick Actions</h3>
            </div>
            <div className="p-4 grid grid-cols-4 gap-3">
              <Link
                href="/payroll/requests"
                className="group flex flex-col items-center p-3 bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg border border-amber-100 hover:border-amber-300 transition-colors"
              >
                <div className="w-9 h-9 rounded-lg bg-white shadow-sm flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <DollarSign className="w-4 h-4 text-amber-600" />
                </div>
                <span className="text-xs font-semibold text-gray-900 text-center">Expense</span>
              </Link>
              <Link
                href="/payroll/requests"
                className="group flex flex-col items-center p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-100 hover:border-blue-300 transition-colors"
              >
                <div className="w-9 h-9 rounded-lg bg-white shadow-sm flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <Calendar className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-xs font-semibold text-gray-900 text-center">Time Off</span>
              </Link>
              <Link
                href="/payroll/profile"
                className="group flex flex-col items-center p-3 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-100 hover:border-green-300 transition-colors"
              >
                <div className="w-9 h-9 rounded-lg bg-white shadow-sm flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <User className="w-4 h-4 text-green-600" />
                </div>
                <span className="text-xs font-semibold text-gray-900 text-center">Profile</span>
              </Link>
              <div className="group flex flex-col items-center p-3 bg-gradient-to-br from-purple-50 to-violet-50 rounded-lg border border-purple-100 hover:border-purple-300 transition-colors cursor-pointer">
                <div className="w-9 h-9 rounded-lg bg-white shadow-sm flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <FileText className="w-4 h-4 text-purple-600" />
                </div>
                <span className="text-xs font-semibold text-gray-900 text-center">Pay Slips</span>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col">
            <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-gray-400" />
                Recent
              </h3>
            </div>

            <div className="flex-1 divide-y divide-gray-100">
              {recentActivity.length > 0 ? recentActivity.map((item: any) => (
                <div
                  key={`${item.type}-${item.id}`}
                  className="flex items-start gap-2 px-4 py-2.5 hover:bg-gray-50 transition-colors"
                >
                  <div className={cn(
                    "p-1.5 rounded-md flex-shrink-0",
                    item.type === 'TIME' ? 'bg-primary-100 text-primary-600' : 'bg-amber-100 text-amber-600'
                  )}>
                    {item.type === 'TIME' ? <Clock className="w-3.5 h-3.5" /> : <DollarSign className="w-3.5 h-3.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 truncate">
                      {item.type === 'TIME' ? `${item.hours}h logged` :
                       item.category === 'SICK_DAY' ? 'Sick Day' : 'Expense'}
                    </p>
                    <p className="text-[10px] text-gray-500">
                      {new Date(item.date).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={cn(
                    "px-1.5 py-0.5 rounded text-[9px] font-medium",
                    item.status === 'APPROVED' ? "bg-green-100 text-green-700" :
                    item.status === 'REJECTED' ? "bg-red-100 text-red-700" :
                    "bg-yellow-100 text-yellow-700"
                  )}>
                    {item.status}
                  </span>
                </div>
              )) : (
                <div className="p-6 text-center">
                  <TrendingUp className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs text-gray-500">No recent activity</p>
                </div>
              )}
            </div>

            <div className="px-4 py-2 border-t border-gray-100">
              <Link
                href="/payroll/requests"
                className="flex items-center justify-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700"
              >
                View All <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
