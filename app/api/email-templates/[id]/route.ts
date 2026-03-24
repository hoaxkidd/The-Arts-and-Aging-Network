import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getDefaultTemplate } from '@/lib/email/templates/defaults'
import { logger } from '@/lib/logger'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (session?.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { name, subject, content, isActive } = body

    if (id.startsWith('default-')) {
      const type = id.replace('default-', '')
      const defaultTemplate = getDefaultTemplate(type as any)
      if (!defaultTemplate) {
        return NextResponse.json({ error: 'Default template not found' }, { status: 404 })
      }

      const existing = await prisma.emailTemplate.findUnique({
        where: { type }
      })

      if (existing) {
        const template = await prisma.emailTemplate.update({
          where: { id: existing.id },
          data: {
            name: name ?? defaultTemplate.name,
            subject: subject ?? defaultTemplate.subject,
            content: content ?? defaultTemplate.content,
            isActive: isActive ?? true
          }
        })
        return NextResponse.json(template)
      }

      const template = await prisma.emailTemplate.create({
        data: {
          type,
          name: name ?? defaultTemplate.name,
          subject: subject ?? defaultTemplate.subject,
          content: content ?? defaultTemplate.content,
          isActive: isActive ?? true
        }
      })
      return NextResponse.json(template)
    }

    const template = await prisma.emailTemplate.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(subject && { subject }),
        ...(content && { content }),
        ...(isActive !== undefined && { isActive })
      }
    })

    return NextResponse.json(template)
  } catch (error) {
    logger.serverAction('Error updating email template:', error)
    return NextResponse.json({ error: 'Failed to update template' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (session?.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    if (id.startsWith('default-')) {
      return NextResponse.json({ error: 'Cannot delete default templates. Set isActive to false instead.' }, { status: 400 })
    }

    await prisma.emailTemplate.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.serverAction('Error deleting email template:', error)
    return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 })
  }
}
