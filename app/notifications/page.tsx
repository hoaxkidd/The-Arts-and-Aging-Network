import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NotificationList } from "@/components/notifications/NotificationList"
import { NotificationPreferences } from "@/components/notifications/NotificationPreferences"
import { getNotificationPreferences } from "@/app/actions/user"
import { Bell, Sparkles, Info, Settings } from "lucide-react"
import { STYLES } from "@/lib/styles"
import { cn } from "@/lib/utils"
import Link from "next/link"

export default async function NotificationsPage() {
  const session = await auth()
  if (!session?.user?.id) return <div>Unauthorized</div>

  // Fetch initial data
  const [notifications, preferences] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50
    }),
    getNotificationPreferences()
  ])

  const safePreferences = preferences || { email: true, sms: false, inApp: true }
  const unreadCount = notifications.filter(n => !n.read).length

  // Get settings path based on role
  const role = session.user.role
  const settingsPath = role === 'ADMIN' ? '/admin/settings' :
    role === 'PAYROLL' ? '/payroll/settings' :
    role === 'HOME_ADMIN' ? '/dashboard/settings' :
    '/staff/settings'

  return (
    <div className="h-full flex flex-col">
      {/* Fixed Page Header */}
      <div className="flex-shrink-0 pb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className={cn(STYLES.pageIcon, "bg-primary-100 text-primary-500")}>
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h1 className={STYLES.pageTitle}>Notification Center</h1>
              <p className={STYLES.pageDescription}>
                Manage your alerts and communication preferences
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 bg-primary-50 rounded-lg border border-primary-100">
                <Sparkles className="w-4 h-4 text-primary-500" />
                <span className="text-sm font-medium text-primary-700">
                  {unreadCount} unread
                </span>
              </div>
            )}
            <Link
              href={settingsPath}
              className={cn(STYLES.btn, STYLES.btnSecondary)}
            >
              <Settings className="w-4 h-4" />
              Settings
            </Link>
          </div>
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Feed */}
        <div className="lg:col-span-2 flex flex-col min-h-0">
          <div className={cn(STYLES.card, "flex-1 flex flex-col overflow-hidden")}>
            <div className="flex-1 overflow-y-auto">
              <NotificationList initialNotifications={notifications} />
            </div>
          </div>
        </div>

        {/* Sidebar / Settings */}
        <div className="space-y-6">
          <NotificationPreferences initialPreferences={safePreferences} />

          {/* Helper Card */}
          <div className="bg-gradient-to-br from-primary-50 to-accent-50 rounded-lg p-5 border border-primary-100">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
                <Info className="w-4 h-4 text-primary-500" />
              </div>
              <div>
                <h4 className="font-semibold text-primary-900 text-sm">Pro Tip</h4>
                <p className="text-sm text-primary-700 leading-relaxed mt-1">
                  Use &quot;Mark all read&quot; to quickly clear your feed.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
