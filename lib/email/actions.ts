'use server'

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { EmailTemplateInput, EmailTemplateType } from './types'
import { getDefaultTemplate } from './templates/defaults'
import { sendEmail, isMailchimpConfigured } from './service'

export async function getEmailTemplates() {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    throw new Error('Unauthorized')
  }

  // Get all templates from database
  const dbTemplates = await prisma.emailTemplate.findMany({
    orderBy: { type: 'asc' }
  })

  // Get all default template types
  const defaultTypes = [
    'INVITATION', 'WELCOME', 'RSVP_CONFIRMATION', 'RSVP_CANCELLED',
    'NEW_MESSAGE', 'EVENT_REMINDER', 'EXPENSE_APPROVED', 'EXPENSE_REJECTED',
    'TIMESHEET_APPROVED', 'TIMESHEET_REJECTED', 'PASSWORD_RESET',
    'GROUP_ACCESS_REQUEST', 'GROUP_ACCESS_APPROVED', 'GROUP_ACCESS_DENIED'
  ] as EmailTemplateType[]

  // Merge with defaults
  const templates = defaultTypes.map(type => {
    const dbTemplate = dbTemplates.find(t => t.type === type)
    const defaultTemplate = getDefaultTemplate(type)
    
    if (dbTemplate) {
      return {
        id: dbTemplate.id,
        type: dbTemplate.type,
        name: dbTemplate.name,
        subject: dbTemplate.subject,
        content: dbTemplate.content,
        isActive: dbTemplate.isActive,
        isDefault: false,
        createdAt: dbTemplate.createdAt,
        updatedAt: dbTemplate.updatedAt
      }
    }
    
    // Return default template info
    return {
      id: `default-${type}`,
      type,
      name: defaultTemplate?.name || type,
      subject: defaultTemplate?.subject || '',
      content: defaultTemplate?.content || '',
      isActive: true,
      isDefault: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  })

  return templates
}

export async function getEmailTemplate(id: string) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    throw new Error('Unauthorized')
  }

  if (id.startsWith('default-')) {
    const type = id.replace('default-', '') as EmailTemplateType
    const defaultTemplate = getDefaultTemplate(type)
    if (!defaultTemplate) return null
    
    return {
      id,
      type,
      name: defaultTemplate.name,
      subject: defaultTemplate.subject,
      content: defaultTemplate.content,
      isActive: true,
      isDefault: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  }

  return prisma.emailTemplate.findUnique({
    where: { id }
  })
}

export async function createEmailTemplate(data: EmailTemplateInput) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    throw new Error('Unauthorized')
  }

  // Check if template type already exists
  const existing = await prisma.emailTemplate.findUnique({
    where: { type: data.type }
  })

  if (existing) {
    throw new Error(`Template of type ${data.type} already exists. Use update instead.`)
  }

  const template = await prisma.emailTemplate.create({
    data: {
      type: data.type,
      name: data.name,
      subject: data.subject,
      content: data.content,
      isActive: data.isActive ?? true
    }
  })

  revalidatePath('/admin/communication')
  return template
}

export async function updateEmailTemplate(id: string, data: Partial<EmailTemplateInput>) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    throw new Error('Unauthorized')
  }

  if (id.startsWith('default-')) {
    // Creating from default - use create instead
    const type = id.replace('default-', '') as EmailTemplateType
    const defaultTemplate = getDefaultTemplate(type)
    if (!defaultTemplate) {
      throw new Error('Default template not found')
    }

    // Check if already exists
    const existing = await prisma.emailTemplate.findUnique({
      where: { type }
    })

    if (existing) {
      // Update existing
      const template = await prisma.emailTemplate.update({
        where: { id: existing.id },
        data: {
          name: data.name ?? defaultTemplate.name,
          subject: data.subject ?? defaultTemplate.subject,
          content: data.content ?? defaultTemplate.content,
          isActive: data.isActive ?? true
        }
      })
      revalidatePath('/admin/communication')
      return template
    }

    // Create new
    const template = await prisma.emailTemplate.create({
      data: {
        type,
        name: data.name ?? defaultTemplate.name,
        subject: data.subject ?? defaultTemplate.subject,
        content: data.content ?? defaultTemplate.content,
        isActive: data.isActive ?? true
      }
    })
    revalidatePath('/admin/communication')
    return template
  }

  const template = await prisma.emailTemplate.update({
    where: { id },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.subject && { subject: data.subject }),
      ...(data.content && { content: data.content }),
      ...(data.isActive !== undefined && { isActive: data.isActive })
    }
  })

  revalidatePath('/admin/communication')
  return template
}

