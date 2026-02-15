import { prisma } from "../lib/prisma"

async function main() {
  console.log('🔍 Starting Notification Debug Script')

  // 1. Check Users
  console.log('\n1. Checking Users...')
  const users = await prisma.user.findMany({
    select: { id: true, name: true, role: true, email: true, notificationPreferences: true }
  })
  
  console.log(`Found ${users.length} total users:`)
  users.forEach(u => {
    console.log(` - ${u.name} (${u.email}) | Role: ${u.role} | Prefs: ${u.notificationPreferences}`)
  })

  // 2. Check Recipients Query
  console.log('\n2. Testing Recipient Query...')
  const recipients = await prisma.user.findMany({
    where: {
      role: { in: ['PAYROLL', 'ADMIN'] }
    },
    select: { id: true, email: true, name: true }
  })
  console.log(`Query matched ${recipients.length} recipients:`)
  recipients.forEach(r => console.log(` - ${r.name} (${r.email})`))

  if (recipients.length === 0) {
    console.error('❌ NO RECIPIENTS FOUND! This is why notifications are failing.')
    return
  }

  // 3. Simulating Notification Creation (EVENT_CREATED)
  console.log('\n3. Simulating Notification Creation (EVENT_CREATED)...')
  const testEvent = {
    id: 'test-event-id-created',
    title: 'Debug Created Event',
    startDateTime: new Date(),
    location: { name: 'Test Location' }
  }

  try {
    const notifications = recipients.map(staff => ({
      userId: staff.id,
      type: 'EVENT_CREATED',
      title: 'Debug Notification',
      message: `Test message for ${testEvent.title}`,
      link: `/events/${testEvent.id}`,
      read: false,
    }))

    console.log(`Attempting to create ${notifications.length} notifications...`)
    const result = await prisma.notification.createMany({
      data: notifications
    })
    console.log(`✅ Success! Created ${result.count} notifications.`)
  } catch (e) {
    console.error('❌ Failed to create notifications:', e)
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect()
  })
