'use server'

import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { vapidPublicKey } from '@/lib/push-notifications'
import { logger } from '@/lib/logger'

export async function GET() {
  return NextResponse.json({ 
    publicKey: vapidPublicKey 
  })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { endpoint, keys } = body

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
    }

    await prisma.pushSubscription.upsert({
      where: {
        endpoint
      },
      create: {
        userId: session.user.id,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth
      },
      update: {
        userId: session.user.id,
        p256dh: keys.p256dh,
        auth: keys.auth
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.serverAction('Push subscription error:', error)
    return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { endpoint } = body

    if (!endpoint) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    await prisma.pushSubscription.deleteMany({
      where: {
        endpoint,
        userId: session.user.id
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.serverAction('Push unsubscription error:', error)
    return NextResponse.json({ error: 'Failed to unsubscribe' }, { status: 500 })
  }
}
