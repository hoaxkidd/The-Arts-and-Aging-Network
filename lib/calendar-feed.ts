import { createHmac, timingSafeEqual } from 'crypto'

function getFeedSecret(): string | null {
  const secret = process.env.CALENDAR_FEED_SECRET || process.env.NEXTAUTH_SECRET || ''
  return secret.trim() || null
}

function toSafeBuffer(value: string): Buffer {
  return Buffer.from(value, 'utf8')
}

export function generateCalendarFeedToken(userId: string): string | null {
  const secret = getFeedSecret()
  if (!secret) return null
  return createHmac('sha256', secret).update(`calendar-feed:${userId}`).digest('hex')
}

export function verifyCalendarFeedToken(userId: string, token: string): boolean {
  const expected = generateCalendarFeedToken(userId)
  if (!expected || !token) return false

  try {
    const expectedBuffer = toSafeBuffer(expected)
    const providedBuffer = toSafeBuffer(token)
    if (expectedBuffer.length !== providedBuffer.length) return false
    return timingSafeEqual(expectedBuffer, providedBuffer)
  } catch {
    return false
  }
}

export function getCalendarFeedUrl(userId: string): string | null {
  const token = generateCalendarFeedToken(userId)
  if (!token) return null

  const appUrl = (process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || '').trim()
  if (!appUrl) return null

  const base = appUrl.replace(/\/$/, '')
  return `${base}/api/calendar/feed?u=${encodeURIComponent(userId)}&t=${encodeURIComponent(token)}`
}
