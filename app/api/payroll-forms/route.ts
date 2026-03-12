import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { isPayrollOrAdminRole } from '@/lib/roles'

export async function GET(req: NextRequest) {
  const session = await auth()
  
  if (!session?.user?.id || !isPayrollOrAdminRole(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get all active forms
  try {
    const forms = await prisma.payrollForm.findMany({
      where: { isActive: true },
      include: {
        uploader: {
          select: { name: true, email: true }
        },
        _count: {
          select: { submissions: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ success: true, data: forms })
  } catch (error) {
    console.error('Failed to fetch payroll forms:', error)
    return NextResponse.json({ error: 'Failed to fetch forms' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { title, description, formType, isRequired, roles, expiresAt, fileUrl, fileName, fileType, fileSize } = body

    const form = await prisma.payrollForm.create({
      data: {
        title,
        description,
        formType,
        isRequired: isRequired || false,
        roles,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        fileUrl,
        fileName,
        fileType,
        fileSize,
        uploadedBy: session.user.id
      }
    })

    return NextResponse.json({ success: true, data: form })
  } catch (error) {
    console.error('Failed to create payroll form:', error)
    return NextResponse.json({ error: 'Failed to create form' }, { status: 500 })
  }
}
