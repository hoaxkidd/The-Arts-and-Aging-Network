'use client'

import { usePathname } from 'next/navigation'
import Link from "next/link"
import { LogOut, Menu, ChevronRight } from "lucide-react"
import { MENU_ITEMS, adminMenu, homeAdminMenu, staffMenu } from "@/lib/menu"
import { NotificationBell } from "@/components/notifications/NotificationBell"
import { cn } from "@/lib/utils"
import { logout } from "@/app/actions/auth"

// Define title map
const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Home Dashboard',
  '/dashboard/profile': 'Organization Profile',
  '/dashboard/engagement': 'Engagement & Feedback',
  '/admin': 'Admin Dashboard',
  '/admin/users': 'User Management',
  '/admin/homes': 'Facility Management',
  '/admin/financials': 'Financial Overview',
  '/admin/events': 'Event Management',
  '/admin/event-requests': 'Event Requests',
  '/admin/email-reminders': 'Email Reminders',
  '/admin/form-templates': 'Form Templates',
  '/admin/testimonials': 'Testimonials',
  '/admin/inventory': 'Inventory Management',
  '/admin/donors': 'Donor Management',
  '/admin/messaging': 'Group Messaging',
  '/admin/messaging/requests': 'Access Requests',
  '/admin/mileage': 'Mileage Review',
  '/admin/timesheets': 'Timesheet Review',
  '/admin/invitations': 'User Invitations',
  '/admin/profile': 'My Profile',
  '/admin/requests': 'Payroll Requests',
  '/admin/settings': 'System Settings',
  '/payroll': 'Staff Dashboard',
  '/payroll/check-in': 'Daily Check-in',
  '/payroll/profile': 'My Profile',
  '/payroll/schedule': 'My Schedule',
  '/payroll/expenses': 'Expenses & Mileage',
  '/payroll/mileage': 'Mileage Entry',
  '/payroll/timesheet': 'Weekly Timesheet',
  '/payroll/history': 'Work History',
  '/payroll/requests': 'My Requests',
  '/dashboard/calendar': 'Event Calendar',
  '/dashboard/contacts': 'Contact Information',
  '/dashboard/events': 'Upcoming Events',
  '/dashboard/history': 'Event History',
  '/dashboard/my-events': 'My Events',
  '/dashboard/requests': 'My Event Requests',
  '/dashboard/settings': 'System Settings',
  '/staff': 'Staff Dashboard',
  '/staff/directory': 'Staff Directory',
  '/staff/events': 'Browse Events',
  '/staff/inbox': 'Inbox',
  '/staff/forms': 'Form Templates',
  '/staff/groups': 'Groups',
  '/staff/my-events': 'My Schedule',
  '/staff/profile': 'My Profile',
  '/staff/settings': 'Settings',
  '/notifications': 'Notifications',
}

// Client-side helper for title
function getPageTitle(pathname: string) {
    if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname]
    // Fallback logic for dynamic routes if needed
    if (pathname.startsWith('/admin/homes/')) return 'Facility Details'
    if (pathname.startsWith('/admin/users/')) return 'User Details'
    if (pathname.startsWith('/admin/timesheets/')) return 'Timesheet Review'
    if (pathname.startsWith('/admin/messaging/')) return 'Group Messaging'
    if (pathname.startsWith('/staff/directory/')) return 'Staff Profile'
    if (pathname.startsWith('/staff/events/')) return 'Event Details'
    if (pathname.startsWith('/staff/forms/')) return 'Form Template'
    if (pathname.startsWith('/staff/groups/')) return 'Messages'
    if (pathname.startsWith('/staff/inbox/') && pathname.split('/').length > 3) return 'Conversation'
    return 'Dashboard'
}

type DashboardLayoutProps = {
  children: React.ReactNode
  role: string
  title?: string // App Title (Arts & Aging)
  notifications: any[]
  unreadCount: number
  userSession: any // Passed from server
}

export function DashboardLayoutClient({ children, role, title = "Arts & Aging", notifications, unreadCount, userSession }: DashboardLayoutProps) {
  const pathname = usePathname()
  const currentTitle = getPageTitle(pathname)

  const menuItems = role === 'ADMIN' ? adminMenu
    : role === 'HOME_ADMIN' ? homeAdminMenu
    : (role === 'FACILITATOR' || role === 'CONTRACTOR') ? staffMenu
    : MENU_ITEMS[role] || []

  const portalConfig = {
    ADMIN: { label: 'Admin Portal', bg: 'bg-secondary-400', text: 'text-primary-900' },
    HOME_ADMIN: { label: 'Home Portal', bg: 'bg-accent-400', text: 'text-primary-900' },
    FACILITATOR: { label: 'Staff Portal', bg: 'bg-accent-300', text: 'text-primary-900' },
    CONTRACTOR: { label: 'Staff Portal', bg: 'bg-accent-300', text: 'text-primary-900' },
    VOLUNTEER: { label: 'Staff Portal', bg: 'bg-accent-300', text: 'text-primary-900' },
    BOARD: { label: 'Board Portal', bg: 'bg-purple-400', text: 'text-purple-900' },
    PARTNER: { label: 'Partner Portal', bg: 'bg-blue-400', text: 'text-blue-900' },
    PAYROLL: { label: 'Payroll Portal', bg: 'bg-green-400', text: 'text-green-900' }
  }

  const portal = portalConfig[role as keyof typeof portalConfig] || { label: 'Portal', bg: 'bg-gray-400', text: 'text-gray-900' }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col bg-primary-800 text-white shadow-xl">
        {/* Logo / Brand */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-secondary-400 flex items-center justify-center">
              <span className="text-primary-900 font-bold text-lg">&amp;</span>
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white">{title}</h1>
              <span className={cn(
                "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide mt-1",
                portal.bg, portal.text
              )}>
                {portal.label}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href + item.label}
                href={item.href}
                className={cn(
                    "group flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                    isActive ? "bg-white/10 text-white shadow-inner" : "hover:bg-white/5 text-primary-100"
                )}
              >
                <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                    isActive ? "bg-secondary-400 text-primary-900" : "bg-white/10 group-hover:bg-secondary-400/80 group-hover:text-primary-900"
                )}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="flex-1 font-medium">{item.label}</span>
                {isActive && <ChevronRight className="w-4 h-4 text-secondary-400" />}
              </Link>
            )
          })}
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-3 py-2 mb-3">
            <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-semibold">
              {userSession?.name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{userSession?.name || 'User'}</p>
              <p className="text-xs text-primary-300 truncate">{userSession?.email}</p>
            </div>
          </div>
          <button
            onClick={() => logout()}
            className="flex items-center gap-3 w-full px-4 py-2.5 text-primary-200 hover:bg-red-500/20 hover:text-red-300 rounded-lg transition-colors text-sm"
          >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header Bar */}
        <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-3 flex justify-between items-center shadow-sm">
          {/* Mobile menu button */}
          <button className="md:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
            <Menu className="w-5 h-5" />
          </button>

          {/* Breadcrumb / Title */}
          <div className="hidden md:flex items-center gap-2">
            <span className="text-lg font-semibold text-gray-800">{currentTitle}</span>
          </div>

          {/* Right side - Notifications */}
          <div className="flex items-center gap-3">
            <NotificationBell
              initialNotifications={notifications}
              initialUnreadCount={unreadCount}
              userRole={role}
            />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50/50">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
