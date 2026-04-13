import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { DEFAULT_EMAIL_STYLE_PRESET } from '@/lib/email/types'
import { sanitizeEmailStylePreset } from '@/lib/email/style-preset'
import { logger } from '@/lib/logger'

const DEFAULT_PRESET_NAME = 'Universal Email Style'

export async function GET() {
  try {
    const session = await auth()
    if (session?.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const emailStylePresetModel = (prisma as any).emailStylePreset as
      | { findFirst: (args: { orderBy: { updatedAt: 'desc' } }) => Promise<{ id: string; name: string; styleJson: string } | null> }
      | undefined

    if (!emailStylePresetModel) {
      return NextResponse.json({
        id: null,
        name: DEFAULT_PRESET_NAME,
        style: DEFAULT_EMAIL_STYLE_PRESET,
      })
    }

    const preset = await emailStylePresetModel.findFirst({
      orderBy: { updatedAt: 'desc' },
    })

    if (!preset) {
      return NextResponse.json({
        id: null,
        name: DEFAULT_PRESET_NAME,
        style: DEFAULT_EMAIL_STYLE_PRESET,
      })
    }

    return NextResponse.json({
      id: preset.id,
      name: preset.name,
      style: sanitizeEmailStylePreset(JSON.parse(preset.styleJson)),
    })
  } catch (error) {
    logger.serverAction('Error fetching universal style preset:', error)
    return NextResponse.json({ error: 'Failed to fetch style preset' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    if (session?.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const nextStyle = sanitizeEmailStylePreset(body?.style)
    const name = typeof body?.name === 'string' && body.name.trim().length > 0
      ? body.name.trim().slice(0, 80)
      : DEFAULT_PRESET_NAME

    const emailStylePresetModel = (prisma as any).emailStylePreset as
      | {
          findFirst: (args: { orderBy: { updatedAt: 'desc' } }) => Promise<{ id: string } | null>
          update: (args: { where: { id: string }; data: { name: string; styleJson: string } }) => Promise<{ id: string; name: string }>
          create: (args: { data: { name: string; styleJson: string } }) => Promise<{ id: string; name: string }>
        }
      | undefined

    if (!emailStylePresetModel) {
      return NextResponse.json(
        { error: 'Email style preset model unavailable. Run Prisma generate and apply migrations.' },
        { status: 503 }
      )
    }

    const existing = await emailStylePresetModel.findFirst({
      orderBy: { updatedAt: 'desc' },
    })

    const saved = existing
      ? await emailStylePresetModel.update({
          where: { id: existing.id },
          data: {
            name,
            styleJson: JSON.stringify(nextStyle),
          },
        })
      : await emailStylePresetModel.create({
          data: {
            name,
            styleJson: JSON.stringify(nextStyle),
          },
        })

    return NextResponse.json({
      id: saved.id,
      name: saved.name,
      style: nextStyle,
    })
  } catch (error) {
    logger.serverAction('Error updating universal style preset:', error)
    return NextResponse.json({ error: 'Failed to update style preset' }, { status: 500 })
  }
}
