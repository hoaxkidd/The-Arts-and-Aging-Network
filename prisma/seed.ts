import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'
import dotenv from 'dotenv'
import path from 'path'

// Load .env.local first (Neon/Prod URLs), then .env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
dotenv.config()

const prisma = new PrismaClient()

const TEST_PASSWORD = 'TestPass123!' // Same for all test accounts; change in production

async function main() {
  const password = await hash(TEST_PASSWORD, 12)

  // 1. Admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@artsandaging.com' },
    update: {},
    create: {
      email: 'admin@artsandaging.com',
      name: 'Super Admin',
      password,
      role: 'ADMIN',
      status: 'ACTIVE',
      bio: 'System Administrator',
      roleData: '{}'
    }
  })
  console.log('Created/updated:', admin.email, '(ADMIN)')

  // 2. Home Admin (facility) – for testing dashboard, events, requests
  const homeAdminUser = await prisma.user.upsert({
    where: { email: 'home@artsandaging.com' },
    update: {},
    create: {
      email: 'home@artsandaging.com',
      name: 'Test Home Admin',
      password,
      role: 'HOME_ADMIN',
      status: 'ACTIVE',
      phone: '555-0100',
      roleData: '{}'
    }
  })

  // Create a GeriatricHome for the home admin if they don't have one
  const existingHome = await prisma.geriatricHome.findUnique({
    where: { userId: homeAdminUser.id }
  })
  if (!existingHome) {
    await prisma.geriatricHome.create({
      data: {
        name: 'Test Care Home',
        address: '123 Test St, Winnipeg, MB',
        residentCount: 0,
        maxCapacity: 20,
        contactName: 'Test Home Admin',
        contactEmail: 'home@artsandaging.com',
        contactPhone: '555-0100',
        contactPosition: 'Facility Manager',
        userId: homeAdminUser.id
      }
    })
    console.log('Created GeriatricHome for:', homeAdminUser.email)
  }
  console.log('Created/updated:', homeAdminUser.email, '(HOME_ADMIN)')

  // 3. Facilitator (staff) – for testing staff events, schedule
  const facilitator = await prisma.user.upsert({
    where: { email: 'staff@artsandaging.com' },
    update: {},
    create: {
      email: 'staff@artsandaging.com',
      name: 'Test Facilitator',
      password,
      role: 'FACILITATOR',
      status: 'ACTIVE',
      roleData: '{}'
    }
  })
  console.log('Created/updated:', facilitator.email, '(FACILITATOR)')

  console.log('\n--- Test logins (password for all: ' + TEST_PASSWORD + ') ---')
  console.log('  Admin:       admin@artsandaging.com')
  console.log('  Home Admin: home@artsandaging.com')
  console.log('  Staff:      staff@artsandaging.com')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
