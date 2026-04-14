'use server'

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { google } from 'googleapis'
import {
  GOOGLE_FORMS_SCOPES,
  createGoogleFormsOAuthClient,
  mapGoogleFormToTemplate,
} from '@/lib/google-forms'
import { decryptSecret, encryptSecret } from '@/lib/secret-crypto'
import { logger } from '@/lib/logger'
import { createFormTemplate } from '@/app/actions/form-templates'

const DEFAULT_CATEGORY = 'OTHER'

type FormListItem = {
  id: string
  title: string
  modifiedTime: string | null
  webViewLink: string | null
}

async function requireAdminSession() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized')
  }
  return session
}

async function getConnectedClient(userId: string) {
  const connection = await prisma.googleFormsConnection.findUnique({
    where: { userId },
  })

  if (!connection) {
    throw new Error('Google Forms is not connected')
  }

  const oauth2 = createGoogleFormsOAuthClient()
  const accessToken = decryptSecret(connection.encryptedAccessToken)
  const refreshToken = connection.encryptedRefreshToken
    ? decryptSecret(connection.encryptedRefreshToken)
    : undefined

  oauth2.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
    expiry_date: connection.tokenExpiryDate?.getTime(),
  })

  const shouldRefresh =
    !!refreshToken &&
    (!connection.tokenExpiryDate || connection.tokenExpiryDate.getTime() <= Date.now() + 60_000)

  if (shouldRefresh) {
    const refreshed = await oauth2.refreshAccessToken()
    const token = refreshed.credentials.access_token
    const expiry = refreshed.credentials.expiry_date
    const nextRefreshToken = refreshed.credentials.refresh_token || refreshToken

    if (token) {
      await prisma.googleFormsConnection.update({
        where: { userId },
        data: {
          encryptedAccessToken: encryptSecret(token),
          encryptedRefreshToken: nextRefreshToken ? encryptSecret(nextRefreshToken) : connection.encryptedRefreshToken,
          tokenExpiryDate: expiry ? new Date(expiry) : connection.tokenExpiryDate,
        },
      })
      oauth2.setCredentials({
        access_token: token,
        refresh_token: nextRefreshToken,
        expiry_date: expiry || undefined,
      })
    }
  }

  return { oauth2, connection }
}

