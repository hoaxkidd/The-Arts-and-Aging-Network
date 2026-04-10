import { prisma } from '@/lib/prisma'

export async function getActiveAdminRecipientIds(): Promise<string[]> {
  const admins = await prisma.user.findMany({
    where: {
      status: 'ACTIVE',
      OR: [
        { role: 'ADMIN' },
        {
          roleAssignments: {
            some: {
              role: 'ADMIN',
              isActive: true
            }
          }
        }
      ]
    },
    select: { id: true },
    distinct: ['id']
  })

  return admins.map((user) => user.id)
}
