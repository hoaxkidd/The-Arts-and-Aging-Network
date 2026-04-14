import { google } from 'googleapis'
import type { OAuth2Client } from 'google-auth-library'
import type { FormTemplateField } from '@/lib/form-template-types'

export const GOOGLE_FORMS_SCOPES = [
  'https://www.googleapis.com/auth/forms.body.readonly',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
]

type RawGoogleQuestion = {
  questionId?: string
  required?: boolean
  textQuestion?: {
    paragraph?: boolean
  }
  choiceQuestion?: {
    type?: string
    options?: Array<{ value?: string | null }>
  }
  dateQuestion?: Record<string, unknown>
  timeQuestion?: Record<string, unknown>
  fileUploadQuestion?: Record<string, unknown>
  scaleQuestion?: {
    low?: number
    high?: number
    lowLabel?: string
    highLabel?: string
  }
}

type RawGoogleFormItem = {
  itemId?: string
  title?: string
  description?: string
  questionItem?: {
    question?: RawGoogleQuestion
  }
  questionGroupItem?: {
    questions?: RawGoogleQuestion[]
  }
}

export type GoogleFormTemplatePreview = {
  formId: string
  title: string
  description: string
  fields: FormTemplateField[]
  warnings: string[]
}

function baseUrlFromEnv() {
  const value = process.env.NEXTAUTH_URL || process.env.AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return value.replace(/\/$/, '')
}

export function getGoogleFormsRedirectUri() {
  return process.env.GOOGLE_FORMS_REDIRECT_URI || `${baseUrlFromEnv()}/api/integrations/google/forms/callback`
}

export function createGoogleFormsOAuthClient(): OAuth2Client {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required')
  }

  return new google.auth.OAuth2(clientId, clientSecret, getGoogleFormsRedirectUri())
}

export function extractGoogleFormId(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (/^[a-zA-Z0-9_-]{20,}$/.test(trimmed)) return trimmed

  try {
    const url = new URL(trimmed)
    const match = url.pathname.match(/\/d\/e\/([a-zA-Z0-9_-]+)/)
    if (match?.[1]) return match[1]
  } catch {
    return null
  }

  return null
}

function toDescriptionHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br/>')
}

function mapQuestionToField(question: RawGoogleQuestion, title: string, description?: string, idHint?: string): { field?: FormTemplateField; warning?: string } {
  const base = {
    id: question.questionId || idHint || crypto.randomUUID(),
    label: title || 'Untitled question',
    required: Boolean(question.required),
    description: description || undefined,
    descriptionHtml: description ? toDescriptionHtml(description) : undefined,
  }

  if (question.textQuestion) {
    return {
      field: {
        ...base,
        type: question.textQuestion.paragraph ? 'long_text' : 'short_text',
      },
    }
  }

  if (question.choiceQuestion) {
    const options = (question.choiceQuestion.options || [])
      .map((option) => (option.value || '').trim())
      .filter(Boolean)

    const type = question.choiceQuestion.type === 'CHECKBOX' ? 'checkbox' : 'radio'

    return {
      field: {
        ...base,
        type,
        options,
      } as FormTemplateField,
    }
  }

  if (question.dateQuestion) {
    return {
      field: {
        ...base,
        type: 'date',
      },
    }
  }

  if (question.fileUploadQuestion) {
    return {
      field: {
        ...base,
        type: 'file',
      },
    }
  }

  if (question.scaleQuestion) {
    const low = Number.isInteger(question.scaleQuestion.low) ? Number(question.scaleQuestion.low) : 1
    const high = Number.isInteger(question.scaleQuestion.high) ? Number(question.scaleQuestion.high) : 5
    const options: string[] = []
    for (let i = low; i <= high; i++) options.push(String(i))
    return {
      field: {
        ...base,
        type: 'radio',
        options,
      } as FormTemplateField,
      warning: `Converted scale question "${base.label}" to radio options ${low}-${high}.`,
    }
  }

  if (question.timeQuestion) {
    return {
      field: {
        ...base,
        type: 'short_text',
        placeholder: 'HH:MM',
      },
      warning: `Converted time question "${base.label}" to short text (HH:MM).`,
    }
  }

  return {
    warning: `Skipped unsupported question type for "${base.label}".`,
  }
}

export function mapGoogleFormToTemplate(form: {
  formId?: string
  info?: { title?: string; description?: string }
  items?: RawGoogleFormItem[]
}): GoogleFormTemplatePreview {
  const warnings: string[] = []
  const fields: FormTemplateField[] = []

  for (const item of form.items || []) {
    if (item.questionItem?.question) {
      const mapped = mapQuestionToField(
        item.questionItem.question,
        item.title || 'Untitled question',
        item.description,
        item.itemId
      )
      if (mapped.field) fields.push(mapped.field)
      if (mapped.warning) warnings.push(mapped.warning)
      continue
    }

    if (item.questionGroupItem?.questions?.length) {
      for (const [index, question] of item.questionGroupItem.questions.entries()) {
        const mapped = mapQuestionToField(
          question,
          item.title ? `${item.title} (${index + 1})` : `Group question ${index + 1}`,
          item.description,
          `${item.itemId || 'group'}-${index}`
        )
        if (mapped.field) fields.push(mapped.field)
        if (mapped.warning) warnings.push(mapped.warning)
      }
    }
  }

  return {
    formId: form.formId || '',
    title: form.info?.title || 'Imported Google Form',
    description: form.info?.description || '',
    fields,
    warnings,
  }
}
