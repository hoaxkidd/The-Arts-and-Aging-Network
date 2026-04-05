'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from "next/link"
import Image from "next/image"
import { LogOut, Menu, ChevronRight, X, Calendar, Users, Home, DollarSign, FileText, Settings, MessageSquare, Mail, Clock, Car, Quote, Upload, UserCircle, CheckCircle, LayoutDashboard, ClipboardList, Package, Heart, Bell, Plus, Building2, FileSearch, Inbox, Edit } from "lucide-react"
import { MENU_ITEMS, adminMenu, homeAdminMenu } from "@/lib/menu"
import { NotificationBell } from "@/components/notifications/NotificationBell"
import { cn } from "@/lib/utils"
import { logout } from "@/app/actions/auth"
import { getRoleHomePath, normalizeStaffNamespace } from "@/lib/role-routes"
import { ROLE_LABELS } from '@/lib/roles'

// Define title map
const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Home Dashboard',
  '/dashboard/profile': 'Organization Profile',
  '/dashboard/engagement': 'Engagement & Feedback',
  '/dashboard/calendar': 'Events',
  '/dashboard/contacts': 'Contact Information',
  '/dashboard/events': 'Events',
  '/dashboard/history': 'Event History',
  '/dashboard/my-events': 'My Events',
  '/dashboard/requests': 'My Event Requests',
  '/dashboard/requests/new': 'New Event Request',
  '/dashboard/settings': 'Settings',
  '/dashboard/forms': 'Forms',
  '/admin': 'Admin Dashboard',
  '/admin/audit-log': 'Audit Log',
  '/admin/users': 'User Management',
  '/admin/users/new': 'Add User',
  '/admin/homes': 'Facility Management',
  '/admin/financials': 'Financial Overview',
  '/admin/events': 'Event Management',
  '/admin/events/new': 'Create Event',
  '/admin/email-reminders': 'Email Reminders',
  '/admin/form-templates': 'Form Templates',
  '/admin/form-submissions': 'Form Submissions',
  '/admin/testimonials': 'Testimonials',
  '/admin/inventory': 'Inventory',
  '/admin/communication': 'Communication Hub',
  '/admin/donors': 'Donor Management',
  '/admin/messaging': 'Group Messaging',
  '/admin/messaging/requests': 'Access Requests',
  '/admin/messaging/new': 'Create Message Group',
  '/admin/mileage': 'Mileage Review',
  '/admin/timesheets': 'Timesheet Review',
  '/admin/invitations': 'User Invitations',
  '/admin/profile': 'My Profile',
  '/admin/requests': 'Payroll Requests',
  '/admin/settings': 'Settings',
  '/admin/event-requests': 'Event Requests',
  '/admin/import': 'Import Data',
  '/admin/conversation-requests': 'Conversation Requests',
  '/admin/payroll-forms': 'Payroll Forms',
  '/admin/broadcasts': 'Broadcast Messages',
  '/payroll': 'Payroll Dashboard',
  '/payroll/check-in': 'Daily Check-in',
  '/payroll/profile': 'My Profile',
  '/payroll/schedule': 'My Schedule',
  '/payroll/expenses': 'Expenses',
  '/payroll/mileage': 'Mileage Entry',
  '/payroll/timesheet': 'Weekly Timesheet',
  '/payroll/history': 'Work History',
  '/payroll/requests': 'My Requests',
  '/payroll/forms': 'Forms',
  '/payroll/settings': 'Settings',
  '/staff': 'Staff Dashboard',
  '/staff/directory': 'Team Directory',
  '/staff/events': 'Browse Events',
  '/staff/inbox': 'Inbox',
  '/staff/forms': 'Form Templates',
  '/staff/groups': 'Groups',
  '/staff/my-events': 'My Schedule',
  '/staff/profile': 'My Profile',
  '/staff/settings': 'Settings',
  '/staff/onboarding': 'Complete Profile',
  '/volunteers': 'Volunteer Dashboard',
  '/volunteers/my-events': 'My Schedule',
  '/volunteers/inbox': 'Inbox',
  '/volunteers/forms': 'Forms',
  '/volunteers/onboarding': 'Complete Profile',
  '/volunteers/profile': 'My Profile',
  '/volunteers/settings': 'Settings',
  '/events': 'Events Calendar',
  '/notifications': 'Notifications',
}