async function listGoogleForms(oauth2: ReturnType<typeof createGoogleFormsOAuthClient>, search = ''): Promise<FormListItem[]> {
  const drive = google.drive({ version: 'v3', auth: oauth2 })
  const queryParts = ["mimeType='application/vnd.google-apps.form'", 'trashed=false']
  if (search.trim()) {
    const safeSearch = search.replace(/'/g, "\\'")
    queryParts.push(`name contains '${safeSearch}'`)
  }

  const response = await drive.files.list({
    q: queryParts.join(' and '),
    orderBy: 'modifiedTime desc',
    pageSize: 200,
    fields: 'files(id,name,modifiedTime,webViewLink)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  })

  return (response.data.files || [])
    .filter((file): file is { id: string; name?: string | null; modifiedTime?: string | null; webViewLink?: string | null } => Boolean(file.id))
    .map((file) => ({
      id: file.id,
      title: file.name || 'Untitled Google Form',
      modifiedTime: file.modifiedTime || null,
      webViewLink: file.webViewLink || null,
    }))
}

export async function getGoogleFormsConnectionStatus() {
  try {
    const session = await requireAdminSession()
    const connection = await prisma.googleFormsConnection.findUnique({
      where: { userId: session.user.id },
      select: {
        googleAccountEmail: true,
        updatedAt: true,
      },
    })

    return {
      success: true,
      connected: Boolean(connection),
      email: connection?.googleAccountEmail || null,
      connectedAt: connection?.updatedAt?.toISOString() || null,
    }
  } catch (error) {
    return {
      success: false,
      connected: false,
      email: null,
      connectedAt: null,
      error: error instanceof Error ? error.message : 'Failed to load connection status',
    }
  }
}

export async function disconnectGoogleFormsConnection() {
  try {
    const session = await requireAdminSession()
    await prisma.googleFormsConnection.deleteMany({ where: { userId: session.user.id } })

    await prisma.auditLog.create({
      data: {
        action: 'GOOGLE_FORMS_DISCONNECTED',
        details: JSON.stringify({ userId: session.user.id }),
        userId: session.user.id,
      },
    })

    revalidatePath('/admin/import')
    return { success: true }
  } catch (error) {
    logger.serverAction('Failed to disconnect Google Forms', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to disconnect Google Forms',
    }
  }
}

export async function listGoogleFormsForImport(search = '') {
  try {
    const session = await requireAdminSession()
    const { oauth2 } = await getConnectedClient(session.user.id)
    const forms = await listGoogleForms(oauth2, search)
    return { success: true, forms }
  } catch (error) {
    logger.serverAction('Failed to list Google Forms', error)
    return {
      success: false,
      forms: [] as FormListItem[],
      error: error instanceof Error ? error.message : 'Failed to list forms',
    }
  }
}

export async function previewGoogleFormsImport(formIds: string[]) {
  try {
    const session = await requireAdminSession()
    const { oauth2 } = await getConnectedClient(session.user.id)
    const formsApi = google.forms({ version: 'v1', auth: oauth2 })

    const previews: Array<{
      formId: string
      title: string
      description: string
      fieldCount: number
      warnings: string[]
      fields: Array<{ id: string; label: string; type: string; required: boolean }>
    }> = []

    for (const formId of formIds.slice(0, 25)) {
      const response = await formsApi.forms.get({ formId })
      const mapped = mapGoogleFormToTemplate(response.data as any)
      previews.push({
        formId,
        title: mapped.title,
        description: mapped.description,
        fieldCount: mapped.fields.length,
        warnings: mapped.warnings,
        fields: mapped.fields.slice(0, 12).map((field) => ({
          id: field.id,
          label: field.label,
          type: field.type,
          required: field.required,
        })),
      })
    }

    return { success: true, previews }
  } catch (error) {
    logger.serverAction('Failed to preview Google Forms import', error)
    return {
      success: false,
      previews: [],
      error: error instanceof Error ? error.message : 'Failed to preview forms',
    }
  }
}

export async function importGoogleFormsBulk(input: {
  formIds: string[]
  category?: string
  isPublic?: boolean
  allowedRoles?: string[]
}) {
  const formIds = Array.from(new Set((input.formIds || []).map((id) => id.trim()).filter(Boolean)))

  if (formIds.length === 0) {
    return { success: false, results: [], error: 'No forms selected' }
  }

  try {
    const session = await requireAdminSession()
    const { oauth2 } = await getConnectedClient(session.user.id)
    const formsApi = google.forms({ version: 'v1', auth: oauth2 })

    const results: Array<{
      formId: string
      title: string
      status: 'imported' | 'skipped' | 'failed'
      templateId?: string
      message?: string
      warningCount?: number
    }> = []

    for (const formId of formIds) {
      try {
        const existing = await prisma.formTemplate.findFirst({
          where: {
            tags: {
              contains: `google-form:${formId}`,
            },
          },
          select: { id: true, title: true },
        })

        if (existing) {
          results.push({
            formId,
            title: existing.title,
            status: 'skipped',
            templateId: existing.id,
            message: 'Already imported',
          })
          continue
        }

        const response = await formsApi.forms.get({ formId })
        const mapped = mapGoogleFormToTemplate(response.data as any)

        if (mapped.fields.length === 0) {
          results.push({
            formId,
            title: mapped.title,
            status: 'failed',
            message: 'No compatible questions found in this form',
          })
          continue
        }

        const createResult = await createFormTemplate({
          title: mapped.title,
          description: mapped.description || undefined,
          descriptionHtml: mapped.description ? mapped.description.replace(/\n/g, '<br/>') : undefined,
          category: input.category || DEFAULT_CATEGORY,
          formFields: JSON.stringify(mapped.fields),
          isFillable: true,
          isPublic: input.isPublic ?? true,
          allowedRoles: input.allowedRoles ?? [],
          tags: [`google-form:${formId}`, 'source:google-forms'],
        })

        if (createResult.error || !createResult.data?.id) {
          results.push({
            formId,
            title: mapped.title,
            status: 'failed',
            message: createResult.error || 'Failed to create template',
          })
          continue
        }

        await prisma.auditLog.create({
          data: {
            action: 'FORM_TEMPLATE_IMPORTED',
            details: JSON.stringify({
              source: 'google_forms',
              formId,
              templateId: createResult.data.id,
              warningCount: mapped.warnings.length,
            }),
            userId: session.user.id,
          },
        })

        results.push({
          formId,
          title: mapped.title,
          status: 'imported',
          templateId: createResult.data.id,
          warningCount: mapped.warnings.length,
        })
      } catch (error) {
        results.push({
          formId,
          title: 'Unknown form',
          status: 'failed',
          message: error instanceof Error ? error.message : 'Import failed',
        })
      }
    }

    revalidatePath('/admin/forms')
    revalidatePath('/admin/import')

    return {
      success: true,
      results,
      imported: results.filter((result) => result.status === 'imported').length,
      skipped: results.filter((result) => result.status === 'skipped').length,
      failed: results.filter((result) => result.status === 'failed').length,
    }
  } catch (error) {
    logger.serverAction('Failed to import Google Forms', error)
    return {
      success: false,
      results: [],
      error: error instanceof Error ? error.message : 'Failed to import forms',
    }
  }
}

export async function saveGoogleFormsConnection(input: {
  accessToken: string
  refreshToken?: string
  expiryDate?: number
  scopes?: string[]
  email?: string | null
}) {
  const session = await requireAdminSession()

  const existing = await prisma.googleFormsConnection.findUnique({
    where: { userId: session.user.id },
    select: { encryptedRefreshToken: true },
  })

  await prisma.googleFormsConnection.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      googleAccountEmail: input.email || null,
      encryptedAccessToken: encryptSecret(input.accessToken),
      encryptedRefreshToken: input.refreshToken
        ? encryptSecret(input.refreshToken)
        : null,
      tokenExpiryDate: input.expiryDate ? new Date(input.expiryDate) : null,
      scopes: input.scopes?.length ? input.scopes.join(' ') : GOOGLE_FORMS_SCOPES.join(' '),
    },
    update: {
      googleAccountEmail: input.email || undefined,
      encryptedAccessToken: encryptSecret(input.accessToken),
      encryptedRefreshToken: input.refreshToken
        ? encryptSecret(input.refreshToken)
        : existing?.encryptedRefreshToken || null,
      tokenExpiryDate: input.expiryDate ? new Date(input.expiryDate) : null,
      scopes: input.scopes?.length ? input.scopes.join(' ') : undefined,
    },
  })

  await prisma.auditLog.create({
    data: {
      action: 'GOOGLE_FORMS_CONNECTED',
      details: JSON.stringify({ userId: session.user.id, email: input.email || null }),
      userId: session.user.id,
    },
  })

  revalidatePath('/admin/import')
}
