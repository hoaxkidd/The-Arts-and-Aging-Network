import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function addDays(base: Date, days: number) {
  const date = new Date(base)
  date.setDate(date.getDate() + days)
  return date
}

async function main() {
  const now = new Date()

  const admin = await prisma.user.upsert({
    where: { email: 'sample.admin@artsandaging.local' },
    update: { name: 'Sample Admin', role: 'ADMIN' },
    create: {
      name: 'Sample Admin',
      email: 'sample.admin@artsandaging.local',
      role: 'ADMIN',
      status: 'ACTIVE',
    },
    select: { id: true },
  })

  const homeAdmin = await prisma.user.upsert({
    where: { email: 'sample.homeadmin@artsandaging.local' },
    update: { name: 'Sample Home Admin', role: 'HOME_ADMIN' },
    create: {
      name: 'Sample Home Admin',
      email: 'sample.homeadmin@artsandaging.local',
      role: 'HOME_ADMIN',
      status: 'ACTIVE',
    },
    select: { id: true },
  })

  const staff = await prisma.user.upsert({
    where: { email: 'sample.staff@artsandaging.local' },
    update: { name: 'Sample Staff', role: 'FACILITATOR' },
    create: {
      name: 'Sample Staff',
      email: 'sample.staff@artsandaging.local',
      role: 'FACILITATOR',
      status: 'ACTIVE',
    },
    select: { id: true },
  })

  const volunteer = await prisma.user.upsert({
    where: { email: 'sample.volunteer@artsandaging.local' },
    update: { name: 'Sample Volunteer', role: 'VOLUNTEER' },
    create: {
      name: 'Sample Volunteer',
      email: 'sample.volunteer@artsandaging.local',
      role: 'VOLUNTEER',
      status: 'ACTIVE',
    },
    select: { id: true },
  })

  const location = await prisma.location.upsert({
    where: { id: 'sample-location-reminders-broadcasts' },
    update: {
      name: '[SAMPLE] Arts & Aging Studio',
      address: '123 Sample St, Toronto, ON',
    },
    create: {
      id: 'sample-location-reminders-broadcasts',
      name: '[SAMPLE] Arts & Aging Studio',
      address: '123 Sample St, Toronto, ON',
      type: 'HOME',
    },
    select: { id: true },
  })

  const eventA = await prisma.event.upsert({
    where: { id: 'sample-event-reminders-a' },
    update: {
      title: '[SAMPLE] Chair Yoga Morning Session',
      startDateTime: addDays(now, 8),
      endDateTime: addDays(now, 8),
      status: 'PUBLISHED',
    },
    create: {
      id: 'sample-event-reminders-a',
      title: '[SAMPLE] Chair Yoga Morning Session',
      description: 'Sample event for reminder workflow testing.',
      startDateTime: addDays(now, 8),
      endDateTime: addDays(now, 8),
      locationId: location.id,
      status: 'PUBLISHED',
    },
    select: { id: true },
  })

  const eventB = await prisma.event.upsert({
    where: { id: 'sample-event-reminders-b' },
    update: {
      title: '[SAMPLE] Memory Lane Storytelling',
      startDateTime: addDays(now, 4),
      endDateTime: addDays(now, 4),
      status: 'PUBLISHED',
    },
    create: {
      id: 'sample-event-reminders-b',
      title: '[SAMPLE] Memory Lane Storytelling',
      description: 'Sample event for reminder workflow testing.',
      startDateTime: addDays(now, 4),
      endDateTime: addDays(now, 4),
      locationId: location.id,
      status: 'PUBLISHED',
    },
    select: { id: true },
  })

  await prisma.emailReminder.deleteMany({
    where: { reminderType: { startsWith: 'SAMPLE_' } },
  })

  const reminders = [
    { eventId: eventA.id, recipientType: 'HOME_ADMIN', recipientId: homeAdmin.id, reminderType: 'SAMPLE_HOME_7D', status: 'PENDING', scheduledFor: addDays(now, 1), sentAt: null, error: null },
    { eventId: eventA.id, recipientType: 'HOME_ADMIN', recipientId: homeAdmin.id, reminderType: 'SAMPLE_HOME_5D', status: 'SENT', scheduledFor: addDays(now, -1), sentAt: addDays(now, -1), error: null },
    { eventId: eventA.id, recipientType: 'STAFF', recipientId: staff.id, reminderType: 'SAMPLE_STAFF_3D', status: 'FAILED', scheduledFor: addDays(now, -2), sentAt: null, error: 'Mailbox temporarily unavailable' },
    { eventId: eventA.id, recipientType: 'STAFF', recipientId: staff.id, reminderType: 'SAMPLE_STAFF_1D', status: 'PENDING', scheduledFor: addDays(now, 2), sentAt: null, error: null },
    { eventId: eventB.id, recipientType: 'HOME_ADMIN', recipientId: homeAdmin.id, reminderType: 'SAMPLE_HOME_2D', status: 'CANCELLED', scheduledFor: addDays(now, 1), sentAt: null, error: null },
    { eventId: eventB.id, recipientType: 'STAFF', recipientId: volunteer.id, reminderType: 'SAMPLE_STAFF_2D', status: 'PENDING', scheduledFor: addDays(now, 1), sentAt: null, error: null },
    { eventId: eventB.id, recipientType: 'STAFF', recipientId: volunteer.id, reminderType: 'SAMPLE_STAFF_0D', status: 'FAILED', scheduledFor: addDays(now, 0), sentAt: null, error: 'SMTP timeout' },
  ]

  await prisma.emailReminder.createMany({ data: reminders })

  const sampleBroadcasts = await prisma.broadcastMessage.findMany({
    where: { title: { startsWith: '[SAMPLE]' } },
    select: { id: true },
  })

  if (sampleBroadcasts.length > 0) {
    const ids = sampleBroadcasts.map((broadcast) => broadcast.id)
    await prisma.broadcastRecipient.deleteMany({ where: { broadcastId: { in: ids } } })
    await prisma.broadcastMessage.deleteMany({ where: { id: { in: ids } } })
  }

  const broadcastFixtures: Array<{
    title: string
    content: string
    status: string
    targetRoles: string
    recipients: string[]
    sentAt?: Date
  }> = [
    {
      title: '[SAMPLE] Volunteer Orientation Update',
      content: 'Please review the updated orientation timeline before Friday.',
      status: 'PENDING',
      targetRoles: 'VOLUNTEER,FACILITATOR',
      recipients: [volunteer.id, staff.id],
    },
    {
      title: '[SAMPLE] Board Packet Reminder',
      content: 'Board packet is available. Please review ahead of the meeting.',
      status: 'PENDING_BOARD_APPROVAL',
      targetRoles: 'BOARD',
      recipients: [admin.id],
    },
    {
      title: '[SAMPLE] Program Highlights Newsletter',
      content: 'Highlights from this month\'s intergenerational programming are now posted.',
      status: 'SENT',
      targetRoles: 'HOME_ADMIN,STAFF,VOLUNTEER',
      recipients: [homeAdmin.id, staff.id, volunteer.id],
      sentAt: addDays(now, -1),
    },
    {
      title: '[SAMPLE] Transport Advisory',
      content: 'Transit delays may affect arrival windows tomorrow morning.',
      status: 'FAILED',
      targetRoles: 'HOME_ADMIN,FACILITATOR',
      recipients: [homeAdmin.id, staff.id],
    },
  ]

  for (const fixture of broadcastFixtures) {
    const broadcast = await prisma.broadcastMessage.create({
      data: {
        senderId: admin.id,
        title: fixture.title,
        content: fixture.content,
        targetRoles: fixture.targetRoles,
        status: fixture.status,
        sentAt: fixture.sentAt ?? null,
      },
      select: { id: true },
    })

    await prisma.broadcastRecipient.createMany({
      data: fixture.recipients.map((userId) => ({
        broadcastId: broadcast.id,
        userId,
        status: fixture.status === 'SENT' ? 'SENT' : fixture.status === 'PENDING_BOARD_APPROVAL' ? 'PENDING_BOARD_APPROVAL' : 'PENDING',
      })),
      skipDuplicates: true,
    })
  }

  console.log('Sample broadcasts and reminders created successfully.')
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
