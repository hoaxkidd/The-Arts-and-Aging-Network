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

async function assignRoles(
  prismaClient: PrismaClient,
  userId: string,
  primaryRole: string,
  secondaryRoles: string[] = []
) {
  await prismaClient.userRoleAssignment.deleteMany({ where: { userId } })

  await prismaClient.userRoleAssignment.create({
    data: {
      userId,
      role: primaryRole,
      isPrimary: true,
      isActive: true,
    },
  })

  for (const role of secondaryRoles) {
    await prismaClient.userRoleAssignment.create({
      data: {
        userId,
        role,
        isPrimary: false,
        isActive: true,
      },
    })
  }
}

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
  await assignRoles(prisma, admin.id, 'ADMIN')
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
  await assignRoles(prisma, homeAdminUser.id, 'HOME_ADMIN')

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
  await assignRoles(prisma, facilitator.id, 'FACILITATOR')
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
  await assignRoles(prisma, payroll.id, 'PAYROLL')
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
  await assignRoles(prisma, volunteer.id, 'VOLUNTEER')
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
  await assignRoles(prisma, board.id, 'BOARD')
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
  await assignRoles(prisma, partner.id, 'PARTNER')
  console.log('Created:', partner.email, '(PARTNER)')

  // 8. Facilitator + Volunteer (primary facilitator)
  const facilitatorVolunteer = await createUserWithGeneratedCode(prisma, {
    email: 'facvol@artsandaging.com',
    name: 'Test Fac Volunteer',
    password,
    role: 'FACILITATOR',
    status: 'ACTIVE',
    volunteerReviewStatus: 'APPROVED',
    roleData: '{}',
  })
  await assignRoles(prisma, facilitatorVolunteer.id, 'FACILITATOR', ['VOLUNTEER'])
  console.log('Created:', facilitatorVolunteer.email, '(FACILITATOR primary + VOLUNTEER secondary)')

  // 9. Payroll + Volunteer (primary payroll)
  const payrollVolunteer = await createUserWithGeneratedCode(prisma, {
    email: 'payvol@artsandaging.com',
    name: 'Test Payroll Volunteer',
    password,
    role: 'PAYROLL',
    status: 'ACTIVE',
    volunteerReviewStatus: 'APPROVED',
    roleData: '{}',
  })
  await assignRoles(prisma, payrollVolunteer.id, 'PAYROLL', ['VOLUNTEER'])
  console.log('Created:', payrollVolunteer.email, '(PAYROLL primary + VOLUNTEER secondary)')

  // 10. Board-only dedicated QA account
  const boardOnly = await createUserWithGeneratedCode(prisma, {
    email: 'boardonly@artsandaging.com',
    name: 'Test Board Only',
    password,
    role: 'BOARD',
    status: 'ACTIVE',
    roleData: '{}',
  })
  await assignRoles(prisma, boardOnly.id, 'BOARD')
  console.log('Created:', boardOnly.email, '(BOARD only)')

  console.log('\n--- Test logins (password for all: ' + TEST_PASSWORD + ') ---')
  console.log('  Admin:       admin@artsandaging.com')
  console.log('  Home Admin:  home@artsandaging.com')
  console.log('  Facilitator:  staff@artsandaging.com')
  console.log('  Payroll:     payroll@artsandaging.com')
  console.log('  Volunteer:   volunteer@artsandaging.com')
  console.log('  Board:       board@artsandaging.com')
  console.log('  Partner:     partner@artsandaging.com')
  console.log('  Fac+Vol:     facvol@artsandaging.com (primary FACILITATOR)')
  console.log('  Pay+Vol:     payvol@artsandaging.com (primary PAYROLL)')
  console.log('  Board Only:  boardonly@artsandaging.com')
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
