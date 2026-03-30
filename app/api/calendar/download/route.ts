import { generateICSFile } from '@/lib/email/calendar'

function isValidDate(value: string | null): value is string {
  if (!value) return false
  return !Number.isNaN(new Date(value).getTime())
}

function sanitizeFilename(input: string): string {
  const cleaned = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return cleaned || 'event'
}

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url)

  const title = searchParams.get('title')?.trim() || 'Event'
  const start = searchParams.get('start')
  const end = searchParams.get('end')

  if (!isValidDate(start) || !isValidDate(end)) {
    return new Response('Invalid start or end date', { status: 400 })
  }

  const startDateTime = new Date(start)
  const endDateTime = new Date(end)

  if (endDateTime <= startDateTime) {
    return new Response('End date must be after start date', { status: 400 })
  }

  const description = searchParams.get('description')?.trim() || undefined
  const location = searchParams.get('location')?.trim() || undefined
  const url = searchParams.get('url')?.trim() || undefined

  const ics = generateICSFile({
    title,
    description,
    startDateTime,
    endDateTime,
    location,
    url,
  })

  const filename = `${sanitizeFilename(title)}.ics`

  return new Response(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `inline; filename="${filename}"`,
      'Cache-Control': 'public, max-age=300',
    },
  })
}
