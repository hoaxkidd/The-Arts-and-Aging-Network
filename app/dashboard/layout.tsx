import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import DashboardLayout from "@/components/DashboardLayout"

export default async function HomeDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  
  let homeName: string | undefined
  
  if (session?.user?.id) {
    try {
      const home = await prisma.geriatricHome.findUnique({
        where: { userId: session.user.id },
        select: { name: true }
      })
      homeName = home?.name
    } catch (err) {
      console.warn('Could not load home name:', err instanceof Error ? err.message : err)
    }
  }
  
  return (
    <DashboardLayout role="HOME_ADMIN" homeName={homeName}>
      {children}
    </DashboardLayout>
  )
}
