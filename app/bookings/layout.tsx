import DashboardLayout from "@/components/DashboardLayout"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getRoleHomePath } from "@/lib/role-routes"
import { BOOKINGS_ACCESS_POLICY_TEMPLATE_TYPE, canRoleAccessBookings, parseBookingsAccessPolicyConfig } from "@/lib/bookings-access-policy"

export default async function BookingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user?.role) {
    redirect('/login')
  }

  if (session.user.role === 'HOME_ADMIN') {
    redirect('/dashboard/my-bookings')
  }

  const policyTemplate = await prisma.emailTemplate.findUnique({
    where: { type: BOOKINGS_ACCESS_POLICY_TEMPLATE_TYPE },
    select: { content: true },
  })
  const policyConfig = parseBookingsAccessPolicyConfig(policyTemplate?.content)

  if (!canRoleAccessBookings(session.user.role, policyConfig)) {
    redirect(getRoleHomePath(session.user.role))
  }

  // Route-level access policy controls which roles can use /bookings
  return (
    <DashboardLayout role={session.user.role}>
      {children}
    </DashboardLayout>
  )
}