export async function deleteEmailTemplate(id: string) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    throw new Error('Unauthorized')
  }

  if (id.startsWith('default-')) {
    throw new Error('Cannot delete default templates. Set isActive to false instead.')
  }

  await prisma.emailTemplate.delete({
    where: { id }
  })

  revalidatePath('/admin/communication')
  return { success: true }
}

export async function toggleEmailTemplate(id: string, isActive: boolean) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    throw new Error('Unauthorized')
  }

  if (id.startsWith('default-')) {
    const type = id.replace('default-', '') as EmailTemplateType
    const defaultTemplate = getDefaultTemplate(type)
    if (!defaultTemplate) {
      throw new Error('Default template not found')
    }

    // Check if exists in DB
    const existing = await prisma.emailTemplate.findUnique({
      where: { type }
    })

    if (existing) {
      const template = await prisma.emailTemplate.update({
        where: { id: existing.id },
        data: { isActive }
      })
      revalidatePath('/admin/communication')
      return template
    } else {
      // Create from default
      const template = await prisma.emailTemplate.create({
        data: {
          type,
          name: defaultTemplate.name,
          subject: defaultTemplate.subject,
          content: defaultTemplate.content,
          isActive
        }
      })
      revalidatePath('/admin/communication')
      return template
    }
  }

  const template = await prisma.emailTemplate.update({
    where: { id },
    data: { isActive }
  })

  revalidatePath('/admin/communication')
  return template
}

export async function sendTestEmail(id: string, testEmail: string) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    throw new Error('Unauthorized')
  }

  if (!isMailchimpConfigured()) {
    throw new Error('Mailchimp is not configured. Please add MAILCHIMP_TRANSACTIONAL_API_KEY to your environment.')
  }

  // Get template
  let template
  if (id.startsWith('default-')) {
    const type = id.replace('default-', '') as EmailTemplateType
    const defaultTemplate = getDefaultTemplate(type)
    if (!defaultTemplate) {
      throw new Error('Default template not found')
    }
    template = defaultTemplate
  } else {
    const dbTemplate = await prisma.emailTemplate.findUnique({ where: { id } })
    if (!dbTemplate) {
      throw new Error('Template not found')
    }
    template = dbTemplate
  }

  // Send test email with sample data
  const result = await sendEmail({
    to: testEmail,
    templateType: template.type as EmailTemplateType,
    variables: {
      name: 'Test User',
      appUrl: process.env.NEXTAUTH_URL || 'https://artsandaging.com',
      supportEmail: 'support@artsandaging.com',
      message: 'This is a test email to verify your template is working correctly.',
      role: 'Staff',
      eventTitle: 'Test Event',
      eventDate: 'January 15, 2024',
      eventTime: '2:00 PM',
      eventLocation: 'Test Care Home',
      eventLink: 'https://artsandaging.com/events/123',
      expenseAmount: '$50.00',
      timesheetWeek: 'Week of Jan 15, 2024',
      groupName: 'Test Group',
      inviteUrl: 'https://artsandaging.com/invite/test123'
    }
  })

  if (!result.success) {
    throw new Error(result.error || 'Failed to send test email')
  }

  return { success: true, messageId: result.messageId }
}
