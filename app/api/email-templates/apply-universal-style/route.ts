import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function POST() {
  try {
    const session = await auth()
    if (session?.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await prisma.emailTemplate.updateMany({
      data: {
        styleMode: 'UNIVERSAL',
      },
    })

    return NextResponse.json({
      success: true,
      updatedCount: result.count,
      message: 'Universal styling applied to all templates. Subject and content were not modified.',
    })
  } catch (error) {
    logger.serverAction('Error applying universal style to templates:', error)
    return NextResponse.json({ error: 'Failed to apply universal style' }, { status: 500 })
  }
}
