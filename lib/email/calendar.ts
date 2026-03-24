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
  const icsContent = generateICSFile(event)
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(icsContent)}`
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
    <div style="margin: 25px 0; padding: 20px; background: #f9fafb; border-radius: 12px;">
      <h3 style="color: #111827; margin: 0 0 15px; text-align: center; font-size: 18px; font-family: Arial, sans-serif;">Add to Your Calendar</h3>
      
      <div style="text-align: center; margin: 0 0 15px;">
        <a href="${links.google}" target="_blank" rel="noopener" style="display: inline-block; background: #4285f4; color: white; text-decoration: none; padding: 12px 20px; border-radius: 6px; font-weight: 500; margin: 5px; font-size: 14px; font-family: Arial, sans-serif;">Google Calendar</a>
        <a href="${links.outlook}" target="_blank" rel="noopener" style="display: inline-block; background: #0078d4; color: white; text-decoration: none; padding: 12px 20px; border-radius: 6px; font-weight: 500; margin: 5px; font-size: 14px; font-family: Arial, sans-serif;">Outlook</a>
        <a href="${links.office365}" target="_blank" rel="noopener" style="display: inline-block; background: #0078d4; color: white; text-decoration: none; padding: 12px 20px; border-radius: 6px; font-weight: 500; margin: 5px; font-size: 14px; font-family: Arial, sans-serif;">Office 365</a>
        <a href="${links.yahoo}" target="_blank" rel="noopener" style="display: inline-block; background: #6001d2; color: white; text-decoration: none; padding: 12px 20px; border-radius: 6px; font-weight: 500; margin: 5px; font-size: 14px; font-family: Arial, sans-serif;">Yahoo</a>
        <a href="${links.webcal}" download="event.ics" style="display: inline-block; background: #6b7280; color: white; text-decoration: none; padding: 12px 20px; border-radius: 6px; font-weight: 500; margin: 5px; font-size: 14px; font-family: Arial, sans-serif;">Apple Calendar</a>
      </div>
      
      <p style="margin: 0; color: #6b7280; font-size: 12px; text-align: center; font-family: Arial, sans-serif;">
        Click a button above to add this event to your calendar
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
