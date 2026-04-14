import type { LucideIcon } from "lucide-react"
import {
  LayoutDashboard,
  Users,
  UserCircle,
  ClipboardList,
  Clock,
  Calendar,
  Building,
  CalendarCheck,
  CheckCircle,
  Settings,
  FileText,
  Quote,
  Package,
  Heart,
  MessageSquare,
  MapPin,
  Receipt,
  Inbox,
  FileSearch,
  Mail,
  Upload
} from "lucide-react"

export type MenuItem = {
  label: string
  href: string
  icon: LucideIcon
}

/** Single link under an admin nav group (sidebar). */
export type AdminNavChild = {
  label: string
  href: string
  icon: LucideIcon
}

/** Collapsible admin sidebar group with nested links. */
export type AdminNavGroup = {
  id: string
  label: string
  icon: LucideIcon
  children: AdminNavChild[]
}

/**
 * Admin IA: top-level grouped navigation — every href must stay in sync with App Router.
 */
export const adminNavGroups: AdminNavGroup[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    children: [{ label: "Dashboard", href: "/admin", icon: LayoutDashboard }],
  },
  {
    id: "events",
    label: "Bookings & Outreach",
    icon: Calendar,
    children: [
      { label: "Booking Management", href: "/admin/bookings", icon: Calendar },
      { label: "Booking Requests", href: "/admin/booking-requests", icon: ClipboardList },
      { label: "Broadcasts", href: "/admin/broadcasts", icon: Mail },
      { label: "Email Reminders", href: "/admin/email-reminders", icon: Mail },
    ],
  },
  {
    id: "finance",
    label: "Finance & Payroll",
    icon: Receipt,
    children: [
      { label: "Financial Management", href: "/admin/financials", icon: Receipt },
      { label: "Payroll Forms", href: "/admin/payroll-forms", icon: FileText },
      { label: "Payroll Requests", href: "/admin/requests", icon: ClipboardList },
      { label: "Timesheets", href: "/admin/timesheets", icon: Clock },
      { label: "Mileage", href: "/admin/mileage", icon: MapPin },
    ],
  },
  {
    id: "people",
    label: "People & Homes",
    icon: Users,
    children: [
      { label: "Homes", href: "/admin/homes", icon: Building },
      { label: "User Management", href: "/admin/users", icon: Users },
      { label: "Volunteer Review", href: "/admin/volunteers", icon: Users },
      { label: "Invitations", href: "/admin/invitations", icon: Mail },
      { label: "Team Directory", href: "/staff/directory", icon: Users },
    ],
  },
  {
    id: "communication",
    label: "Communication",
    icon: MessageSquare,
    children: [
      { label: "Communication Hub", href: "/admin/communication", icon: MessageSquare },
      { label: "Message Groups", href: "/admin/messaging", icon: MessageSquare },
      { label: "Messaging Requests", href: "/admin/messaging/requests", icon: MessageSquare },
      { label: "Conversation Requests", href: "/admin/conversation-requests", icon: MessageSquare },
    ],
  },
  {
    id: "forms",
    label: "Forms & Content",
    icon: FileText,
    children: [
      { label: "Testimonials", href: "/admin/testimonials", icon: Quote },
      { label: "Forms", href: "/admin/forms", icon: FileText },
      { label: "Form Templates", href: "/admin/form-templates", icon: FileText },
      { label: "Form Submissions", href: "/admin/form-submissions", icon: FileText },
      { label: "Import Data", href: "/admin/import", icon: Upload },
    ],
  },
  {
    id: "inventory",
    label: "Inventory & Donors",
    icon: Package,
    children: [
      { label: "Inventory", href: "/admin/inventory", icon: Package },
      { label: "Donors", href: "/admin/donors", icon: Heart },
    ],
  },
  {
    id: "system",
    label: "System & Account",
    icon: Settings,
    children: [
      { label: "Audit Log", href: "/admin/audit-log", icon: FileSearch },
      { label: "Settings", href: "/admin/settings", icon: Settings },
      { label: "My Profile", href: "/admin/profile", icon: UserCircle },
    ],
  },
]

/** Frozen list of sidebar hrefs (merge / QA parity). */
export const CANONICAL_ADMIN_NAV_HREFS: readonly string[] = adminNavGroups.flatMap((g) =>
  g.children.map((c) => c.href)
) as readonly string[]

/** Whether `pathname` should highlight the nav child for `href`. */
export function adminNavHrefIsActive(pathname: string, href: string): boolean {
  const path = pathname.split("?")[0] || pathname
  if (href === "/admin") {
    return path === "/admin" || path === "/admin/"
  }
  if (path === href) return true
  return path.startsWith(href.endsWith("/") ? href : `${href}/`)
}

/** Group id containing the active child for `pathname`, or null. */
export function getAdminNavGroupIdForPath(pathname: string): string | null {
  const path = pathname.split("?")[0] || pathname
  for (const g of adminNavGroups) {
    for (const c of g.children) {
      if (adminNavHrefIsActive(path, c.href)) return g.id
    }
  }
  return null
}

