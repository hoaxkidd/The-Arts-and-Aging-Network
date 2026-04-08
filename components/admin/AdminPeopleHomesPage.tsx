import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import AdminPeopleHomesTabs from './AdminPeopleHomesTabs'

type TabKey = 'team' | 'home-admins'

export default async function AdminPeopleHomesPage({
  defaultTab,
}: {
  defaultTab: TabKey
}) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    return <div>Unauthorized</div>
  }

  const users = await prisma.user.findMany({
    orderBy: { name: 'asc' },
    include: {
      geriatricHome: true,
      roleAssignments: {
        where: { isActive: true },
        orderBy: [{ isPrimary: 'desc' }, { assignedAt: 'asc' }],
      },
    },
  })

  const homeAdminUsers = users.filter((user) =>
    user.roleAssignments.some((assignment) => assignment.role === 'HOME_ADMIN')
  )
  const teamUsers = users.filter((user) =>
    user.roleAssignments.some((assignment) => assignment.role !== 'HOME_ADMIN')
  )

  return (
    <AdminPeopleHomesTabs
      teamUsers={teamUsers}
      homeAdminUsers={homeAdminUsers}
      initialTab={defaultTab}
    />
  )
}