// Icon map for each page
const PAGE_ICONS: Record<string, typeof Calendar> = {
  '/dashboard': Building2,
  '/dashboard/profile': UserCircle,
  '/dashboard/engagement': MessageSquare,
  '/dashboard/calendar': Calendar,
  '/dashboard/contacts': Users,
  '/dashboard/events': Calendar,
  '/dashboard/history': Clock,
  '/dashboard/my-events': CheckCircle,
  '/dashboard/requests': ClipboardList,
  '/dashboard/requests/new': ClipboardList,
  '/dashboard/settings': Settings,
  '/dashboard/forms': FileText,
  '/admin': LayoutDashboard,
  '/admin/audit-log': FileSearch,
  '/admin/users': Users,
  '/admin/users/new': Users,
  '/admin/homes': Home,
  '/admin/financials': DollarSign,
  '/admin/events': Calendar,
  '/admin/events/new': Calendar,
  '/admin/email-reminders': Mail,
  '/admin/form-templates': FileText,
  '/admin/form-submissions': FileText,
  '/admin/testimonials': Quote,
  '/admin/inventory': Package,
  '/admin/communication': MessageSquare,
  '/admin/donors': Heart,
  '/admin/messaging': MessageSquare,
  '/admin/messaging/requests': MessageSquare,
  '/admin/messaging/new': MessageSquare,
  '/admin/mileage': Car,
  '/admin/timesheets': Clock,
  '/admin/invitations': Mail,
  '/admin/profile': UserCircle,
  '/admin/requests': FileText,
  '/admin/settings': Settings,
  '/admin/event-requests': ClipboardList,
  '/admin/import': Upload,
  '/admin/conversation-requests': MessageSquare,
  '/admin/payroll-forms': FileText,
  '/admin/broadcasts': Mail,
  '/payroll': LayoutDashboard,
  '/payroll/check-in': Clock,
  '/payroll/profile': UserCircle,
  '/payroll/schedule': Calendar,
  '/payroll/expenses': DollarSign,
  '/payroll/mileage': Car,
  '/payroll/timesheet': Clock,
  '/payroll/history': Clock,
  '/payroll/requests': FileText,
  '/payroll/forms': FileText,
  '/payroll/settings': Settings,
  '/staff': LayoutDashboard,
  '/staff/directory': Users,
  '/staff/events': Calendar,
  '/staff/inbox': Inbox,
  '/staff/forms': FileText,
  '/staff/groups': MessageSquare,
  '/staff/my-events': Calendar,
  '/staff/profile': UserCircle,
  '/staff/settings': Settings,
  '/staff/onboarding': UserCircle,
  '/volunteers': LayoutDashboard,
  '/volunteers/my-events': Calendar,
  '/volunteers/inbox': Inbox,
  '/volunteers/forms': FileText,
  '/volunteers/onboarding': UserCircle,
  '/volunteers/profile': UserCircle,
  '/volunteers/settings': Settings,
  '/events': Calendar,
  '/notifications': Bell,
}

