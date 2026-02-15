import DashboardLayout from "@/components/DashboardLayout"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { headers } from "next/headers"

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') || headersList.get('x-invoke-path') || ''

  // Allow all authenticated users to access inbox and directory
  const isPublicStaffRoute = pathname.startsWith('/staff/inbox') || pathname.startsWith('/staff/directory')

  if (!session) {
    redirect('/login')
  }

  const role = session.user.role as string
  const allowedStaffRoles = ['FACILITATOR', 'CONTRACTOR', 'VOLUNTEER', 'BOARD', 'PARTNER', 'ADMIN', 'PAYROLL', 'HOME_ADMIN']

  // Only restrict non-public staff routes to allowed staff roles
  if (!isPublicStaffRoute && !allowedStaffRoles.includes(role)) {
    redirect('/login')
  }

  return (
    <DashboardLayout role={role}>
      {children}
    </DashboardLayout>
  )
}
