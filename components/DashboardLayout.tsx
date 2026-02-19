import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { DashboardLayoutClient } from "@/components/DashboardLayoutClient"

type DashboardLayoutProps = {
  children: React.ReactNode
  role: string
  title?: string
}

export default async function DashboardLayout({ children, role, title = "Arts & Aging" }: DashboardLayoutProps) {
  const session = await auth()

  // Fetch notifications for the current user
  let notifications: {
    id: string
    type: string
    title: string
    message: string
    link: string | null
    read: boolean
    createdAt: Date
  }[] = []
  let unreadCount = 0

  if (session?.user?.id) {
    try {
      notifications = await prisma.notification.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: 'desc' }
      })
      unreadCount = notifications.filter(n => !n.read).length
    } catch (err) {
      // Notification table may not exist yet — run `npm run db:push`
      console.warn('Could not load notifications:', err instanceof Error ? err.message : err)
    }
  }

  return (
    <DashboardLayoutClient 
        role={role} 
        title={title} 
        notifications={notifications} 
        unreadCount={unreadCount}
        userSession={session?.user}
    >
        {children}
    </DashboardLayoutClient>
  )
}