// Subtitle map for each page
const PAGE_SUBTITLES: Record<string, string> = {
  '/dashboard': 'Welcome back',
  '/dashboard/profile': 'Manage your organization profile',
  '/dashboard/engagement': 'View engagement metrics and feedback',
  '/dashboard/calendar': 'View events calendar',
  '/dashboard/contacts': 'View contact information',
  '/dashboard/events': 'Browse and manage events',
  '/dashboard/history': 'View event history',
  '/dashboard/my-events': 'Events your facility has attended',
  '/dashboard/requests': 'Submit and track event requests',
  '/dashboard/requests/new': 'Submit a new event request',
  '/dashboard/settings': 'Update your settings',
  '/dashboard/forms': 'Access and manage forms',
  '/admin': 'Manage all system settings and users',
  '/admin/audit-log': 'Track all system activity',
  '/admin/users': 'Manage user accounts and permissions',
  '/admin/users/new': 'Create a new user account',
  '/admin/homes': 'Manage facility locations',
  '/admin/financials': 'Approve timesheets, mileage, and expenses',
  '/admin/events': 'Manage events and calendar',
  '/admin/events/new': 'Create a new event',
  '/admin/email-reminders': 'Monitor automated email reminders',
  '/admin/form-templates': 'Manage form templates',
  '/admin/form-submissions': 'Review form submissions',
  '/admin/testimonials': 'Manage testimonials and stories',
  '/admin/inventory': 'Track and manage inventory',
  '/admin/communication': 'Manage groups and messaging',
  '/admin/donors': 'Manage donor information',
  '/admin/messaging': 'Manage message groups',
  '/admin/messaging/requests': 'Review access requests',
  '/admin/messaging/new': 'Create a new message group',
  '/admin/mileage': 'Review staff mileage claims',
  '/admin/timesheets': 'Review staff timesheets',
  '/admin/invitations': 'Send and track invitations',
  '/admin/profile': 'Manage your profile',
  '/admin/requests': 'Review and manage requests',
  '/admin/settings': 'System configuration',
  '/admin/event-requests': 'Review event requests',
  '/admin/import': 'Bulk import data',
  '/admin/conversation-requests': 'Review conversation requests',
  '/admin/payroll-forms': 'Manage required forms for staff',
  '/admin/broadcasts': 'Send messages to all users',
  '/payroll': 'Manage your work activities',
  '/payroll/check-in': 'Log your daily attendance',
  '/payroll/profile': 'Update your profile',
  '/payroll/schedule': 'View your schedule',
  '/payroll/expenses': 'Submit expenses and claims',
  '/payroll/mileage': 'Log travel reimbursements',
  '/payroll/timesheet': 'Track your hours',
  '/payroll/history': 'View past timesheets',
  '/payroll/requests': 'Submit requests and time off',
  '/payroll/forms': 'Access forms and submissions',
  '/payroll/settings': 'Update your settings',
  '/staff': 'Staff portal',
  '/staff/directory': 'Browse team members',
  '/staff/events': 'Browse events',
  '/staff/inbox': 'View your messages',
  '/staff/forms': 'Access form templates',
  '/staff/groups': 'Manage message groups',
  '/staff/my-events': 'View your schedule',
  '/staff/profile': 'Update your profile',
  '/staff/settings': 'Update your settings',
  '/staff/onboarding': 'Finish setting up your profile',
  '/volunteers': 'Volunteer portal',
  '/volunteers/my-events': 'View your schedule',
  '/volunteers/inbox': 'View your messages',
  '/volunteers/forms': 'Access forms',
  '/volunteers/onboarding': 'Finish setting up your profile',
  '/volunteers/profile': 'Update your profile',
  '/volunteers/settings': 'Update your settings',
  '/events': 'Browse all events',
  '/notifications': 'View your notifications',
}

// Page type detection for layout consistency
const FORM_PAGES = [
  '/admin/form-templates/new',
  '/admin/users/new',
  '/dashboard/requests/new',
  '/admin/events/new',
]

const TABLE_PAGES = [
  '/admin/users',
  '/admin/events',
  '/admin/homes',
  '/admin/invitations',
  '/admin/timesheets',
  '/admin/mileage',
  '/admin/donors',
  '/admin/inventory',
  '/admin/forms',
  '/admin/testimonials',
  '/admin/event-requests',
  '/admin/audit-log',
  '/staff/directory',
  '/payroll/timesheet',
  '/payroll/mileage',
  '/payroll/history',
  '/dashboard/events',
  '/dashboard/my-events',
  '/dashboard/history',
  '/dashboard/contacts',
  '/dashboard/requests',
  '/dashboard/forms',
]

