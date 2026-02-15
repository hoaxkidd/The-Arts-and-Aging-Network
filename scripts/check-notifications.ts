import { prisma } from "../lib/prisma"

async function main() {
  console.log('🔍 Checking Latest Notifications...')

  const notifications = await prisma.notification.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' }
  })

  if (notifications.length === 0) {
    console.log('❌ No notifications found in the database.')
  } else {
    console.log(`✅ Found ${notifications.length} recent notifications:`)
    notifications.forEach(n => {
      console.log(`\n[${n.createdAt.toISOString()}] ${n.type} -> UserID: ${n.userId}`)
      console.log(`   Title: ${n.title}`)
      console.log(`   Message: ${n.message}`)
    })
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect()
  })
