import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

/**
 * Server-Sent Events (SSE) stream for real-time notifications.
 * Client connects and receives notification updates every 2 seconds
 * without needing to refresh or poll manually.
 */
export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 })
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      const send = (data: { notifications: unknown[]; unreadCount: number }) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        } catch {
          // Client may have disconnected
        }
      }

      const poll = async () => {
        const notifications = await prisma.notification.findMany({
          where: { userId: session.user.id },
          orderBy: { createdAt: 'desc' },
          take: 50,
        })
        const unreadCount = notifications.filter((n) => !n.read).length
        send({
          notifications: notifications.map((n) => ({
            id: n.id,
            type: n.type,
            title: n.title,
            message: n.message,
            link: n.link,
            read: n.read,
            createdAt: n.createdAt.toISOString(),
          })),
          unreadCount,
        })
      }

      try {
        await poll()
      } catch (err) {
        console.error('Notification stream poll error:', err)
        controller.close()
        return
      }

      const interval = setInterval(async () => {
        if (request.signal.aborted) return
        try {
          await poll()
        } catch (err) {
          console.error('Notification stream poll error:', err)
          clearInterval(interval)
          controller.close()
        }
      }, 2000)

      request.signal.addEventListener('abort', () => {
        clearInterval(interval)
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}
