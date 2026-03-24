'use server'

import { prisma } from '@/lib/prisma'
import { sendEmailWithRetry } from '@/lib/email/service'
import { logger } from '@/lib/logger'
import { formatDateLong, formatTime } from '@/lib/date-utils'

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000)
}

function formatEventTime(startDate: Date, endDate: Date): string {
  return `${formatTime(startDate)} - ${formatTime(endDate)}`
}

const APP_URL = process.env.NEXTAUTH_URL || 'https://artsandaging.com'

export interface FeedbackEmailResult {
  eventId: string
  eventTitle: string
  sent: number
  failed: number
  errors: string[]
}

export async function sendFeedbackRequests(hoursAfterEvent: number = 1): Promise<{
  success: boolean
  results: FeedbackEmailResult[]
  totalSent: number
  totalFailed: number
}> {
  const results: FeedbackEmailResult[] = []
  let totalSent = 0
  let totalFailed = 0

  const now = new Date()

  const eventsEndedWithinWindow = await prisma.event.findMany({
    where: {
      status: 'PUBLISHED',
      endDateTime: {
        lte: addHours(now, -hoursAfterEvent + 1),
        gt: addHours(now, -hoursAfterEvent - 1),
      },
    },
    include: {
      location: {
        select: {
          name: true,
          address: true,
        },
      },
      geriatricHome: {
        select: {
          feedbackFormUrl: true,
        },
      },
      attendances: {
        where: {
          status: 'ATTENDING',
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
  })

  for (const event of eventsEndedWithinWindow) {
    const result: FeedbackEmailResult = {
      eventId: event.id,
      eventTitle: event.title,
      sent: 0,
      failed: 0,
      errors: [],
    }

    const feedbackUrl = event.geriatricHome?.feedbackFormUrl || `${APP_URL}/events/${event.id}/feedback`
    const eventDate = formatDateLong(event.startDateTime)
    const eventTime = formatEventTime(event.startDateTime, event.endDateTime)
    const eventLink = `${APP_URL}/events/${event.id}`

    for (const attendance of event.attendances) {
      const user = attendance.user

      if (!user.email) {
        result.failed++
        result.errors.push(`No email for user ${user.id}`)
        continue
      }

      try {
        await sendEmailWithRetry(
          {
            to: user.email,
            templateType: 'FEEDBACK_REQUEST',
            variables: {
              name: user.name || 'Participant',
              eventTitle: event.title,
              eventDate,
              eventDateISO: event.startDateTime.toISOString().split('T')[0],
              eventTime,
              eventTimeISO: event.startDateTime.toTimeString().slice(0, 5),
              eventLocation: event.location?.name || 'TBD',
              eventLink,
              feedbackUrl,
              appUrl: APP_URL,
              appUrlDisplay: APP_URL.replace(/^https?:\/\//, ''),
              supportEmail: 'info@artsandaging.com',
            },
          },
          { userId: user.id }
        )

        result.sent++
      } catch (error) {
        result.failed++
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        result.errors.push(`Failed to send to ${user.email}: ${errorMsg}`)
        logger.serverAction(`sendFeedbackRequests error for ${user.email}`, error)
      }
    }

    totalSent += result.sent
    totalFailed += result.failed
    results.push(result)
  }

  return {
    success: totalFailed === 0,
    results,
    totalSent,
    totalFailed,
  }
}

export async function sendFeedbackForEvent(
  eventId: string,
  feedbackUrl?: string
): Promise<{ sent: number; failed: number; errors: string[] }> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      location: {
        select: {
          name: true,
          address: true,
        },
      },
      geriatricHome: {
        select: {
          feedbackFormUrl: true,
        },
      },
      attendances: {
        where: {
          status: 'ATTENDING',
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
  })

  if (!event) {
    return { sent: 0, failed: 0, errors: ['Event not found'] }
  }

  const url = feedbackUrl || event.geriatricHome?.feedbackFormUrl || `${APP_URL}/events/${event.id}/feedback`
  const eventDate = formatDateLong(event.startDateTime)
  const eventTime = formatEventTime(event.startDateTime, event.endDateTime)
  const eventLink = `${APP_URL}/events/${event.id}`

  let sent = 0
  let failed = 0
  const errors: string[] = []

  for (const attendance of event.attendances) {
    const user = attendance.user

    if (!user.email) {
      failed++
      errors.push(`No email for user ${user.id}`)
      continue
    }

    try {
      await sendEmailWithRetry(
        {
          to: user.email,
          templateType: 'FEEDBACK_REQUEST',
          variables: {
            name: user.name || 'Participant',
            eventTitle: event.title,
            eventDate,
            eventDateISO: event.startDateTime.toISOString().split('T')[0],
            eventTime,
            eventTimeISO: event.startDateTime.toTimeString().slice(0, 5),
            eventLocation: event.location?.name || 'TBD',
            eventLink,
            feedbackUrl: url,
            appUrl: APP_URL,
            appUrlDisplay: APP_URL.replace(/^https?:\/\//, ''),
            supportEmail: 'info@artsandaging.com',
          },
        },
        { userId: user.id }
      )

      sent++
    } catch (error) {
      failed++
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      errors.push(`Failed to send to ${user.email}: ${errorMsg}`)
      logger.serverAction(`sendFeedbackForEvent error for ${user.email}`, error)
    }
  }

  return { sent, failed, errors }
}
