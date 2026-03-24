import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { uploadToR2, isValidFileType, isValidFileSize, isImageFile } from '@/lib/r2'
import { logger } from '@/lib/logger'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    if (!isValidFileType(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: images (jpg, png, gif, webp) and documents (pdf, doc, docx, xls, xlsx)' },
        { status: 400 }
      )
    }

    // Validate file size (15MB max)
    if (!isValidFileSize(file.size, 15)) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 15MB' },
        { status: 400 }
      )
    }

    // Convert File to Buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Upload to R2
    const uploaded = await uploadToR2(
      buffer,
      file.name,
      file.type,
      'messages'
    )

    return NextResponse.json({
      success: true,
      data: {
        name: uploaded.name,
        url: uploaded.url,
        type: uploaded.type,
        size: uploaded.size,
        isImage: isImageFile(uploaded.type),
      },
    })
  } catch (error) {
    logger.serverAction('Upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    )
  }
}