function getPageLayoutType(pathname: string): 'form' | 'table' | 'mixed' {
  if (FORM_PAGES.some(p => pathname === p)) return 'form'
  if (pathname.startsWith('/admin/form-templates/') && pathname !== '/admin/form-templates' && pathname !== '/admin/form-templates/new') return 'form'
  if (pathname.startsWith('/admin/users/') && pathname !== '/admin/users/new') return 'form'
  if (pathname.startsWith('/admin/events/') && pathname.includes('/edit')) return 'form'
  if (pathname.startsWith('/staff/forms/') || pathname.startsWith('/dashboard/forms/') || pathname.startsWith('/payroll/forms/') || pathname.startsWith('/volunteers/forms/')) return 'form'
  if (TABLE_PAGES.some(p => pathname.startsWith(p))) return 'table'
  return 'mixed'
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

function getPageTitle(pathname: string, homeName?: string) {
  if (pathname === '/dashboard' && homeName) {
    return `${getGreeting()}, ${homeName}`
  }
  
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname]
  
  if (pathname.startsWith('/admin/event-requests/')) return 'Event Request'
  if (pathname.startsWith('/admin/homes/')) return 'Facility Details'
  if (pathname.startsWith('/admin/users/')) return 'User Profile'
  if (pathname.startsWith('/admin/timesheets/')) return 'Timesheet Review'
  if (pathname.startsWith('/admin/messaging/')) return 'Group Messages'
  if (pathname.startsWith('/admin/forms/')) return 'Form Template'
  if (pathname.startsWith('/admin/form-templates/')) return 'Form Template'
  if (pathname.startsWith('/staff/directory/')) return 'Staff Profile'
  if (pathname.startsWith('/staff/events/')) return 'Event Details'
  if (pathname.startsWith('/staff/forms/')) return 'Form Template'
  if (pathname.startsWith('/staff/groups/')) return 'Group Messages'
  if (pathname.startsWith('/staff/inbox/') && pathname.split('/').length > 3) return 'Conversation'
  if (pathname.startsWith('/payroll/forms/')) return 'Form Template'
  if (pathname.startsWith('/volunteers/forms/')) return 'Form Template'
  if (pathname.startsWith('/volunteers/inbox/') && pathname.split('/').length > 3) return 'Conversation'
  if (pathname.startsWith('/dashboard/forms/')) return 'Form Template'
  if (pathname.startsWith('/dashboard/my-events/')) return 'Event Details'
  if (pathname.startsWith('/dashboard/requests/')) return 'Event Request'
  if (pathname.startsWith('/dashboard/events/')) return 'Event Sign-up'
  if (pathname.startsWith('/events/')) return 'Event Details'
  
  return 'Dashboard'
}

function getPageIcon(pathname: string) {
  if (PAGE_ICONS[pathname]) return PAGE_ICONS[pathname]
  
  if (pathname.startsWith('/admin/event-requests/')) return ClipboardList
  if (pathname.startsWith('/admin/homes/')) return Home
  if (pathname.startsWith('/admin/users/')) return Users
  if (pathname.startsWith('/admin/timesheets/')) return Clock
  if (pathname.startsWith('/admin/messaging/')) return MessageSquare
  if (pathname.startsWith('/admin/forms/')) return FileText
  if (pathname.startsWith('/admin/form-templates/')) return FileText
  if (pathname.startsWith('/staff/directory/')) return Users
  if (pathname.startsWith('/staff/events/')) return Calendar
  if (pathname.startsWith('/staff/forms/')) return FileText
  if (pathname.startsWith('/staff/groups/')) return MessageSquare
  if (pathname.startsWith('/staff/inbox/')) return Inbox
  if (pathname.startsWith('/payroll/forms/')) return FileText
  if (pathname.startsWith('/volunteers/forms/')) return FileText
  if (pathname.startsWith('/volunteers/inbox/')) return Inbox
  if (pathname.startsWith('/dashboard/forms/')) return FileText
  if (pathname.startsWith('/dashboard/my-events/')) return Calendar
  if (pathname.startsWith('/dashboard/requests/')) return ClipboardList
  if (pathname.startsWith('/dashboard/events/')) return Calendar
  if (pathname.startsWith('/events/')) return Calendar
  
  return LayoutDashboard
}

