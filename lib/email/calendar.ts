export interface CalendarEvent {
  title: string
  description?: string
  startDateTime: Date
  endDateTime: Date
  location?: string
  url?: string
  timezone?: string
}

function formatICSDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

function escapeICSText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

export function generateICSFile(event: CalendarEvent): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Arts and Aging//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${Date.now()}-${Math.random().toString(36).substring(2)}@artsandaging.com`,
    `DTSTAMP:${formatICSDate(new Date())}`,
    `DTSTART:${formatICSDate(event.startDateTime)}`,
    `DTEND:${formatICSDate(event.endDateTime)}`,
    `SUMMARY:${escapeICSText(event.title)}`,
  ]

  if (event.description) {
    lines.push(`DESCRIPTION:${escapeICSText(event.description)}`)
  }

  if (event.location) {
    lines.push(`LOCATION:${escapeICSText(event.location)}`)
  }

  if (event.url) {
    lines.push(`URL:${escapeICSText(event.url)}`)
  }

  lines.push('END:VEVENT', 'END:VCALENDAR')

  return lines.join('\r\n')
}

export function generateICSContent(event: CalendarEvent): string {
  return generateICSFile(event)
}

export function generateGoogleCalendarUrl(event: CalendarEvent): string {
  const base = 'https://calendar.google.com/calendar/r/eventedit'
  const text = encodeURIComponent(event.title)
  const dates = `${formatICSDate(event.startDateTime)}/${formatICSDate(event.endDateTime)}`
  
  return `${base}?text=${text}&dates=${dates}`
}

export function generateOutlookUrl(event: CalendarEvent): string {
  const base = 'https://outlook.live.com/calendar/0/deeplink/compose'
  const subject = encodeURIComponent(event.title)
  const startdt = encodeURIComponent(event.startDateTime.toISOString())
  const enddt = encodeURIComponent(event.endDateTime.toISOString())
  
  return `${base}?subject=${subject}&startdt=${startdt}&enddt=${enddt}`
}

export function generateOffice365Url(event: CalendarEvent): string {
  const base = 'https://outlook.office.com/calendar/0/deeplink/compose'
  const subject = encodeURIComponent(event.title)
  const startdt = encodeURIComponent(event.startDateTime.toISOString())
  const enddt = encodeURIComponent(event.endDateTime.toISOString())
  
  return `${base}?subject=${subject}&startdt=${startdt}&enddt=${enddt}`
}

export function generateYahooCalendarUrl(event: CalendarEvent): string {
  const base = 'https://calendar.yahoo.com/'
  const title = encodeURIComponent(event.title)
  const st = formatICSDate(event.startDateTime)
  const et = formatICSDate(event.endDateTime)
  
  return `${base}?v=60&view=d&type=20&title=${title}&st=${st}&et=${et}`
}

