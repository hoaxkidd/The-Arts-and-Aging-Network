import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getDefaultTemplate } from '@/lib/email/templates/defaults'
import { sendEmail, isMailchimpConfigured } from '@/lib/email/service'
import { EmailTemplateType } from '@/lib/email/types'
import { logger } from '@/lib/logger'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (session?.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isMailchimpConfigured()) {
      return NextResponse.json({ error: 'Mailchimp is not configured' }, { status: 400 })
    }

    const { id } = await params
    const body = await request.json()
    const { testEmail } = body

    if (!testEmail || !testEmail.includes('@')) {
      return NextResponse.json({ error: 'Valid test email required' }, { status: 400 })
    }

    let template: { type: string; name: string; subject: string; content: string } | null = null

    if (id.startsWith('default-')) {
      const type = id.replace('default-', '') as EmailTemplateType
      template = getDefaultTemplate(type) || null
    } else {
      const dbTemplate = await prisma.emailTemplate.findUnique({ where: { id } })
      template = dbTemplate
    }

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    const result = await sendEmail({
      to: testEmail,
      templateType: template.type as EmailTemplateType,
      variables: {
        name: 'Test User',
        appUrl: process.env.NEXTAUTH_URL || 'https://artsandaging.com',
        supportEmail: 'info@artsandaging.com',
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
      return NextResponse.json({ error: result.error || 'Failed to send test email' }, { status: 500 })
    }

    return NextResponse.json({ success: true, messageId: result.messageId })
  } catch (error) {
    logger.serverAction('Error sending test email:', error)
    return NextResponse.json({ error: 'Failed to send test email' }, { status: 500 })
  }
}
