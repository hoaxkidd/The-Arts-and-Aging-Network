import { auth } from "@/auth"
import { redirect } from "next/navigation"
import DashboardLayout from "@/components/DashboardLayout"

export default async function NotificationsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  // Determine user role for the layout
  const role = session.user.role as "ADMIN" | "PAYROLL" | "HOME_ADMIN" | "FACILITATOR" | "CONTRACTOR"

  return (
    <DashboardLayout role={role}>
      {children}
    </DashboardLayout>
  )
}
