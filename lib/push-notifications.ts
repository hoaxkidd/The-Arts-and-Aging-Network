import webpush from 'web-push'

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || ''
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@example.com'

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    vapidSubject,
    vapidPublicKey,
    vapidPrivateKey
  )
}

export async function sendPushNotification(
  subscription: PushSubscriptionJSON,
  title: string,
  body: string,
  icon?: string,
  tag?: string
) {
  if (!vapidPublicKey || !vapidPrivateKey) {
    console.warn('VAPID keys not configured, skipping push notification')
    return { success: false, error: 'Push notifications not configured' }
  }

  try {
    await webpush.sendNotification(
      subscription as any,
      JSON.stringify({
        title,
        body,
        icon: icon || '/icon-192.png',
        tag,
        badge: '/icon-192.png',
        data: {
          url: '/staff/inbox'
        }
      })
    )
    return { success: true }
  } catch (error) {
    console.error('Push notification error:', error)
    return { success: false, error: 'Failed to send notification' }
  }
}

export async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  icon?: string
) {
  const { prisma } = await import('@/lib/prisma')
  
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId }
  })

  if (subscriptions.length === 0) {
    return { success: false, error: 'No subscriptions' }
  }

  const results = []
  for (const sub of subscriptions) {
    const subscription: PushSubscriptionJSON = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dh,
        auth: sub.auth
      }
    }
    
    const result = await sendPushNotification(subscription, title, body, icon)
    results.push(result)
    
    if (!result.success) {
      await prisma.pushSubscription.delete({
        where: { id: sub.id }
      })
    }
  }

  return { success: true, sent: results.filter(r => r.success).length }
}

export { vapidPublicKey }
