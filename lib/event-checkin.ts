export function getCheckInWindowMinutes(minutes: number | null | undefined): number {
  if (typeof minutes !== 'number' || Number.isNaN(minutes)) return 120
  if (minutes < 0) return 0
  return minutes
}

export function getCheckInWindowStart(eventStart: Date, checkInWindowMinutes: number | null | undefined): Date {
  const minutes = getCheckInWindowMinutes(checkInWindowMinutes)
  return new Date(eventStart.getTime() - minutes * 60 * 1000)
}

export function isCheckInOpen(params: {
  now: Date
  eventStart: Date
  eventEnd: Date
  checkInWindowMinutes: number | null | undefined
}): boolean {
  const { now, eventStart, eventEnd, checkInWindowMinutes } = params
  const start = getCheckInWindowStart(eventStart, checkInWindowMinutes)
  return now >= start && now <= eventEnd
}

export function checkInNotOpenMessage(checkInWindowMinutes: number | null | undefined): string {
  const minutes = getCheckInWindowMinutes(checkInWindowMinutes)
  if (minutes === 0) return 'Check-in opens at the event start time'
  if (minutes < 60) return `Check-in opens ${minutes} minute${minutes === 1 ? '' : 's'} before the event`
  const hours = Math.floor(minutes / 60)
  const rem = minutes % 60
  if (rem === 0) return `Check-in opens ${hours} hour${hours === 1 ? '' : 's'} before the event`
  return `Check-in opens ${hours}h ${rem}m before the event`
}
