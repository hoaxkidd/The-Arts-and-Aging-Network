export type EmailTemplateType = 
  | 'INVITATION'
  | 'WELCOME'
  | 'RSVP_CONFIRMATION'
  | 'RSVP_CANCELLED'
  | 'NEW_MESSAGE'
  | 'EVENT_REMINDER'
  | 'EVENT_REQUEST_APPROVED'
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

export const EMAIL_VARIABLES: Record<string, EmailVariable> = {
  name: { key: '{{name}}', description: 'Recipient name', example: 'John Doe' },
  appUrl: { key: '{{appUrl}}', description: 'Application URL', example: 'https://artsandaging.com' },
  supportEmail: { key: '{{supportEmail}}', description: 'Support email', example: 'support@artsandaging.com' },
  inviteUrl: { key: '{{inviteUrl}}', description: 'Invitation/reset link', example: 'https://artsandaging.com/invite/abc123' },
  eventTitle: { key: '{{eventTitle}}', description: 'Event title', example: 'Art Therapy Session' },
  eventDate: { key: '{{eventDate}}', description: 'Event date', example: 'January 15, 2024' },
  eventDateISO: { key: '{{eventDateISO}}', description: 'Event date (ISO format)', example: '2024-01-15' },
  eventTime: { key: '{{eventTime}}', description: 'Event time', example: '2:00 PM' },
  eventTimeISO: { key: '{{eventTimeISO}}', description: 'Event time (ISO format)', example: '14:00' },
  eventLocation: { key: '{{eventLocation}}', description: 'Event location', example: 'Sunrise Care Home' },
  eventLink: { key: '{{eventLink}}', description: 'Event details link', example: 'https://artsandaging.com/events/123' },
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
}

export const EMAIL_TEMPLATE_INFO: Record<EmailTemplateType, { name: string; description: string; category: string }> = {
  INVITATION: { name: 'Account Invitation', description: 'Invite new users to join', category: 'User Management' },
  WELCOME: { name: 'Welcome Email', description: 'Welcome after account activation', category: 'User Management' },
  RSVP_CONFIRMATION: { name: 'RSVP Confirmation', description: 'Confirmation when staff RSVPs to event', category: 'Events' },
  RSVP_CANCELLED: { name: 'RSVP Cancelled', description: 'Notification when staff cancels RSVP', category: 'Events' },
  NEW_MESSAGE: { name: 'New Message', description: 'Notification for new direct messages', category: 'Messaging' },
  EVENT_REMINDER: { name: 'Event Reminder', description: 'Reminder before scheduled events', category: 'Events' },
  EVENT_REQUEST_APPROVED: { name: 'Event Request Approved', description: 'Notification when an event request is approved', category: 'Events' },
  EXPENSE_APPROVED: { name: 'Expense Approved', description: 'Notification when expense is approved', category: 'Finance' },
  EXPENSE_REJECTED: { name: 'Expense Rejected', description: 'Notification when expense is rejected', category: 'Finance' },
  TIMESHEET_APPROVED: { name: 'Timesheet Approved', description: 'Notification when timesheet is approved', category: 'Payroll' },
  TIMESHEET_REJECTED: { name: 'Timesheet Rejected', description: 'Notification when timesheet is rejected', category: 'Payroll' },
  PASSWORD_RESET: { name: 'Password Reset', description: 'Password reset link', category: 'User Management' },
  FEEDBACK_REQUEST: { name: 'Post-Event Feedback', description: 'Request feedback after an event', category: 'Events' },
  GROUP_ACCESS_REQUEST: { name: 'Group Access Request', description: 'Notification of group join request', category: 'Messaging' },
  GROUP_ACCESS_APPROVED: { name: 'Group Access Approved', description: 'Notification when group access is approved', category: 'Messaging' },
  GROUP_ACCESS_DENIED: { name: 'Group Access Denied', description: 'Notification when group access is denied', category: 'Messaging' },
}
