import { auth } from "@/auth"
import { redirect } from "next/navigation"
import DashboardLayout from "@/components/DashboardLayout"

export default async function VolunteerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/login')
  }
  // Volunteer approval + /volunteer/* gating is enforced in middleware to avoid duplicate redirects/loops.

  return (
    <DashboardLayout role="VOLUNTEER" title="Volunteer Portal">
      {children}
    </DashboardLayout>
  )
}
