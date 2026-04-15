'use client'

import type { FormTemplateField } from '@/lib/form-template-types'
import { cn } from '@/lib/utils'
import { AddressAutocomplete } from '@/components/ui/AddressAutocomplete'
import { sanitizeHtml } from "@/lib/dompurify"
import { DateInput } from '@/components/ui/DateInput'

function hasHtmlMarkup(value: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(value)
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function applySimpleMarkdown(value: string): string {
  return value
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/\*(?!\*)([^*\n]+)\*(?!\*)/g, '<em>$1</em>')
    .replace(/_(?!_)([^_\n]+)_(?!_)/g, '<em>$1</em>')
}

function plainTextToHtml(value: string): string {
  const escaped = escapeHtml(value.trim())
  const withFormatting = applySimpleMarkdown(escaped)
  return withFormatting
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, '<br />')}</p>`)
    .join('')
}

function buildRichContent(rawHtml?: string | null, rawText?: string | null): string | null {
  const htmlCandidate = rawHtml?.trim() || ''
  const textCandidate = rawText?.trim() || ''

  if (htmlCandidate) {
    if (hasHtmlMarkup(htmlCandidate)) {
      return sanitizeHtml(htmlCandidate)
    }
    return sanitizeHtml(plainTextToHtml(htmlCandidate))
  }

  if (textCandidate) {
    return sanitizeHtml(plainTextToHtml(textCandidate))
  }

  return null
}

export type FormTemplateViewProps = {
  title: string
  description?: string | null
  descriptionHtml?: string | null
  fields: FormTemplateField[]
  eventTitle?: string
  /** When true, render read-only preview (e.g. in admin builder). */
  preview?: boolean
  /** For fill mode: current values keyed by field id */
  values?: Record<string, unknown>
  /** For fill mode: update a field value */
  onFieldChange?: (fieldId: string, value: unknown) => void
  /** For fill mode: validation errors keyed by field id */
  errors?: Record<string, string>
  /** For fill mode: submit button label */
  submitLabel?: string
  /** For fill mode: called on form submit */
  onSubmit?: (e: React.FormEvent) => void
  /** For fill mode: submit in progress */
  submitting?: boolean
  /** Optional density mode for layout spacing */
  density?: 'default' | 'compact'
}

/**
 * Shared presentational form view: title, description, and field list.
 * Used by EventSignUpFormRenderer (fill mode) and FormTemplateBuilder (preview mode).
 */
export function FormTemplateView({
  title,
  description,
  descriptionHtml,
  fields,
  eventTitle,
  preview = false,
  values = {},
  onFieldChange,
  errors = {},
  submitLabel,
  onSubmit,
  submitting = false,
  density = 'default',
}: FormTemplateViewProps) {
  const wrapperPadding = density === 'compact' ? 'px-4 py-4 md:px-5' : 'p-4 md:p-5'
  const descriptionContent = buildRichContent(descriptionHtml, description)
  const content = (
    <div className="space-y-5">
      {eventTitle && (
        <div className="pb-2 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">{eventTitle}</h2>
        </div>
      )}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {descriptionContent ? (
          <div
            className="text-sm text-gray-600 rich-text-content"
            dangerouslySetInnerHTML={{
              __html: descriptionContent,
            }}
          />
        ) : null}
      </div>

      {fields.length === 0 && preview && (
        <p className="text-sm text-gray-500 py-4 rounded-lg border border-dashed border-gray-200 bg-gray-50/50 px-4">
          Add fields in the builder to see them here.
        </p>
      )}

      {fields.map((field, index) => (
        (() => {
          const fieldDescriptionContent = buildRichContent(field.descriptionHtml, field.description)
          return (
        <div
          key={field.id}
          className={cn(
            'space-y-2 pb-4',
            index < fields.length - 1 ? 'border-b border-gray-100' : 'pb-0'
          )}
        >
          <label className="block text-sm font-medium text-gray-900">
            {field.label || '(Untitled field)'}
            {field.required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
          {fieldDescriptionContent ? (
            <div
              className="text-sm text-gray-600 rich-text-content"
              dangerouslySetInnerHTML={{
                __html: fieldDescriptionContent,
              }}
            />
          ) : null}
          {preview ? (
            <FieldInputPreview field={field} value={values[field.id]} />
          ) : (
            <>
              <FieldInput
                field={field}
                value={values[field.id]}
                onChange={(v) => onFieldChange?.(field.id, v)}
              />
              {errors[field.id] && (
                <p className="text-sm text-red-600 mt-1">{errors[field.id]}</p>
              )}
            </>
          )}
        </div>
          )
        })()
      ))}

      {!preview && submitLabel != null && (
        <div className="pt-2">
          <button
            type="submit"
            disabled={submitting}
            className={cn(
              'px-4 py-2 rounded-md text-sm font-medium bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-50',
              submitting && 'pointer-events-none'
            )}
          >
            {submitting ? 'Submitting...' : submitLabel}
          </button>
        </div>
      )}
    </div>
  )

  if (preview) {
    return (
      <div className={cn('space-y-4', wrapperPadding)}>
        {content}
      </div>
    )
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit?.(e)
      }}
      className={cn('space-y-4', wrapperPadding)}
    >
      {content}
    </form>
  )
}

/** Read-only rendering for preview mode - displays submitted values */
function FieldInputPreview({ field, value }: { field: FormTemplateField; value?: unknown }) {
  const id = `preview-${field.id}`
  const isEmpty = value === undefined || value === null || value === '' ||
    (Array.isArray(value) && value.length === 0)
  const displayValue = isEmpty ? '—' : String(value)

  const formatValue = (val: unknown): string => {
    if (val === undefined || val === null || val === '') return '—'
    if (Array.isArray(val)) return val.join(', ')
    if (typeof val === 'object' && val !== null && '_value' in val) {
      let result = String((val as Record<string, unknown>)._value)
      if ((val as Record<string, unknown>)._other) {
        result += ` (Other: ${(val as Record<string, unknown>)._other})`
      }
      return result
    }
    if (typeof val === 'object' && val !== null && '_options' in val) {
      let result = ((val as Record<string, unknown>)._options as string[])?.join(', ') || ''
      if ((val as Record<string, unknown>)._other) {
        result += ` (Other: ${(val as Record<string, unknown>)._other})`
      }
      return result || '—'
    }
    if (String(val).startsWith('data:')) return '(file uploaded)'
    return String(val)
  }

  switch (field.type) {
    case 'short_text':
      return (
        <div className={cn(
          "w-full rounded-md border border-gray-200 px-3 py-2 text-sm",
          isEmpty ? "bg-gray-50 text-gray-400" : "bg-white text-gray-900"
        )}>
          {isEmpty ? '—' : formatValue(value)}
        </div>
      )
    case 'long_text':
      return (
        <div className={cn(
          "w-full rounded-md border border-gray-200 px-3 py-2 text-sm",
          isEmpty ? "bg-gray-50 text-gray-400" : "bg-white text-gray-900"
        )}>
          {isEmpty ? '—' : formatValue(value)}
        </div>
      )
    case 'date': {
      const dateField = field as Extract<typeof field, { type: 'date' }>
      return (
        <div className="space-y-1">
          <div className={cn(
            "w-full rounded-md border border-gray-200 px-3 py-2 text-sm",
            isEmpty ? "bg-gray-50 text-gray-400" : "bg-white text-gray-900"
          )}>
            {isEmpty ? '—' : formatValue(value)}
          </div>
          {dateField.isDateOfBirth && (
            <span className="text-xs text-gray-500">Date of Birth (must be in the past)</span>
          )}
        </div>
      )
    }
    case 'radio': {
      const options = (field.options || []).filter(Boolean)
      const selectedValue = typeof value === 'string' ? value : (value as Record<string, unknown>)?._value as string | undefined
      return (
        <div className="space-y-1.5">
          {options.length === 0 ? (
            <span className="text-sm text-gray-400">—</span>
          ) : (
            options.map((opt, i) => (
              <label key={`${field.id}-${i}`} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={id}
                  disabled
                  checked={selectedValue === opt}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-900">{opt}</span>
              </label>
            ))
          )}
          {!!field.allowOther && !!((value as Record<string, unknown>)?._other) && (
            <div className="flex items-center gap-2 pl-5">
              <span className="text-sm text-gray-500">Other:</span>
              <span className="text-sm text-gray-900">{String((value as Record<string, unknown>)._other || '')}</span>
            </div>
          )}
        </div>
      )
    }
    case 'checkbox': {
      const options = (field.options || []).filter(Boolean)
      const selectedValues = Array.isArray(value) ? value : []
      return (
        <div className="space-y-1.5">
          {options.length === 0 ? (
            <span className="text-sm text-gray-400">—</span>
          ) : (
            options.map((opt, i) => (
              <label key={`${field.id}-${i}`} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  disabled
                  checked={selectedValues.includes(opt)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-900">{opt}</span>
              </label>
            ))
          )}
          {!!field.allowOther && !!((value as Record<string, unknown>)?._other) && (
            <div className="flex items-center gap-2 pl-5">
              <span className="text-sm text-gray-500">Other:</span>
              <span className="text-sm text-gray-900">{String((value as Record<string, unknown>)._other || '')}</span>
            </div>
          )}
        </div>
      )
    }
    case 'file':
      return (
        <div className={cn(
          "w-full rounded-md border border-gray-200 px-3 py-2 text-sm",
          isEmpty ? "bg-gray-50 text-gray-400" : "bg-white text-gray-900"
        )}>
          {isEmpty ? '—' : formatValue(value)}
        </div>
      )
    case 'address':
      return (
        <div className={cn(
          "w-full rounded-md border border-gray-200 px-3 py-2 text-sm",
          isEmpty ? "bg-gray-50 text-gray-400" : "bg-white text-gray-900"
        )}>
          {isEmpty ? '—' : formatValue(value)}
        </div>
      )
    default:
      return (
        <div className={cn(
          "w-full rounded-md border border-gray-200 px-3 py-2 text-sm",
          isEmpty ? "bg-gray-50 text-gray-400" : "bg-white text-gray-900"
        )}>
          {isEmpty ? '—' : formatValue(value)}
        </div>
      )
  }
}

/** Interactive field input for fill mode */
function FieldInput({
  field,
  value,
  onChange,
}: {
  field: FormTemplateField
  value: unknown
  onChange: (v: unknown) => void
}) {
  const id = `field-${field.id}`

  switch (field.type) {
    case 'short_text':
      return (
        <input
          id={id}
          type="text"
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />
      )
    case 'long_text':
      return (
        <textarea
          id={id}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={4}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />
      )
    case 'date': {
      const dateField = field as Extract<typeof field, { type: 'date' }>
      return (
        <DateInput
          name={id}
          value={(value as string) ?? ''}
          onChange={(v) => onChange(v)}
          placeholder={dateField.placeholder}
          required={dateField.required}
          isDateOfBirth={dateField.isDateOfBirth ?? false}
        />
      )
    }
    case 'address':
      return (
        <AddressAutocomplete
          value={(value as string) ?? ''}
          onChange={(val) => onChange(val)}
          placeholder={field.placeholder || 'Start typing address...'}
          countries={['ca']}
          showLoader={true}
          className="w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />
      )
    case 'radio': {
      const options = (field.options || []).filter(Boolean)
      const otherVal = field.allowOther ? (value as Record<string, string>)?._other : undefined
      const selected = typeof value === 'string' ? value : (value as Record<string, string>)?._value
      return (
        <div className="space-y-2">
          {options.map((opt, i) => (
            <label key={`${field.id}-${i}`} className="flex items-center gap-2">
              <input
                type="radio"
                name={id}
                checked={selected === opt}
                onChange={() => onChange(opt)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">{opt}</span>
            </label>
          ))}
          {field.allowOther && (
            <div className="flex items-center gap-2 pl-6">
              <span className="text-sm text-gray-600">Other:</span>
              <input
                type="text"
                value={otherVal ?? ''}
                onChange={(e) =>
                  onChange(
                    selected
                      ? { _value: selected, _other: e.target.value }
                      : { _value: '', _other: e.target.value }
                  )
                }
                onFocus={() => {
                  if (!selected && !otherVal) onChange({ _value: '', _other: '' })
                }}
                placeholder="Please specify"
                className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm"
              />
            </div>
          )}
        </div>
      )
    }
    case 'checkbox': {
      const options = (field.options || []).filter(Boolean)
      const otherVal = field.allowOther ? (value as Record<string, unknown>)?._other : undefined
      const arr =
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value) &&
        '_other' in value
          ? ((value as Record<string, unknown>)._options as string[]) || []
          : (Array.isArray(value) ? value : []) as string[]
      return (
        <div className="space-y-2">
          {options.map((opt, i) => (
            <label key={`${field.id}-${i}`} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={arr.includes(opt)}
                onChange={(e) => {
                  const next = e.target.checked
                    ? [...arr.filter((x) => x !== opt), opt]
                    : arr.filter((x) => x !== opt)
                  onChange(field.allowOther ? { _options: next, _other: otherVal } : next)
                }}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">{opt}</span>
            </label>
          ))}
          {field.allowOther && (
            <div className="flex items-center gap-2 pl-6">
              <span className="text-sm text-gray-600">Other:</span>
              <input
                type="text"
                value={(typeof otherVal === 'string' ? otherVal : '') ?? ''}
                onChange={(e) => onChange({ _options: arr, _other: e.target.value })}
                placeholder="Please specify"
                className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm"
              />
            </div>
          )}
        </div>
      )
    }
    case 'file':
      return (
        <input
          id={id}
          type="file"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (!file) {
              onChange(undefined)
              return
            }
            const reader = new FileReader()
            reader.onload = () => onChange(reader.result)
            reader.readAsDataURL(file)
          }}
          className="w-full text-sm text-gray-600 file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-primary-50 file:text-primary-700"
        />
      )
    default:
      return (
        <input
          id={id}
          type="text"
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      )
  }
}
