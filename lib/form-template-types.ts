/**
 * Shared types for form template fields (admin builder + home fill renderer).
 * Stored in FormTemplate.formFields as JSON array.
 */

export const FORM_FIELD_TYPES = [
  'short_text',
  'long_text',
  'radio',
  'checkbox',
  'date',
  'file',
  'address',
] as const

export type FormFieldType = (typeof FORM_FIELD_TYPES)[number]

export interface FormTemplateFieldBase {
  id: string
  type: FormFieldType
  label: string
  required: boolean
  placeholder?: string
  description?: string
}

export interface FormTemplateFieldShortText extends FormTemplateFieldBase {
  type: 'short_text'
}

export interface FormTemplateFieldLongText extends FormTemplateFieldBase {
  type: 'long_text'
}

export interface FormTemplateFieldRadio extends FormTemplateFieldBase {
  type: 'radio'
  options: string[]
  allowOther?: boolean
}

export interface FormTemplateFieldCheckbox extends FormTemplateFieldBase {
  type: 'checkbox'
  options: string[]
  allowOther?: boolean
}

export interface FormTemplateFieldDate extends FormTemplateFieldBase {
  type: 'date'
}

export interface FormTemplateFieldFile extends FormTemplateFieldBase {
  type: 'file'
}

export interface FormTemplateFieldAddress extends FormTemplateFieldBase {
  type: 'address'
}

export type FormTemplateField =
  | FormTemplateFieldShortText
  | FormTemplateFieldLongText
  | FormTemplateFieldRadio
  | FormTemplateFieldCheckbox
  | FormTemplateFieldDate
  | FormTemplateFieldFile
  | FormTemplateFieldAddress

export function parseFormFields(json: string | null): FormTemplateField[] {
  if (!json?.trim()) return []
  try {
    const parsed = JSON.parse(json)
    return Array.isArray(parsed) ? (parsed as FormTemplateField[]) : []
  } catch {
    return []
  }
}

export function isFormTemplateField(f: unknown): f is FormTemplateField {
  if (!f || typeof f !== 'object') return false
  const o = f as Record<string, unknown>
  return (
    typeof o.id === 'string' &&
    typeof o.label === 'string' &&
    typeof o.required === 'boolean' &&
    FORM_FIELD_TYPES.includes(o.type as FormFieldType)
  )
}
