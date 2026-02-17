'use client'

import type { FormTemplateField } from '@/lib/form-template-types'
import { cn } from '@/lib/utils'
import { AddressAutocomplete } from '@/components/ui/AddressAutocomplete'

export type FormTemplateViewProps = {
  title: string
  description?: string | null
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
}

/**
 * Shared presentational form view: title, description, and field list.
 * Used by EventSignUpFormRenderer (fill mode) and FormTemplateBuilder (preview mode).
 */
export function FormTemplateView({
  title,
  description,
  fields,
  eventTitle,
  preview = false,
  values = {},
  onFieldChange,
  errors = {},
  submitLabel,
  onSubmit,
  submitting = false,
}: FormTemplateViewProps) {
  const content = (
    <>
      {eventTitle && (
        <div className="pb-2 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">{eventTitle}</h2>
        </div>
      )}
      <div>
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        {description && (
          <div className="mt-1 max-h-[120px] overflow-y-auto custom-scrollbar pr-2">
            <p className="text-sm text-gray-500 whitespace-pre-wrap">
              {description}
            </p>
          </div>
        )}
      </div>

      {fields.length === 0 && preview && (
        <p className="text-sm text-gray-500 py-4 rounded-lg border border-dashed border-gray-200 bg-gray-50/50 px-4">
          Add fields in the builder to see them here.
        </p>
      )}

      {fields.map((field) => (
        <div
          key={field.id}
          className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
        >
          <label className="block text-sm font-medium text-gray-900 mb-1">
            {field.label || '(Untitled field)'}
            {field.required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
          {field.description && (
            <p className="text-xs text-gray-500 mb-2">{field.description}</p>
          )}
          {preview ? (
            <FieldInputPreview field={field} />
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
      ))}

      {!preview && submitLabel != null && (
        <div className="pt-4">
          <button
            type="submit"
            disabled={submitting}
            className={cn(
              'px-4 py-2.5 rounded-lg text-sm font-medium bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-50',
              submitting && 'pointer-events-none'
            )}
          >
            {submitting ? 'Submitting...' : submitLabel}
          </button>
        </div>
      )}
    </>
  )

  if (preview) {
    return (
      <div className="space-y-6 max-w-2xl">
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
      className="space-y-6 max-w-2xl"
    >
      {content}
    </form>
  )
}

/** Read-only placeholder rendering for preview mode */
function FieldInputPreview({ field }: { field: FormTemplateField }) {
  const id = `preview-${field.id}`
  const placeholder = 'Sample answer'

  switch (field.type) {
    case 'short_text':
      return (
        <input
          id={id}
          type="text"
          readOnly
          disabled
          placeholder={field.placeholder || placeholder}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
        />
      )
    case 'long_text':
      return (
        <textarea
          id={id}
          readOnly
          disabled
          placeholder={field.placeholder || placeholder}
          rows={4}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
        />
      )
    case 'date':
      return (
        <input
          id={id}
          type="date"
          readOnly
          disabled
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
        />
      )
    case 'radio': {
      const options = (field.options || []).filter(Boolean)
      return (
        <div className="space-y-2">
          {options.length === 0 ? (
            <span className="text-sm text-gray-400">(No options yet)</span>
          ) : (
            options.map((opt, i) => (
              <label key={`${field.id}-${i}`} className="flex items-center gap-2">
                <input type="radio" name={id} disabled className="rounded border-gray-300" />
                <span className="text-sm text-gray-600">{opt}</span>
              </label>
            ))
          )}
          {field.allowOther && (
            <div className="flex items-center gap-2 pl-6">
              <span className="text-sm text-gray-500">Other:</span>
              <input
                type="text"
                readOnly
                disabled
                placeholder="Please specify"
                className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
              />
            </div>
          )}
        </div>
      )
    }
    case 'checkbox': {
      const options = (field.options || []).filter(Boolean)
      return (
        <div className="space-y-2">
          {options.length === 0 ? (
            <span className="text-sm text-gray-400">(No options yet)</span>
          ) : (
            options.map((opt, i) => (
              <label key={`${field.id}-${i}`} className="flex items-center gap-2">
                <input type="checkbox" disabled className="rounded border-gray-300" />
                <span className="text-sm text-gray-600">{opt}</span>
              </label>
            ))
          )}
          {field.allowOther && (
            <div className="flex items-center gap-2 pl-6">
              <span className="text-sm text-gray-500">Other:</span>
              <input
                type="text"
                readOnly
                disabled
                placeholder="Please specify"
                className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
              />
            </div>
          )}
        </div>
      )
    }
    case 'file':
      return (
        <div className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-gray-50 text-gray-500 cursor-not-allowed">
          Choose file (preview)
        </div>
      )
    case 'address':
      return (
        <div className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-gray-50 text-gray-500 cursor-not-allowed">
          Address with autocomplete (preview)
        </div>
      )
    default:
      return (
        <input
          id={id}
          type="text"
          readOnly
          disabled
          placeholder={placeholder}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
        />
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
    case 'date':
      return (
        <input
          id={id}
          type="date"
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />
      )
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
