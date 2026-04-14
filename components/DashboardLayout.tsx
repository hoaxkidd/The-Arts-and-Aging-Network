import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { DashboardLayoutClient } from "@/components/DashboardLayoutClient"
import { BOOKINGS_ACCESS_POLICY_TEMPLATE_TYPE, parseBookingsAccessPolicyConfig } from "@/lib/bookings-access-policy"

type DashboardLayoutProps = {
  children: React.ReactNode
  role: string
  title?: string
  homeName?: string
}

async function getNotifications(userId: string) {
  'use server'
  
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20
    })
    return notifications
  } catch (err) {
    console.warn('Could not load notifications:', err instanceof Error ? err.message : err)
    return []
  }
}

export default async function DashboardLayout({ children, role, title = "Arts & Aging", homeName }: DashboardLayoutProps) {
  const session = await auth()
  const currentUser = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { name: true, email: true },
      })
    : null

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
  const policyTemplate = await prisma.emailTemplate.findUnique({
    where: { type: BOOKINGS_ACCESS_POLICY_TEMPLATE_TYPE },
    select: { content: true },
  })
  const bookingsAccessPolicy = parseBookingsAccessPolicyConfig(policyTemplate?.content)

  if (session?.user?.id) {
    notifications = await getNotifications(session.user.id)
    unreadCount = notifications.filter(n => !n.read).length
  }

  return (
    <DashboardLayoutClient 
        role={role} 
        title={title} 
        notifications={notifications} 
        unreadCount={unreadCount}
        bookingsAccessAllowedRoles={bookingsAccessPolicy.allowedRoles}
        userSession={{
          ...session?.user,
          name: currentUser?.name ?? session?.user?.name,
          email: currentUser?.email ?? session?.user?.email,
        }}
        homeName={homeName}
    >
        {children}
    </DashboardLayoutClient>
  )
}
