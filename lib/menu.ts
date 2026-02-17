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
  Inbox
} from "lucide-react"

export type MenuItem = {
  label: string
  href: string
  icon: any
}

export const adminMenu = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Financial Management", href: "/admin/financials", icon: Receipt },
  { label: "Event Management", href: "/admin/events", icon: Calendar },
  { label: "Event Requests", href: "/admin/event-requests", icon: ClipboardList },
  { label: "Communication Hub", href: "/admin/communication", icon: MessageSquare },
  { label: "Homes", href: "/admin/homes", icon: Building },
  { label: "User Management", href: "/admin/users", icon: Users },
  { label: "Staff Directory", href: "/staff/directory", icon: Users },
  { label: "Inventory", href: "/admin/inventory", icon: Package },
  { label: "Donors", href: "/admin/donors", icon: Heart },
  { label: "Testimonials", href: "/admin/testimonials", icon: Quote },
  { label: "Form Templates", href: "/admin/form-templates", icon: FileText },
  { label: "Settings", href: "/admin/settings", icon: Settings },
  { label: "My Profile", href: "/admin/profile", icon: UserCircle },
]

export const staffMenu = [
  { label: "Dashboard", href: "/staff", icon: LayoutDashboard },
  { label: "Browse Events", href: "/staff/events", icon: Calendar },
  { label: "My Schedule", href: "/staff/my-events", icon: CalendarCheck },
  { label: "Staff Directory", href: "/staff/directory", icon: Users },
  { label: "Inbox", href: "/staff/inbox", icon: Inbox },
  { label: "Form Templates", href: "/staff/forms", icon: FileText },
  { label: "Groups", href: "/staff/groups", icon: MessageSquare },
  { label: "My Profile", href: "/staff/profile", icon: UserCircle },
  { label: "Settings", href: "/staff/settings", icon: Settings },
]

export const volunteerMenu = [
  { label: "Dashboard", href: "/staff", icon: LayoutDashboard },
  { label: "Browse Events", href: "/staff/events", icon: Calendar },
  { label: "My Schedule", href: "/staff/my-events", icon: CalendarCheck },
  { label: "Staff Directory", href: "/staff/directory", icon: Users },
  { label: "Inbox", href: "/staff/inbox", icon: Inbox },
  { label: "My Profile", href: "/staff/profile", icon: UserCircle },
  { label: "Settings", href: "/staff/settings", icon: Settings },
]

export const boardMenu = [
  { label: "Dashboard", href: "/staff", icon: LayoutDashboard },
  { label: "Events Calendar", href: "/events", icon: CalendarCheck },
  { label: "Staff Directory", href: "/staff/directory", icon: Users },
  { label: "Inbox", href: "/staff/inbox", icon: Inbox },
  { label: "My Profile", href: "/staff/profile", icon: UserCircle },
  { label: "Settings", href: "/staff/settings", icon: Settings },
]

export const homeAdminMenu = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Events Calendar",
    href: "/dashboard/calendar",
    icon: Calendar,
  },
  {
    label: "Browse Events",
    href: "/dashboard/events",
    icon: Calendar,
  },
  {
    label: "Inbox",
    href: "/staff/inbox",
    icon: Inbox,
  },
  {
    label: "My Requests",
    href: "/dashboard/requests",
    icon: ClipboardList,
  },
  {
    label: "My Events",
    href: "/dashboard/my-events",
    icon: CheckCircle,
  },
  {
    label: "History",
    href: "/dashboard/history",
    icon: Clock,
  },
  {
    label: "Contacts",
    href: "/dashboard/contacts",
    icon: Users,
  },
  {
    label: "My Profile",
    href: "/dashboard/profile",
    icon: UserCircle,
  },
  {
    label: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
  },
]

export const MENU_ITEMS: Record<string, MenuItem[]> = {
  ADMIN: adminMenu,
  PAYROLL: [
    { label: "Dashboard", href: "/payroll", icon: LayoutDashboard },
    { label: "Events", href: "/events", icon: Calendar },
    { label: "Staff Directory", href: "/staff/directory", icon: Users },
    { label: "Inbox", href: "/staff/inbox", icon: Inbox },
    { label: "Daily Check-in", href: "/payroll/check-in", icon: Clock },
    { label: "Timesheet", href: "/payroll/timesheet", icon: ClipboardList },
    { label: "Mileage", href: "/payroll/mileage", icon: MapPin },
    { label: "My Requests", href: "/payroll/requests", icon: Receipt },
    { label: "History", href: "/payroll/history", icon: Calendar },
    { label: "My Profile", href: "/payroll/profile", icon: UserCircle },
    { label: "Settings", href: "/payroll/settings", icon: Settings },
  ],
  HOME_ADMIN: homeAdminMenu,
  FACILITATOR: staffMenu,
  CONTRACTOR: staffMenu,
  VOLUNTEER: volunteerMenu,
  BOARD: boardMenu,
  PARTNER: boardMenu, // Same as board for now
}
