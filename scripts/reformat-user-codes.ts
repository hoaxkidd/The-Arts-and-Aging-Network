import { PrismaClient } from '@prisma/client'
import { ensureUserCode } from '../lib/user-code'

const prisma = new PrismaClient()

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  })

  if (users.length === 0) {
    console.log('No users found.')
    return
  }

  await prisma.user.updateMany({ data: { userCode: null } })

  let assigned = 0
  for (const user of users) {
    const userCode = await ensureUserCode(prisma, user.id, user.name)
    assigned++
    console.log(`Reassigned ${userCode} -> ${user.email || user.id}`)
  }

  const duplicateCodes = await prisma.user.groupBy({
    by: ['userCode'],
    where: { userCode: { not: null } },
    _count: { userCode: true },
    having: {
      userCode: {
        _count: { gt: 1 },
      },
    },
  })

  if (duplicateCodes.length > 0) {
    throw new Error(`Duplicate userCode values detected: ${duplicateCodes.map((d) => d.userCode).join(', ')}`)
  }

  console.log(`Done. Reassigned ${assigned} user codes.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
