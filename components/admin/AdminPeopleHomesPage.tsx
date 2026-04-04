import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import AdminPeopleHomesTabs from './AdminPeopleHomesTabs'

type TabKey = 'team' | 'home-admins' | 'homes'

export default async function AdminPeopleHomesPage({
  defaultTab,
}: {
  defaultTab: TabKey
}) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    return <div>Unauthorized</div>
  }

  const [users, homes] = await Promise.all([
    prisma.user.findMany({
      orderBy: { name: 'asc' },
      take: 100,
      include: { geriatricHome: true },
    }),
    prisma.geriatricHome.findMany({
      take: 100,
      include: {
        user: { select: { email: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  const teamUsers = users.filter((user) => user.role !== 'HOME_ADMIN')
  const homeAdminUsers = users.filter((user) => user.role === 'HOME_ADMIN')

  return (
    <AdminPeopleHomesTabs
      teamUsers={teamUsers}
      homeAdminUsers={homeAdminUsers}
      homes={homes}
      initialTab={defaultTab}
    />
  )
}