/** Flat list of all admin links — backward compatible with grouped nav consumers. */
export const adminMenu: MenuItem[] = adminNavGroups.flatMap((g) =>
  g.children.map((c) => ({
    label: c.label,
    href: c.href,
    icon: c.icon,
  }))
)

export const adminContextualRoutes: AdminNavChild[] = [
  { label: 'Create Booking', href: '/admin/bookings/new', icon: Calendar },
  { label: 'Edit Booking', href: '/admin/bookings/[id]/edit', icon: Calendar },
  { label: 'Review Booking Request', href: '/admin/booking-requests/[id]', icon: ClipboardList },
  { label: 'Create User', href: '/admin/users/new', icon: Users },
  { label: 'User Profile', href: '/admin/users/[id]', icon: UserCircle },
  { label: 'Home Details', href: '/admin/homes/[id]', icon: Building },
  { label: 'Create Message Group', href: '/admin/messaging/new', icon: MessageSquare },
  { label: 'Message Group Details', href: '/admin/messaging/[id]', icon: MessageSquare },
  { label: 'Timesheet Review Details', href: '/admin/timesheets/[id]', icon: Clock },
  { label: 'Create Form Template', href: '/admin/form-templates/new', icon: FileText },
  { label: 'Edit Form Template', href: '/admin/form-templates/[id]/edit', icon: FileText },
  { label: 'Edit Form', href: '/admin/forms/[id]/edit', icon: FileText },
]

export const staffMenu = [
  { label: "Dashboard", href: "/staff", icon: LayoutDashboard },
  { label: "Browse Bookings", href: "/staff/bookings", icon: Calendar },
  { label: "My Schedule", href: "/staff/my-bookings", icon: CalendarCheck },
  { label: "Team Directory", href: "/staff/directory", icon: Users },
  { label: "Inbox", href: "/staff/inbox", icon: Inbox },
  { label: "Form Templates", href: "/staff/forms", icon: FileText },
  { label: "My Profile", href: "/staff/profile", icon: UserCircle },
  { label: "Settings", href: "/staff/settings", icon: Settings },
]

function withBasePath(menu: MenuItem[], fromBase: string, toBase: string): MenuItem[] {
  return menu.map((item) => ({
    ...item,
    href: item.href.startsWith(fromBase) ? item.href.replace(fromBase, toBase) : item.href,
  }))
}

export const facilitatorMenu = withBasePath(staffMenu, '/staff', '/facilitator')

export const partnerMenu = withBasePath(staffMenu, '/staff', '/partner').filter((item) => item.href !== '/partner/bookings')

export const volunteerMenu = [
  { label: "Dashboard", href: "/volunteer", icon: LayoutDashboard },
  { label: "Browse Bookings", href: "/bookings", icon: Calendar },
  { label: "My Schedule", href: "/volunteer/my-bookings", icon: CalendarCheck },
  { label: "Inbox", href: "/volunteer/inbox", icon: Inbox },
  { label: "Forms", href: "/volunteer/forms", icon: FileText },
  { label: "My Profile", href: "/volunteer/profile", icon: UserCircle },
  { label: "Settings", href: "/volunteer/settings", icon: Settings },
]

export const boardMenu = [
  { label: "Dashboard", href: "/board", icon: LayoutDashboard },
  { label: "Bookings Calendar", href: "/board/bookings", icon: CalendarCheck },
  { label: "Team Directory", href: "/board/directory", icon: Users },
  { label: "Inbox", href: "/board/inbox", icon: Inbox },
  { label: "My Profile", href: "/board/profile", icon: UserCircle },
  { label: "Settings", href: "/board/settings", icon: Settings },
]

export const homeAdminMenu = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "My Bookings", href: "/dashboard/my-bookings", icon: CheckCircle },
  { label: "Inbox", href: "/staff/inbox", icon: Inbox },
  { label: "Profile", href: "/dashboard/profile", icon: UserCircle },
]

export const MENU_ITEMS: Record<string, MenuItem[]> = {
  ADMIN: adminMenu,
  PAYROLL: [
    { label: "Dashboard", href: "/payroll", icon: LayoutDashboard },
    { label: "Schedule", href: "/payroll/schedule", icon: CalendarCheck },
    { label: "Team Directory", href: "/staff/directory", icon: Users },
    { label: "Inbox", href: "/staff/inbox", icon: Inbox },
    { label: "Forms", href: "/payroll/forms", icon: FileText },
    { label: "Daily Check-in", href: "/payroll/check-in", icon: Clock },
    { label: "Timesheet", href: "/payroll/timesheet", icon: ClipboardList },
    { label: "Mileage", href: "/payroll/mileage", icon: MapPin },
    { label: "My Requests", href: "/payroll/requests", icon: Receipt },
    { label: "History", href: "/payroll/history", icon: Calendar },
    { label: "My Profile", href: "/payroll/profile", icon: UserCircle },
    { label: "Settings", href: "/payroll/settings", icon: Settings },
  ],
  HOME_ADMIN: homeAdminMenu,
  FACILITATOR: facilitatorMenu,
  VOLUNTEER: volunteerMenu,
  BOARD: boardMenu,
  PARTNER: partnerMenu,
}
