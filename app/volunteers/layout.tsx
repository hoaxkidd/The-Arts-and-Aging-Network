import { auth } from "@/auth"
import { redirect } from "next/navigation"
import DashboardLayout from "@/components/DashboardLayout"

export default async function VolunteersLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  
  if (session?.user?.role === 'VOLUNTEER' && session.user.volunteerReviewStatus !== 'APPROVED') {
    redirect("/staff/onboarding")
  }

  return (
    <DashboardLayout role="VOLUNTEER" title="Volunteer Portal">
      {children}
    </DashboardLayout>
  )
}
