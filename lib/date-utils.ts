/**
 * Date and time formatting utilities
 * All functions return human-readable formats
 */

type DateInput = Date | string | null | undefined

/**
 * Format date as "Monday January 15, 2024"
 */
export function formatDateWords(date: DateInput): string {
  if (!date) return ''
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })
}

/**
 * Format date as "January 15, 2024" (without weekday)
 */
export function formatDateLong(date: DateInput): string {
  if (!date) return ''
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })
}

/**
 * Format date as "Jan 15, 2024"
 */
export function formatDateShort(date: DateInput): string {
  if (!date) return ''
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

/**
 * Format date as "Jan 15"
 */
export function formatDateCompact(date: DateInput): string {
  if (!date) return ''
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  })
}

/**
 * Format time as "2:30 PM"
 */
export function formatTime(date: DateInput): string {
  if (!date) return '--:--'
  const d = new Date(date)
  if (isNaN(d.getTime())) return '--:--'
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}

/**
 * Format time as "14:30" (24-hour)
 */
export function formatTime24(date: DateInput): string {
  if (!date) return '--:--'
  const d = new Date(date)
  if (isNaN(d.getTime())) return '--:--'
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
}

/**
 * Format datetime as "Monday January 15, 2024 at 2:30 PM"
 */
export function formatDateTimeWords(date: DateInput): string {
  if (!date) return ''
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  return `${formatDateWords(d)} at ${formatTime(d)}`
}

/**
 * Format datetime as "Jan 15, 2024 at 2:30 PM"
 */
export function formatDateTimeShort(date: DateInput): string {
  if (!date) return ''
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  return `${formatDateShort(d)} at ${formatTime(d)}`
}

/**
 * Format date for input fields - returns DD-MM-YYYY for user-friendly input
 * Uses local timezone to avoid off-by-one errors
 */
export function toInputDate(date: DateInput): string {
  if (!date) return ''
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  
  // Use local timezone to avoid UTC conversion issues
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${day}-${month}-${year}`
}

/**
 * Parse DD-MM-YYYY string to Date object (handles user input format)
 */
export function parseISODate(input: string): Date | null {
  if (!input || typeof input !== 'string') return null
  
  // Match DD-MM-YYYY format (user input with dashes)
  const match = input.match(/^(\d{2})-(\d{2})-(\d{4})$/)
  if (!match) return null
  
  const day = parseInt(match[1], 10)
  const month = parseInt(match[2], 10) - 1 // JS months are 0-indexed
  const year = parseInt(match[3], 10)
  
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null
  if (day < 1 || day > 31) return null
  if (month < 0 || month > 11) return null
  
  // Create date in local timezone
  const date = new Date(year, month, day)
  if (date.getMonth() !== month || date.getDate() !== day) return null
  
  return date
}

/**
 * Parse DD/MM/YYYY date string to Date object
 * Also handles DD-MM-YYYY format from user input
 * Returns null if invalid
 */
export function parseDMYDate(input: string): Date | null {
  if (!input || typeof input !== 'string') return null
  
  // Check if it's YYYY-MM-DD format (from date picker) - convert to DD-MM-YYYY
  if (input.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = input.split('-')
    input = `${day}-${month}-${year}`
  }
   
  // Check if it's DD-MM-YYYY format (with dashes)
  if (input.match(/^\d{2}-\d{2}-\d{4}$/)) {
    return parseISODate(input)
  }
  
  // Handle DD/MM/YYYY format (with slashes)
  const cleaned = input.replace(/[^\d\/]/g, '')
  const parts = cleaned.split('/')
  
  if (parts.length !== 3) return null
  
  const day = parseInt(parts[0], 10)
  const month = parseInt(parts[1], 10) - 1 // JS months are 0-indexed
  const year = parseInt(parts[2], 10)
  
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null
  if (day < 1 || day > 31) return null
  if (month < 0 || month > 11) return null
  if (year < 1900 || year > 2100) return null
  
  const date = new Date(year, month, day)
  if (date.getMonth() !== month || date.getDate() !== day) return null
  
  return date
}

/**
 * Format Date to DD/MM/YYYY string
 */
export function toDMYDate(date: DateInput): string {
  if (!date) return ''
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  
  const day = d.getDate().toString().padStart(2, '0')
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  const year = d.getFullYear()
  
  return `${day}/${month}/${year}`
}

/**
 * Format time input (HH:MM) from Date
 */
export function toInputTime(date: DateInput): string {
  if (!date) return ''
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  return d.toTimeString().slice(0, 5)
}

/**
 * Parse HH:MM time string to Date (for today)
 */
export function parseHMTime(input: string): Date | null {
  if (!input || typeof input !== 'string') return null
  
  const cleaned = input.replace(/[^\d:]/g, '')
  const parts = cleaned.split(':')
  
  if (parts.length < 2) return null
  
  const hours = parseInt(parts[0], 10)
  const minutes = parseInt(parts[1], 10)
  
  if (isNaN(hours) || isNaN(minutes)) return null
  if (hours < 0 || hours > 23) return null
  if (minutes < 0 || minutes > 59) return null
  
  const date = new Date()
  date.setHours(hours, minutes, 0, 0)
  return date
}

/**
 * Get week range string "Jan 15 - Jan 21, 2024"
 */
export function getWeekRange(weekStart: DateInput): string {
  if (!weekStart) return ''
  const start = new Date(weekStart)
  if (isNaN(start.getTime())) return ''
  
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  
  return `${formatDateCompact(start)} - ${formatDateShort(end)}`
}

/**
 * Get relative time description "2 hours ago", "Yesterday", etc.
 */
export function getRelativeTime(date: DateInput): string {
  if (!date) return ''
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)
  
  if (diffSecs < 60) return 'Just now'
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  
  return formatDateShort(d)
}

/**
 * Format datetime for datetime-local input - returns YYYY-MM-DDTHH:MM
 * Uses local timezone to avoid off-by-one errors
 */
export function toInputDateTime(date: DateInput): string {
  if (!date) return ''
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

/**
 * Parse datetime-local input string (YYYY-MM-DDTHH:MM) as local time
 * 
 * Uses explicit date components to ensure local time is used.
 * The Date constructor with individual arguments (year, month, day, hours, minutes)
 * ALWAYS uses local time, regardless of string format.
 */
export function parseLocalDateTime(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null
  
  const [date, time] = dateStr.split('T')
  if (!date || !time) return null
  
  const [year, month, day] = date.split('-').map(Number)
  const [hours, minutes] = time.split(':').map(Number)
  
  if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hours) || isNaN(minutes)) {
    return null
  }
  
  // Create date using local time components (month is 0-indexed)
  // This ALWAYS uses local time, regardless of string format
  const dateObj = new Date(year, month - 1, day, hours, minutes)
  
  return isNaN(dateObj.getTime()) ? null : dateObj
}
