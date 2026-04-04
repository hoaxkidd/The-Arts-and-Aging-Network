import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getDefaultTemplate } from '@/lib/email/templates/defaults'
import { sendEmail, isMailchimpConfigured } from '@/lib/email/service'
import { EmailTemplateType } from '@/lib/email/types'
import { logger } from '@/lib/logger'

export async function GET() {
  try {
    const session = await auth()
    if (session?.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const dbTemplates = await prisma.emailTemplate.findMany({
      orderBy: { type: 'asc' }
    })

    const defaultTypes = [
      'INVITATION', 'WELCOME', 'RSVP_CONFIRMATION', 'RSVP_CANCELLED',
      'NEW_MESSAGE', 'EVENT_REMINDER', 'EVENT_REQUEST_APPROVED', 'EVENT_REQUEST_REJECTED',
      'EVENT_CREATED', 'EVENT_UPDATED',
      'EXPENSE_APPROVED', 'EXPENSE_REJECTED',
      'TIMESHEET_APPROVED', 'TIMESHEET_REJECTED', 'PASSWORD_RESET',
      'FEEDBACK_REQUEST',
      'GROUP_ACCESS_REQUEST', 'GROUP_ACCESS_APPROVED', 'GROUP_ACCESS_DENIED'
    ] as EmailTemplateType[]

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

    return NextResponse.json(templates)
  } catch (error) {
    logger.serverAction('Error fetching email templates:', error)
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (session?.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { type, name, subject, content, isActive } = body

    if (!type || !name || !subject || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const existing = await prisma.emailTemplate.findUnique({
      where: { type }
    })

    if (existing) {
      return NextResponse.json({ error: `Template of type ${type} already exists` }, { status: 400 })
    }

    const template = await prisma.emailTemplate.create({
      data: {
        type,
        name,
        subject,
        content,
        isActive: isActive ?? true
      }
    })

    return NextResponse.json(template)
  } catch (error) {
    logger.serverAction('Error creating email template:', error)
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 })
  }
}
