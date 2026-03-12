import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'
import dotenv from 'dotenv'
import path from 'path'
import { createUserWithGeneratedCode } from '../lib/user-code'

// Load .env.local first (Neon/Prod URLs), then .env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
dotenv.config()

// Use direct (unpooled) URL for seed so Neon scale-to-zero can wake; allow 30s connect timeout
const rawUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || process.env.STORAGE_URL_UNPOOLED || process.env.STORAGE_URL || ''
const separator = rawUrl.includes('?') ? '&' : '?'
const urlWithTimeout = `${rawUrl}${separator}connect_timeout=30`
const prisma = new PrismaClient(
  rawUrl ? { datasources: { db: { url: urlWithTimeout } } } : undefined
)

const TEST_PASSWORD = 'TestPass123!' // Same for all test accounts

async function main() {
  console.log('Resetting users and creating fresh test profiles...\n')

  // Delete in order to respect foreign key constraints
  await prisma.$transaction(async (tx) => {
    // 1. Records that reference EventRequest
    await tx.eventRequestResponse.deleteMany({})
    await tx.formSubmission.deleteMany({})
    await tx.eventRequest.deleteMany({})

    // 2. Unlink events from homes and form templates, then delete
    await tx.event.updateMany({ data: { geriatricHomeId: null, requiredFormTemplateId: null } })
    await tx.formTemplate.deleteMany({})
    await tx.geriatricHome.deleteMany({})

    // 3. User-dependent records
    await tx.eventAttendance.deleteMany({})
    await tx.eventComment.deleteMany({})
    await tx.eventPhoto.deleteMany({})
    await tx.eventReaction.deleteMany({})
    await tx.notification.deleteMany({})
    await tx.document.deleteMany({})
    await tx.auditLog.deleteMany({})
    await tx.directMessage.deleteMany({})
    await tx.directMessageRequest.deleteMany({})
    await tx.invitation.deleteMany({})
    await tx.messageReaction.deleteMany({})
    await tx.groupMessage.deleteMany({})
    await tx.groupMember.deleteMany({})
    await tx.messageGroup.deleteMany({})
    await tx.meetingRequest.deleteMany({})
    await tx.phoneRequest.deleteMany({})
    await tx.testimonial.deleteMany({})
    await tx.workLog.deleteMany({})
    await tx.mileageEntry.deleteMany({})
    await tx.expenseRequest.deleteMany({})
    await tx.timesheetEntry.deleteMany({})
    await tx.timesheet.deleteMany({})
    await tx.inventoryTransaction.deleteMany({})
    await tx.timeEntry.deleteMany({})

    // 4. Delete all users
    await tx.user.deleteMany({})
  })

  console.log('Deleted all existing users and related data.\n')

  const password = await hash(TEST_PASSWORD, 12)

  // 1. Admin
  const admin = await createUserWithGeneratedCode(prisma, {
    email: 'admin@artsandaging.com',
    name: 'Super Admin',
    password,
    role: 'ADMIN',
    status: 'ACTIVE',
    bio: 'System Administrator',
    roleData: '{}',
  })
  console.log('Created:', admin.email, '(ADMIN)')

  // 2. Home Admin
  const homeAdminUser = await createUserWithGeneratedCode(prisma, {
    email: 'home@artsandaging.com',
    name: 'Test Home Admin',
    password,
    role: 'HOME_ADMIN',
    status: 'ACTIVE',
    phone: '555-0100',
    roleData: '{}',
  })

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
      userId: homeAdminUser.id,
    },
  })
  console.log('Created:', homeAdminUser.email, '(HOME_ADMIN) + GeriatricHome')

  // 3. Staff / Facilitator
  const facilitator = await createUserWithGeneratedCode(prisma, {
    email: 'staff@artsandaging.com',
    name: 'Test Facilitator',
    password,
    role: 'FACILITATOR',
    status: 'ACTIVE',
    roleData: '{}',
  })
  console.log('Created:', facilitator.email, '(FACILITATOR)')

  // 4. Payroll
  const payroll = await createUserWithGeneratedCode(prisma, {
    email: 'payroll@artsandaging.com',
    name: 'Test Payroll',
    password,
    role: 'PAYROLL',
    status: 'ACTIVE',
    roleData: '{}',
  })
  console.log('Created:', payroll.email, '(PAYROLL)')

  // 5. Volunteer
  const volunteer = await createUserWithGeneratedCode(prisma, {
    email: 'volunteer@artsandaging.com',
    name: 'Test Volunteer',
    password,
    role: 'VOLUNTEER',
    status: 'ACTIVE',
    roleData: '{}',
  })
  console.log('Created:', volunteer.email, '(VOLUNTEER)')

  // 6. Board Member
  const board = await createUserWithGeneratedCode(prisma, {
    email: 'board@artsandaging.com',
    name: 'Test Board Member',
    password,
    role: 'BOARD',
    status: 'ACTIVE',
    roleData: '{}',
  })
  console.log('Created:', board.email, '(BOARD)')

  // 7. Community Partner
  const partner = await createUserWithGeneratedCode(prisma, {
    email: 'partner@artsandaging.com',
    name: 'Test Partner',
    password,
    role: 'PARTNER',
    status: 'ACTIVE',
    roleData: '{}',
  })
  console.log('Created:', partner.email, '(PARTNER)')

  console.log('\n--- Test logins (password for all: ' + TEST_PASSWORD + ') ---')
  console.log('  Admin:       admin@artsandaging.com')
  console.log('  Home Admin:  home@artsandaging.com')
  console.log('  Facilitator:  staff@artsandaging.com')
  console.log('  Payroll:     payroll@artsandaging.com')
  console.log('  Volunteer:   volunteer@artsandaging.com')
  console.log('  Board:       board@artsandaging.com')
  console.log('  Partner:     partner@artsandaging.com')
  console.log('\nTo use on Vercel: ensure DATABASE_URL (and DATABASE_URL_UNPOOLED) are set, then run: npm run db:seed')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('Seed error:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
