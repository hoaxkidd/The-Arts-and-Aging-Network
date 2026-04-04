import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'
import { createUserWithGeneratedCode } from '../lib/user-code'

const prisma = new PrismaClient()

const TEST_PASSWORD = 'TestPass123!'

type QaUserConfig = {
  email: string
  name: string
  primaryRole: string
  secondaryRoles: string[]
}

const QA_USERS: QaUserConfig[] = [
  {
    email: 'facvol@artsandaging.com',
    name: 'QA Fac Volunteer',
    primaryRole: 'FACILITATOR',
    secondaryRoles: ['VOLUNTEER'],
  },
  {
    email: 'payvol@artsandaging.com',
    name: 'QA Payroll Volunteer',
    primaryRole: 'PAYROLL',
    secondaryRoles: ['VOLUNTEER'],
  },
  {
    email: 'boardonly@artsandaging.com',
    name: 'QA Board Only',
    primaryRole: 'BOARD',
    secondaryRoles: [],
  },
]

function ensureBoardExclusivity(primaryRole: string, secondaryRoles: string[]) {
  const all = [primaryRole, ...secondaryRoles]
  if (all.includes('BOARD') && all.length > 1) {
    throw new Error('BOARD role is exclusive and cannot be merged with other roles')
  }
}

async function upsertQaUser(config: QaUserConfig, hashedPassword: string) {
  ensureBoardExclusivity(config.primaryRole, config.secondaryRoles)
  const allRoles = [config.primaryRole, ...config.secondaryRoles]

  let user = await prisma.user.findUnique({ where: { email: config.email } })

  if (!user) {
    user = await createUserWithGeneratedCode(prisma, {
      email: config.email,
      name: config.name,
      password: hashedPassword,
      role: config.primaryRole,
      status: 'ACTIVE',
      volunteerReviewStatus: allRoles.includes('VOLUNTEER') ? 'APPROVED' : null,
      roleData: '{}',
    })
    console.log(`Created user: ${config.email}`)
  } else {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: config.name,
        role: config.primaryRole,
        status: 'ACTIVE',
        password: hashedPassword,
        volunteerReviewStatus: allRoles.includes('VOLUNTEER') ? 'APPROVED' : user.volunteerReviewStatus,
      },
    })
    console.log(`Updated user: ${config.email}`)
  }

  await prisma.$transaction(async (tx) => {
    const existing = await tx.userRoleAssignment.findMany({
      where: { userId: user.id },
      select: { id: true, role: true },
    })

    const targetSet = new Set(allRoles)

    for (const role of allRoles) {
      await tx.userRoleAssignment.upsert({
        where: {
          userId_role: {
            userId: user.id,
            role,
          },
        },
        create: {
          userId: user.id,
          role,
          isPrimary: role === config.primaryRole,
          isActive: true,
        },
        update: {
          isPrimary: role === config.primaryRole,
          isActive: true,
        },
      })
    }

    const toDeactivate = existing.filter((assignment) => !targetSet.has(assignment.role)).map((assignment) => assignment.id)
    if (toDeactivate.length > 0) {
      await tx.userRoleAssignment.updateMany({
        where: { id: { in: toDeactivate } },
        data: { isActive: false, isPrimary: false },
      })
    }
  })

  const assignments = await prisma.userRoleAssignment.findMany({
    where: { userId: user.id, isActive: true },
    orderBy: [{ isPrimary: 'desc' }, { assignedAt: 'asc' }],
    select: { role: true, isPrimary: true },
  })

  console.log(`Roles for ${config.email}: ${assignments.map((a) => `${a.role}${a.isPrimary ? ' (primary)' : ''}`).join(', ')}`)
}

async function main() {
  const hashedPassword = await hash(TEST_PASSWORD, 12)

  console.log('Applying non-destructive QA role-matrix seed...')
  for (const config of QA_USERS) {
    await upsertQaUser(config, hashedPassword)
  }

  console.log('\nDone. QA role-matrix users are ready.')
  console.log('Password for all QA users:', TEST_PASSWORD)
}

main()
  .catch((error) => {
    console.error('qa-seed-role-matrix failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
