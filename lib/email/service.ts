import { prisma } from '@/lib/prisma'
import { EmailTemplateType, EmailSendParams } from './types'
import { getDefaultTemplate } from './templates/defaults'

const MAILCHIMP_TRANSACTIONAL_API_KEY = process.env.MAILCHIMP_TRANSACTIONAL_API_KEY
const MAILCHIMP_FROM_EMAIL = process.env.MAILCHIMP_FROM_EMAIL || 'noreply@artsandaging.com'
const MAILCHIMP_FROM_NAME = process.env.MAILCHIMP_FROM_NAME || 'Arts and Aging'
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'support@artsandaging.com'
const APP_URL = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://artsandaging.com'

export interface SendEmailResult {
  success: boolean
  messageId?: string
  error?: string
}

function replaceVariables(content: string, variables: Record<string, string>): string {
  let result = content
  
  // Replace all {{variable}} patterns
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g')
    result = result.replace(regex, value)
  }
  
  // Also replace the specific common variables
  result = result.replace(/{{appUrl}}/g, variables.appUrl || APP_URL)
  result = result.replace(/{{supportEmail}}/g, variables.supportEmail || SUPPORT_EMAIL)
  result = result.replace(/{{name}}/g, variables.name || 'User')
  
  return result
}

async function sendViaMailchimpTransactional(to: string, subject: string, html: string): Promise<SendEmailResult> {
  if (!MAILCHIMP_TRANSACTIONAL_API_KEY || !MAILCHIMP_FROM_EMAIL) {
    return { success: false, error: 'Mailchimp Transactional not configured' }
  }

  try {
    const response = await fetch('https://mandrillapp.com/api/1.0/messages/send.json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        key: MAILCHIMP_TRANSACTIONAL_API_KEY,
        message: {
          from_email: MAILCHIMP_FROM_EMAIL,
          from_name: MAILCHIMP_FROM_NAME,
          to: [{ email: to, type: 'to' }],
          subject,
          html,
          headers: {
            'Reply-To': SUPPORT_EMAIL
          }
        }
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      return { success: false, error: `Mailchimp error: ${errorText}` }
    }

    const body = await response.json() as Array<{ status?: string; _id?: string; reject_reason?: string }>
    const first = Array.isArray(body) ? body[0] : null
    
    if (!first || (first.status !== 'sent' && first.status !== 'queued')) {
      return { success: false, error: `Mailchimp rejected: ${first?.reject_reason || 'unknown'}` }
    }

    return { success: true, messageId: first._id }
  } catch (error) {
    console.error('Mailchimp send error:', error)
    return { success: false, error: `Failed to send email: ${error}` }
  }
}

export async function sendEmail(params: EmailSendParams): Promise<SendEmailResult> {
  const { to, templateType, subject: customSubject, variables } = params

  // Merge default variables
  const fullVariables = {
    appUrl: APP_URL,
    supportEmail: SUPPORT_EMAIL,
    ...variables
  }

  // Try to get template from database
  const dbTemplate = await prisma.emailTemplate.findUnique({
    where: { type: templateType }
  })

  // If no database template or template is inactive, try to use default
  let subject = customSubject || ''
  let htmlContent = ''

  if (dbTemplate && dbTemplate.isActive) {
    subject = replaceVariables(dbTemplate.subject, fullVariables)
    htmlContent = replaceVariables(dbTemplate.content, fullVariables)
  } else {
    // Use default template
    const defaultTemplate = getDefaultTemplate(templateType)
    if (defaultTemplate) {
      subject = customSubject || replaceVariables(defaultTemplate.subject, fullVariables)
      htmlContent = replaceVariables(defaultTemplate.content, fullVariables)
    } else {
      return { success: false, error: `No template found for type: ${templateType}` }
    }
  }

  // Send email
  return sendViaMailchimpTransactional(to, subject, htmlContent)
}

export async function sendEmailWithCustomContent(
  to: string, 
  subject: string, 
  htmlContent: string, 
  variables: Record<string, string> = {}
): Promise<SendEmailResult> {
  const fullVariables = {
    appUrl: APP_URL,
    supportEmail: SUPPORT_EMAIL,
    ...variables
  }

  const processedSubject = replaceVariables(subject, fullVariables)
  const processedContent = replaceVariables(htmlContent, fullVariables)

  return sendViaMailchimpTransactional(to, processedSubject, processedContent)
}

export function getEmailVariables(): Record<string, { key: string; description: string; example: string }> {
  return {
    name: { key: '{{name}}', description: 'Recipient name', example: 'John Doe' },
    appUrl: { key: '{{appUrl}}', description: 'Application URL', example: APP_URL },
    supportEmail: { key: '{{supportEmail}}', description: 'Support email', example: SUPPORT_EMAIL },
    inviteUrl: { key: '{{inviteUrl}}', description: 'Invitation link', example: `${APP_URL}/invite/abc123` },
    eventTitle: { key: '{{eventTitle}}', description: 'Event title', example: 'Art Therapy Session' },
    eventDate: { key: '{{eventDate}}', description: 'Event date', example: 'January 15, 2024' },
    eventTime: { key: '{{eventTime}}', description: 'Event time', example: '2:00 PM' },
    eventLocation: { key: '{{eventLocation}}', description: 'Event location', example: 'Sunrise Care Home' },
    eventLink: { key: '{{eventLink}}', description: 'Event details link', example: `${APP_URL}/events/123` },
    message: { key: '{{message}}', description: 'Custom message', example: 'Thank you for signing up!' },
    role: { key: '{{role}}', description: 'User role', example: 'Staff' },
    expenseAmount: { key: '{{expenseAmount}}', description: 'Expense amount', example: '$50.00' },
    timesheetWeek: { key: '{{timesheetWeek}}', description: 'Timesheet week', example: 'Week of Jan 15, 2024' },
    groupName: { key: '{{groupName}}', description: 'Group name', example: 'Art Volunteers' },
  }
}

export function isMailchimpConfigured(): boolean {
  return !!(MAILCHIMP_TRANSACTIONAL_API_KEY && MAILCHIMP_FROM_EMAIL)
}
