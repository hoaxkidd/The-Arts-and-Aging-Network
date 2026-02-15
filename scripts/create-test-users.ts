/**
 * Script to create test users for each role
 * Run with: npx tsx scripts/create-test-users.ts
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Creating test users...')

  const password = await bcrypt.hash('password123', 10)

  const users = [
    {
      email: 'admin@test.com',
      name: 'Admin User',
      password,
      role: 'ADMIN',
      status: 'ACTIVE'
    },
    {
      email: 'payroll@test.com',
      name: 'Payroll Staff',
      password,
      role: 'PAYROLL',
      status: 'ACTIVE'
    },
    {
      email: 'homeadmin@test.com',
      name: 'Home Admin',
      password,
      role: 'HOME_ADMIN',
      status: 'ACTIVE'
    },
    {
      email: 'facilitator@test.com',
      name: 'Event Facilitator',
      password,
      role: 'FACILITATOR',
      status: 'ACTIVE'
    },
    {
      email: 'contractor@test.com',
      name: 'Contract Worker',
      password,
      role: 'CONTRACTOR',
      status: 'ACTIVE'
    },
    {
      email: 'volunteer@test.com',
      name: 'Volunteer User',
      password,
      role: 'VOLUNTEER',
      status: 'ACTIVE'
    }
  ]

  for (const userData of users) {
    const existing = await prisma.user.findUnique({
      where: { email: userData.email }
    })

    if (existing) {
      console.log(`✓ User ${userData.email} already exists`)
      continue
    }

    const user = await prisma.user.create({
      data: userData
    })

    console.log(`✓ Created ${user.role}: ${user.email}`)
  }

  console.log('\nAll test users created!')
  console.log('\nLogin credentials:')
  console.log('Email: [role]@test.com (e.g., admin@test.com)')
  console.log('Password: password123')
}

main()
  .catch((e) => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
