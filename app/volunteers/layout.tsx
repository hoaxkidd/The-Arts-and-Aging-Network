import { auth } from "@/auth"
import { redirect } from "next/navigation"
import DashboardLayout from "@/components/DashboardLayout"

export default async function VolunteersLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  const roles = Array.isArray(session?.user?.roles) ? session.user.roles : (session?.user?.role ? [session.user.role] : [])
  const hasVolunteerRole = roles.includes('VOLUNTEER')
  
  if (hasVolunteerRole && session?.user?.volunteerReviewStatus !== 'APPROVED') {
    redirect("/volunteers/onboarding")
  }

  return (
    <DashboardLayout role="VOLUNTEER" title="Volunteer Portal">
      {children}
    </DashboardLayout>
  )
}