export function generateWebcalUrl(event: CalendarEvent): string {
  const appUrl = (process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://artsandaging.com').replace(/\/$/, '')
  const params = new URLSearchParams({
    title: event.title,
    start: event.startDateTime.toISOString(),
    end: event.endDateTime.toISOString(),
  })

  if (event.description) {
    params.set('description', event.description)
  }

  if (event.location) {
    params.set('location', event.location)
  }

  if (event.url) {
    params.set('url', event.url)
  }

  return `${appUrl}/api/calendar/download?${params.toString()}`
}

export function generateGoogleMapsUrl(address: string): string {
  const query = encodeURIComponent(address)
  return `https://www.google.com/maps/search/?api=1&query=${query}`
}

export interface CalendarLinks {
  google: string
  outlook: string
  office365: string
  yahoo: string
  webcal: string
  googleMaps: string
}

export function generateCalendarLinks(event: CalendarEvent): CalendarLinks {
  return {
    google: generateGoogleCalendarUrl(event),
    outlook: generateOutlookUrl(event),
    office365: generateOffice365Url(event),
    yahoo: generateYahooCalendarUrl(event),
    webcal: generateWebcalUrl(event),
    googleMaps: event.location ? generateGoogleMapsUrl(event.location) : '',
  }
}

export function getCalendarSectionHtml(links: CalendarLinks): string {
  return `
    <div style="margin: 25px 0; padding: 20px; background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 12px;">
      <h3 style="color: #111827; margin: 0 0 10px; text-align: center; font-size: 18px; font-family: Arial, sans-serif;">Add to Calendar</h3>
      <p style="margin: 0 0 16px; color: #6b7280; font-size: 13px; text-align: center; font-family: Arial, sans-serif;">Save this event in your preferred calendar app.</p>

      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 auto 12px; max-width: 420px;">
        <tr>
          <td style="padding: 4px;" width="50%">
            <a href="${links.google}" target="_blank" rel="noopener" style="display: block; background: #1d4ed8; color: #ffffff; text-decoration: none; text-align: center; padding: 12px 14px; border-radius: 8px; font-weight: 600; font-size: 14px; font-family: Arial, sans-serif;">Google Calendar</a>
          </td>
          <td style="padding: 4px;" width="50%">
            <a href="${links.outlook}" target="_blank" rel="noopener" style="display: block; background: #0f766e; color: #ffffff; text-decoration: none; text-align: center; padding: 12px 14px; border-radius: 8px; font-weight: 600; font-size: 14px; font-family: Arial, sans-serif;">Outlook</a>
          </td>
        </tr>
      </table>

      <p style="margin: 0; text-align: center; color: #6b7280; font-size: 12px; line-height: 1.6; font-family: Arial, sans-serif;">
        Other options:
        <a href="${links.office365}" target="_blank" rel="noopener" style="color: #1d4ed8; text-decoration: underline;">Office 365</a>
        &nbsp;|&nbsp;
        <a href="${links.yahoo}" target="_blank" rel="noopener" style="color: #1d4ed8; text-decoration: underline;">Yahoo Calendar</a>
        &nbsp;|&nbsp;
        <a href="${links.webcal}" target="_blank" rel="noopener" style="color: #1d4ed8; text-decoration: underline;">Apple Calendar (.ics)</a>
      </p>
    </div>
  `
}

export function formatEventDate(date: Date, timezone?: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: timezone || 'America/St_Johns'
  })
}

export function formatEventTime(startDate: Date, endDate: Date, timezone?: string): string {
  const tz = timezone || 'America/St_Johns'
  
  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: tz
  }
  
  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: tz
  }
  
  const startTime = new Date(startDate).toLocaleTimeString('en-US', timeOptions)
  const endTime = new Date(endDate).toLocaleTimeString('en-US', timeOptions)
  
  const startDateStr = new Date(startDate).toLocaleDateString('en-US', dateOptions)
  const endDateStr = new Date(endDate).toLocaleDateString('en-US', dateOptions)
  
  const fullStart = new Date(startDate).toLocaleTimeString('en-US', { ...timeOptions, timeZoneName: 'short' })
  const tzAbbr = fullStart.split(' ').pop() || 'NDT'
  
  // If same day, just show time range
  if (startDateStr === endDateStr) {
    return `${startTime} - ${endTime} ${tzAbbr}`
  }
  
  // Different days - show full date range with times
  return `${startTime} ${startDateStr} - ${endTime} ${endDateStr}`
}

export function formatEventDateRange(startDate: Date, endDate: Date, timezone?: string): string {
  const tz = timezone || 'America/St_Johns'
  
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: tz
  }
  
  const startDateStr = new Date(startDate).toLocaleDateString('en-US', options)
  const endDateStr = new Date(endDate).toLocaleDateString('en-US', options)
  
  if (startDateStr === endDateStr) {
    return startDateStr
  }
  
  return `${startDateStr} - ${endDateStr}`
}