function getPageSubtitle(pathname: string) {
  if (PAGE_SUBTITLES[pathname]) return PAGE_SUBTITLES[pathname]
  
  if (pathname.startsWith('/admin/event-requests/')) return 'View request details'
  if (pathname.startsWith('/admin/homes/')) return 'View facility details'
  if (pathname.startsWith('/admin/users/')) return 'View user profile'
  if (pathname.startsWith('/admin/timesheets/')) return 'Review timesheet'
  if (pathname.startsWith('/admin/messaging/')) return 'View group messages'
  if (pathname.startsWith('/admin/forms/')) return 'View form template'
  if (pathname.startsWith('/admin/form-templates/')) return 'Edit form template'
  if (pathname.startsWith('/staff/directory/')) return 'View staff profile'
  if (pathname.startsWith('/staff/events/')) return 'View event details'
  if (pathname.startsWith('/staff/forms/')) return 'View form template'
  if (pathname.startsWith('/staff/groups/')) return 'View messages'
  if (pathname.startsWith('/staff/inbox/')) return 'View conversation'
  if (pathname.startsWith('/payroll/forms/')) return 'View form template'
  if (pathname.startsWith('/volunteers/forms/')) return 'View form template'
  if (pathname.startsWith('/volunteers/inbox/')) return 'View conversation'
  if (pathname.startsWith('/dashboard/forms/')) return 'View form template'
  if (pathname.startsWith('/dashboard/my-events/')) return 'View event details'
  if (pathname.startsWith('/dashboard/requests/')) return 'View request details'
  if (pathname.startsWith('/dashboard/events/')) return 'Sign up for event'
  if (pathname.startsWith('/events/')) return 'View event details'
  
  return ''
}

type DashboardLayoutProps = {
  children: React.ReactNode
  role: string
  title?: string
  notifications: any[]
  unreadCount: number
  userSession: any
  homeName?: string
}

