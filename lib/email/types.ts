export type EmailTemplateType = 
  | 'INVITATION'
  | 'WELCOME'
  | 'RSVP_CONFIRMATION'
  | 'RSVP_CANCELLED'
  | 'NEW_MESSAGE'
  | 'EVENT_REMINDER'
  | 'EVENT_REQUEST_APPROVED'
  | 'EVENT_REQUEST_REJECTED'
  | 'EVENT_CREATED'
  | 'EVENT_UPDATED'
  | 'EXPENSE_APPROVED'
  | 'EXPENSE_REJECTED'
  | 'TIMESHEET_APPROVED'
  | 'TIMESHEET_REJECTED'
  | 'PASSWORD_RESET'
  | 'FEEDBACK_REQUEST'
  | 'GROUP_ACCESS_REQUEST'
  | 'GROUP_ACCESS_APPROVED'
  | 'GROUP_ACCESS_DENIED'

export type EmailFrequency = 'immediate' | 'daily' | 'weekly' | 'never'

export interface EmailTemplate {
  id: string
  type: EmailTemplateType
  name: string
  subject: string
  content: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface EmailTemplateInput {
  type: EmailTemplateType
  name: string
  subject: string
  content: string
  isActive?: boolean
}

export interface EmailSendParams {
  to: string
  templateType: EmailTemplateType
  subject?: string
  variables: Record<string, string>
}

export interface EmailVariable {
  key: string
  description: string
  example: string
}

export type EmailStyleMode = 'UNIVERSAL' | 'CUSTOM'

export type EmailStylePreset = {
  fontFamily: string
  bodyBackground: string
  surfaceBackground: string
  textColor: string
  headingColor: string
  headerTextColor: string
  headerBackgroundColor: string
  buttonColor: string
  buttonTextColor: string
  borderRadius: number
  contentMaxWidth: number
  sectionPadding: number
  showHeader: boolean
  showFooter: boolean
  headerTitle: string
  footerText: string
  showBanner: boolean
  bannerTitle: string
  bannerSubtitle: string
  bannerBackgroundStart: string
  bannerBackgroundEnd: string
  bannerTextColor: string
  bannerAlign: 'left' | 'center'
  bannerPadding: number
  headerTitleSize: number
  headerWeight: number
  headerAlign: 'left' | 'center'
  showHeaderDivider: boolean
  bodyFontSize: number
  bodyLineHeight: number
  paragraphSpacing: number
  linkColor: string
  showSectionDividers: boolean
  buttonRadius: number
  buttonBorderColor: string
  buttonBorderWidth: number
  buttonPaddingY: number
  buttonPaddingX: number
  footerDivider: boolean
  footerTextColor: string
  footerBackgroundColor: string
}

export const DEFAULT_EMAIL_STYLE_PRESET: EmailStylePreset = {
  fontFamily: 'Arial, Helvetica, sans-serif',
  bodyBackground: '#f8fafc',
  surfaceBackground: '#ffffff',
  textColor: '#374151',
  headingColor: '#111827',
  headerTextColor: '#111827',
  headerBackgroundColor: '#ffffff',
  buttonColor: '#2563eb',
  buttonTextColor: '#ffffff',
  borderRadius: 12,
  contentMaxWidth: 640,
  sectionPadding: 24,
  showHeader: true,
  showFooter: true,
  headerTitle: 'Arts and Aging',
  footerText: '{{appUrlDisplay}} | {{supportEmail}}',
  showBanner: true,
  bannerTitle: 'Arts and Aging Updates',
  bannerSubtitle: 'Important updates from the admin team',
  bannerBackgroundStart: '#2563eb',
  bannerBackgroundEnd: '#1d4ed8',
  bannerTextColor: '#ffffff',
  bannerAlign: 'center',
  bannerPadding: 22,
  headerTitleSize: 22,
  headerWeight: 700,
  headerAlign: 'center',
  showHeaderDivider: true,
  bodyFontSize: 15,
  bodyLineHeight: 1.6,
  paragraphSpacing: 14,
  linkColor: '#2563eb',
  showSectionDividers: false,
  buttonRadius: 8,
  buttonBorderColor: '#2563eb',
  buttonBorderWidth: 0,
  buttonPaddingY: 12,
  buttonPaddingX: 24,
  footerDivider: true,
  footerTextColor: '#6b7280',
  footerBackgroundColor: '#f9fafb',
}

export const EMAIL_VARIABLES: Record<string, EmailVariable> = {
  name: { key: '{{name}}', description: 'Recipient name', example: 'John Doe' },
  appUrl: { key: '{{appUrl}}', description: 'Application URL', example: 'https://artsandaging.com' },
  supportEmail: { key: '{{supportEmail}}', description: 'Support email', example: 'info@artsandaging.com' },
  inviteUrl: { key: '{{inviteUrl}}', description: 'Invitation/reset link', example: 'https://artsandaging.com/invite/abc123' },
  // Keep legacy event* variable keys for compatibility with stored templates.
  // User-facing copy uses "booking" terminology.
  eventTitle: { key: '{{eventTitle}}', description: 'Booking title', example: 'Art Therapy Session' },
  eventDate: { key: '{{eventDate}}', description: 'Booking date', example: 'January 15, 2024' },
  eventDateISO: { key: '{{eventDateISO}}', description: 'Booking date (ISO format)', example: '2024-01-15' },
  eventTime: { key: '{{eventTime}}', description: 'Booking time', example: '2:00 PM' },
  eventTimeISO: { key: '{{eventTimeISO}}', description: 'Booking time (ISO format)', example: '14:00' },
  eventLocation: { key: '{{eventLocation}}', description: 'Booking location', example: 'Sunrise Care Home' },
  eventLink: { key: '{{eventLink}}', description: 'Booking details link', example: 'https://artsandaging.com/bookings/123' },
  feedbackUrl: { key: '{{feedbackUrl}}', description: 'Feedback form URL', example: 'https://forms.example.com/feedback/123' },
  googleMapsUrl: { key: '{{googleMapsUrl}}', description: 'Google Maps location URL', example: 'https://maps.google.com/?q=...' },
  calendarSection: { key: '{{calendarSection}}', description: 'Add to calendar buttons section', example: '<div>Calendar buttons...</div>' },
  calendarLink: { key: '{{calendarLink}}', description: 'Add to calendar link', example: 'https://calendar.google.com/...' },
  googleCalendarLink: { key: '{{googleCalendarLink}}', description: 'Google Calendar link', example: 'https://calendar.google.com/...' },
  message: { key: '{{message}}', description: 'Custom message', example: 'Thank you for signing up!' },
  role: { key: '{{role}}', description: 'User role', example: 'Staff' },
  expenseAmount: { key: '{{expenseAmount}}', description: 'Expense amount', example: '$50.00' },
  timesheetWeek: { key: '{{timesheetWeek}}', description: 'Timesheet week', example: 'Week of Jan 15, 2024' },
  groupName: { key: '{{groupName}}', description: 'Group name', example: 'Art Volunteers' },
  appUrlDisplay: { key: '{{appUrlDisplay}}', description: 'App URL without protocol', example: 'artsandaging.com' },
  eventChanges: { key: '{{eventChanges}}', description: 'List of event field changes', example: '<li>Title changed to "New Title"</li>' },
}

export const EMAIL_TEMPLATE_INFO: Record<EmailTemplateType, { name: string; description: string; category: string }> = {
  INVITATION: { name: 'Account Invitation', description: 'Invite new users to join', category: 'User Management' },
  WELCOME: { name: 'Welcome Email', description: 'Welcome after account activation', category: 'User Management' },
  RSVP_CONFIRMATION: { name: 'RSVP Confirmation', description: 'Confirmation when staff RSVPs to booking', category: 'Bookings' },
  RSVP_CANCELLED: { name: 'RSVP Cancelled', description: 'Notification when staff cancels booking RSVP', category: 'Bookings' },
  NEW_MESSAGE: { name: 'New Message', description: 'Notification for new direct messages', category: 'Messaging' },
  EVENT_REMINDER: { name: 'Booking Reminder', description: 'Reminder before scheduled bookings', category: 'Bookings' },
  EVENT_REQUEST_APPROVED: { name: 'Booking Request Approved', description: 'Notification when a booking request is approved', category: 'Bookings' },
  EVENT_REQUEST_REJECTED: { name: 'Booking Request Rejected', description: 'Notification when a booking request is rejected', category: 'Bookings' },
  EVENT_CREATED: { name: 'New Booking Created', description: 'Notification when a new booking is created', category: 'Bookings' },
  EVENT_UPDATED: { name: 'Booking Updated', description: 'Notification when a booking is updated', category: 'Bookings' },
  EXPENSE_APPROVED: { name: 'Expense Approved', description: 'Notification when expense is approved', category: 'Finance' },
  EXPENSE_REJECTED: { name: 'Expense Rejected', description: 'Notification when expense is rejected', category: 'Finance' },
  TIMESHEET_APPROVED: { name: 'Timesheet Approved', description: 'Notification when timesheet is approved', category: 'Payroll' },
  TIMESHEET_REJECTED: { name: 'Timesheet Rejected', description: 'Notification when timesheet is rejected', category: 'Payroll' },
  PASSWORD_RESET: { name: 'Password Reset', description: 'Password reset link', category: 'User Management' },
  FEEDBACK_REQUEST: { name: 'Post-Booking Feedback', description: 'Request feedback after a booking', category: 'Bookings' },
  GROUP_ACCESS_REQUEST: { name: 'Group Access Request', description: 'Notification of group join request', category: 'Messaging' },
  GROUP_ACCESS_APPROVED: { name: 'Group Access Approved', description: 'Notification when group access is approved', category: 'Messaging' },
  GROUP_ACCESS_DENIED: { name: 'Group Access Denied', description: 'Notification when group access is denied', category: 'Messaging' },
}
