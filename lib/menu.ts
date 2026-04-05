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
  icon: any
}

export const adminMenu = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Audit Log", href: "/admin/audit-log", icon: FileSearch },
  { label: "Financial Management", href: "/admin/financials", icon: Receipt },
  { label: "Event Management", href: "/admin/events", icon: Calendar },
  { label: "Event Requests", href: "/admin/event-requests", icon: ClipboardList },
  { label: "Broadcasts", href: "/admin/broadcasts", icon: Mail },
  { label: "Email Reminders", href: "/admin/email-reminders", icon: Mail },
  { label: "Communication Hub", href: "/admin/communication", icon: MessageSquare },
  { label: "Conversation Requests", href: "/admin/conversation-requests", icon: MessageSquare },
  { label: "Payroll Forms", href: "/admin/payroll-forms", icon: FileText },
  { label: "Payroll Requests", href: "/admin/requests", icon: ClipboardList },
  { label: "Homes", href: "/admin/homes", icon: Building },
  { label: "User Management", href: "/admin/users", icon: Users },
  { label: "Team Directory", href: "/staff/directory", icon: Users },
  { label: "Inventory", href: "/admin/inventory", icon: Package },
  { label: "Donors", href: "/admin/donors", icon: Heart },
  { label: "Testimonials", href: "/admin/testimonials", icon: Quote },
  { label: "Forms", href: "/admin/forms", icon: FileText },
  { label: "Form Submissions", href: "/admin/form-submissions", icon: FileText },
  { label: "Import Data", href: "/admin/import", icon: Upload },
  { label: "Settings", href: "/admin/settings", icon: Settings },
  { label: "My Profile", href: "/admin/profile", icon: UserCircle },
]

export const staffMenu = [
  { label: "Dashboard", href: "/staff", icon: LayoutDashboard },
  { label: "Browse Events", href: "/staff/events", icon: Calendar },
  { label: "My Schedule", href: "/staff/my-events", icon: CalendarCheck },
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

export const volunteerMenu = [
  { label: "Dashboard", href: "/volunteers", icon: LayoutDashboard },
  { label: "Browse Events", href: "/events", icon: Calendar },
  { label: "My Schedule", href: "/volunteers/my-events", icon: CalendarCheck },
  { label: "Inbox", href: "/volunteers/inbox", icon: Inbox },
  { label: "Forms", href: "/volunteers/forms", icon: FileText },
  { label: "My Profile", href: "/volunteers/profile", icon: UserCircle },
  { label: "Settings", href: "/volunteers/settings", icon: Settings },
]

export const boardMenu = [
  { label: "Dashboard", href: "/board", icon: LayoutDashboard },
  { label: "Events Calendar", href: "/board/events", icon: CalendarCheck },
  { label: "Team Directory", href: "/board/directory", icon: Users },
  { label: "Inbox", href: "/board/inbox", icon: Inbox },
  { label: "My Profile", href: "/board/profile", icon: UserCircle },
  { label: "Settings", href: "/board/settings", icon: Settings },
]

export const homeAdminMenu = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Calendar", href: "/dashboard/calendar", icon: Calendar },
  { label: "Events", href: "/dashboard/events", icon: Calendar },
  { label: "Engagement", href: "/dashboard/engagement", icon: MessageSquare },
  { label: "Inbox", href: "/staff/inbox", icon: Inbox },
  { label: "My Requests", href: "/dashboard/requests", icon: ClipboardList },
  { label: "Forms", href: "/dashboard/forms", icon: FileText },
  { label: "My Events", href: "/dashboard/my-events", icon: CheckCircle },
  { label: "History", href: "/dashboard/history", icon: Clock },
  { label: "Contacts", href: "/dashboard/contacts", icon: Users },
  { label: "My Profile", href: "/dashboard/profile", icon: UserCircle },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
]

export const MENU_ITEMS: Record<string, MenuItem[]> = {
  ADMIN: adminMenu,
  PAYROLL: [
    { label: "Dashboard", href: "/payroll", icon: LayoutDashboard },
    { label: "Events", href: "/events", icon: Calendar },
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
  PARTNER: staffMenu,
}