export function DashboardLayoutClient({ children, role, title = "Arts & Aging", notifications, unreadCount, userSession, homeName }: DashboardLayoutProps) {
  const pathname = usePathname()
  const normalizedPathname = normalizeStaffNamespace(pathname)
  const currentTitle = getPageTitle(normalizedPathname, homeName)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const menuItems = role === 'ADMIN' ? adminMenu
    : role === 'HOME_ADMIN' ? homeAdminMenu
    : MENU_ITEMS[role] || []

  const assignedRoles = Array.isArray(userSession?.roles) ? userSession.roles : (userSession?.role ? [userSession.role] : [])
  const rolePortalLinks: Array<{ role: string; href: string; label: string }> = assignedRoles
    .filter((assignedRole: string) => assignedRole !== 'BOARD')
    .map((assignedRole: string) => ({
      role: assignedRole,
      href: getRoleHomePath(assignedRole),
      label: ROLE_LABELS[assignedRole as keyof typeof ROLE_LABELS] || assignedRole,
    }))
  const showRoleSwitcher = rolePortalLinks.length > 1

  const portalConfig = {
    ADMIN: { label: 'Admin Portal', bg: 'bg-secondary-400', text: 'text-primary-900' },
    HOME_ADMIN: { label: 'Home Portal', bg: 'bg-accent-400', text: 'text-primary-900' },
    FACILITATOR: { label: 'Facilitator Portal', bg: 'bg-accent-300', text: 'text-primary-900' },
    VOLUNTEER: { label: 'Volunteer Portal', bg: 'bg-accent-300', text: 'text-primary-900' },
    BOARD: { label: 'Board Portal', bg: 'bg-purple-400', text: 'text-purple-900' },
    PARTNER: { label: 'Partner Portal', bg: 'bg-blue-400', text: 'text-blue-900' },
    PAYROLL: { label: 'Payroll Portal', bg: 'bg-green-400', text: 'text-green-900' }
  }

  const portal = portalConfig[role as keyof typeof portalConfig] || { label: 'Portal', bg: 'bg-gray-400', text: 'text-gray-900' }

  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.width = '100%'
    } else {
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
    }
    return () => {
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
    }
  }, [sidebarOpen])

  return (
    <div className="flex h-screen bg-background">
      <aside className="hidden md:flex w-64 flex-col bg-primary-800 text-white shadow-xl">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center">
              <Image
                src="/sidebar-logo.png"
                alt="Arts & Aging Logo"
                width={32}
                height={32}
                className="w-full h-full object-contain"
              />
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

        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
          {showRoleSwitcher && (
            <div className="mb-3 px-2">
              <p className="text-[10px] uppercase tracking-wide text-primary-300 mb-2">Role Portals</p>
              <div className="flex flex-wrap gap-1">
                {rolePortalLinks.map((portalLink) => (
                  <Link
                    key={portalLink.role}
                    href={portalLink.href}
                    className={cn(
                      'text-[11px] px-2 py-1 rounded border border-white/20 text-primary-100 hover:bg-white/10',
                      role === portalLink.role && 'bg-white/15 text-white'
                    )}
                  >
                    {portalLink.label}
                  </Link>
                ))}
              </div>
            </div>
          )}
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

      {sidebarOpen && (
        <>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden fixed inset-0 z-40 bg-black/50 touch-none"
            style={{ touchAction: 'none' }}
            aria-label="Close menu"
          />
          <aside className="md:hidden fixed inset-y-0 left-0 z-50 w-64 flex flex-col bg-primary-800 text-white shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center">
                  <Image
                    src="/favicon-512.png"
                    alt="Arts & Aging Logo"
                    width={32}
                    height={32}
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className="font-bold text-white">{title}</span>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 text-primary-200 hover:bg-white/10 rounded-lg transition-colors"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
              {showRoleSwitcher && (
                <div className="mb-3 px-2">
                  <p className="text-[10px] uppercase tracking-wide text-primary-300 mb-2">Role Portals</p>
                  <div className="flex flex-wrap gap-1">
                    {rolePortalLinks.map((portalLink) => (
                      <Link
                        key={portalLink.role}
                        href={portalLink.href}
                        onClick={() => setSidebarOpen(false)}
                        className={cn(
                          'text-[11px] px-2 py-1 rounded border border-white/20 text-primary-100 hover:bg-white/10',
                          role === portalLink.role && 'bg-white/15 text-white'
                        )}
                      >
                        {portalLink.label}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              {menuItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href + item.label}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      "group flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                      isActive ? "bg-white/10 text-white" : "hover:bg-white/5 text-primary-100"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center",
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
        </>
      )}

      <div className="flex-1 flex flex-col">
        <header className="bg-secondary-400 border-b-2 border-secondary-500 px-4 md:px-6 py-4 flex items-center shadow-sm">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-2 text-gray-800 hover:text-gray-900 hover:bg-secondary-300 rounded-lg transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="flex items-center gap-4 ml-2 flex-1 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-white text-primary-600 flex items-center justify-center shadow-sm">
              {(() => {
                const Icon = getPageIcon(normalizedPathname)
                return <Icon className="w-6 h-6" />
              })()}
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-gray-900 truncate">{currentTitle}</h1>
              <p className="text-base text-gray-800 hidden sm:block truncate font-medium">
                {getPageSubtitle(normalizedPathname)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 ml-4">
            <NotificationBell
              initialNotifications={notifications}
              initialUnreadCount={unreadCount}
              userRole={role}
            />
          </div>
        </header>

        <main className="flex-1 flex flex-col min-h-0 bg-gray-50/50 overflow-y-auto p-4 md:p-6">
          {(() => {
            const layoutType = getPageLayoutType(normalizedPathname)
            const maxWidthClass = layoutType === 'form' ? 'max-w-5xl' : 
                                 layoutType === 'table' ? 'max-w-full' : 
                                 'max-w-7xl'
            
            return (
              <div className={cn(maxWidthClass, "mx-auto w-full overflow-x-hidden flex-1 flex flex-col")}>
                {children}
              </div>
            )
          })()}
        </main>
      </div>
    </div>
  )
}
