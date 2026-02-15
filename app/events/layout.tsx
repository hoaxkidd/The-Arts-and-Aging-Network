import DashboardLayout from "@/components/DashboardLayout"
import { auth } from "@/auth"
import { redirect } from "next/navigation"

export default async function EventsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user?.role) {
    redirect('/login')
  }

  // All roles can view public events calendar - pass actual role for correct sidebar
  return (
    <DashboardLayout role={session.user.role}>
      {children}
    </DashboardLayout>
  )
}
