import { auth } from "@/auth"
import DashboardLayout from "@/components/DashboardLayout"
import { redirect } from "next/navigation"

export default async function BoardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  return (
    <DashboardLayout role="BOARD">
      {children}
    </DashboardLayout>
  )
}
