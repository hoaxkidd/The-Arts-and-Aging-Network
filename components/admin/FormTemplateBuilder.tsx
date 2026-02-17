'use client'

import { useState } from 'react'
import { Trash2, Save, Loader2, ChevronDown, Eye } from 'lucide-react'
import type { FormTemplateField, FormFieldType } from '@/lib/form-template-types'
import { FORM_FIELD_TYPES, parseFormFields } from '@/lib/form-template-types'
import { createFormTemplate, updateFormTemplate } from '@/app/actions/form-templates'
import { FormTemplateView } from '@/components/forms/FormTemplateView'

const CATEGORIES = [
  { value: 'EVENT_SIGNUP', label: 'Event sign-up' },
  { value: 'INCIDENT', label: 'Incident Reports' },
  { value: 'FEEDBACK', label: 'Feedback Forms' },
  { value: 'EVALUATION', label: 'Evaluations' },
  { value: 'ADMINISTRATIVE', label: 'Administrative' },
  { value: 'HEALTH_SAFETY', label: 'Health & Safety' },
  { value: 'OTHER', label: 'Other' },
]

function newField(type: FormFieldType): FormTemplateField {
  const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `f-${Date.now()}-${Math.random().toString(36).slice(2)}`
  const base = {
    id,
    type,
    label: '',
    required: false,
  }
  if (type === 'radio' || type === 'checkbox') {
    return { ...base, options: [], allowOther: false } as FormTemplateField
  }
  return base as FormTemplateField
}

type Props = {
  templateId?: string
  initialTitle?: string
  initialDescription?: string | null
  initialCategory?: string
  initialFormFields?: string | null
  /** Called after successful create (not on update). Receives the new template. */
  onCreated?: (template: { id: string; title: string }) => void
}

export function FormTemplateBuilder({
  templateId,
  initialTitle = '',
  initialDescription = '',
  initialCategory = 'EVENT_SIGNUP',
  initialFormFields = null,
  onCreated,
}: Props) {
  const [title, setTitle] = useState(initialTitle)
  const [description, setDescription] = useState(initialDescription || '')
  const [category, setCategory] = useState(initialCategory)
  const [fields, setFields] = useState<FormTemplateField[]>(() =>
    parseFormFields(initialFormFields)
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const addField = (type: FormFieldType) => {
    setFields((prev) => [...prev, newField(type)])
  }

  const removeField = (index: number) => {
    setFields((prev) => prev.filter((_, i) => i !== index))
  }

  const updateField = (index: number, updates: Partial<FormTemplateField>) => {
    setFields((prev) =>
      prev.map((f, i) =>
        i === index ? ({ ...f, ...updates } as FormTemplateField) : f
      )
    )
  }

  const moveField = (index: number, dir: number) => {
    const next = index + dir
    if (next < 0 || next >= fields.length) return
    setFields((prev) => {
      const copy = [...prev]
      ;[copy[index], copy[next]] = [copy[next], copy[index]]
      return copy
    })
  }

  const handleSave = async () => {
    setError(null)
    setSuccess(false)
    if (!title.trim()) {
      setError('Title is required')
      return
    }
    setSaving(true)
    try {
      const cleanedFields = fields.map((f) => {
        if ((f.type === 'radio' || f.type === 'checkbox') && f.options) {
          return { ...f, options: f.options.filter(Boolean) }
        }
        return f
      })
      const formFieldsJson = JSON.stringify(cleanedFields)
      const isFillable = fields.length > 0
      if (templateId) {
        const res = await updateFormTemplate(templateId, {
          title: title.trim(),
          description: description.trim() || undefined,
          category,
          formFields: formFieldsJson,
          isFillable,
        })
        if (res.error) throw new Error(res.error)
      } else {
        const res = await createFormTemplate({
          title: title.trim(),
          description: description.trim() || undefined,
          category,
          formFields: formFieldsJson,
          isFillable,
        })
        if (res.error) throw new Error(res.error)
        if (res.data && onCreated) onCreated({ id: res.data.id, title: res.data.title })
      }
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col lg:flex-row lg:items-stretch gap-6 lg:gap-8 w-full max-w-6xl lg:h-[calc(100vh-11rem)] lg:min-h-[500px]">
      {/* Left: Builder */}
      <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-y-auto custom-scrollbar pr-1">
        <div className="space-y-6 pb-4">
        <div className="border border-gray-200 rounded-lg p-6 space-y-4 bg-white">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <h2 className="text-sm font-semibold text-gray-900">Template details</h2>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-50 flex-shrink-0"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save template
            </button>
          </div>
          {(error || success) && (
            <div className="flex flex-col gap-2">
              {error && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
              )}
              {success && (
                <p className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">
                  Template saved.
                </p>
              )}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="e.g. Sunshine Singer Auditions 2026"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full h-[120px] overflow-y-auto resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 custom-scrollbar"
              placeholder="Instructions or context for respondents"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg p-6 space-y-4 bg-white">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-sm font-semibold text-gray-900">Form fields</h2>
            <div className="flex items-center gap-1 flex-wrap">
              {FORM_FIELD_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => addField(type)}
                  className="px-2 py-1.5 text-xs font-medium text-primary-600 bg-primary-50 rounded hover:bg-primary-100"
                >
                  + {type.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {fields.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 min-h-[120px]">
              Add at least one field. Use the buttons above to add short text,
              long text, radio, checkbox, date, file, or address.
            </p>
          ) : (
            <div
              className="space-y-4 max-h-[400px] min-h-[120px] overflow-y-auto custom-scrollbar pr-1"
              role="region"
              aria-label="Form field list"
            >
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="border border-gray-200 rounded-lg p-4 bg-gray-50/50 space-y-3"
                >
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => moveField(index, -1)}
                      disabled={index === 0}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-40"
                    >
                      <ChevronDown className="w-4 h-4 rotate-90" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveField(index, 1)}
                      disabled={index === fields.length - 1}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-40"
                    >
                      <ChevronDown className="w-4 h-4 -rotate-90" />
                    </button>
                    <span className="text-xs font-medium text-gray-500">
                      {field.type}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeField(index)}
                      className="ml-auto p-1 text-red-500 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Label
                    </label>
                    <input
                      type="text"
                      value={field.label}
                      onChange={(e) =>
                        updateField(index, { label: e.target.value })
                      }
                      className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                      placeholder="Question or field label"
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={(e) =>
                          updateField(index, { required: e.target.checked })
                        }
                      />
                      Required
                    </label>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Placeholder (optional)
                    </label>
                    <input
                      type="text"
                      value={field.placeholder ?? ''}
                      onChange={(e) =>
                        updateField(index, {
                          placeholder: e.target.value || undefined,
                        })
                      }
                      className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Description / help text (optional)
                    </label>
                    <input
                      type="text"
                      value={field.description ?? ''}
                      onChange={(e) =>
                        updateField(index, {
                          description: e.target.value || undefined,
                        })
                      }
                      className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                    />
                  </div>
                  {(field.type === 'radio' || field.type === 'checkbox') && (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Options (one per line)
                        </label>
                        <p className="text-xs text-gray-500 mb-1">Enter each option on its own line.</p>
                        <textarea
                          value={(field.options || []).join('\n')}
                          onChange={(e) => {
                            const raw = e.target.value
                            const lines = raw.split(/\r?\n/).map((s) => s.trim())
                            const endsWithNewline = /\r?\n$/.test(raw)
                            const options = endsWithNewline
                              ? [...lines.filter(Boolean), '']
                              : lines.filter(Boolean)
                            updateField(index, { options })
                          }}
                          rows={4}
                          className="w-full min-h-[80px] resize-none rounded border border-gray-300 px-2 py-1.5 text-sm"
                          placeholder="Yes\nNo\nMaybe"
                          aria-label="Options (one per line)"
                        />
                      </div>
                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={field.allowOther ?? false}
                          onChange={(e) =>
                            updateField(index, {
                              allowOther: e.target.checked,
                            })
                          }
                        />
                        Allow &quot;Other&quot; with text input
                      </label>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        </div>
      </div>

      {/* Right: Live preview */}
      <div className="lg:w-[380px] xl:w-[420px] flex-shrink-0 flex flex-col min-h-0">
        <div className="sticky top-4 flex-1 min-h-0 flex flex-col border border-gray-200 rounded-lg bg-white shadow-sm overflow-hidden">
          <div className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 border-b border-gray-200 bg-gray-50">
            <Eye className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">
              How home admins will see this form
            </span>
          </div>
          <div className="flex-1 min-h-0 p-4 pr-2 overflow-y-auto custom-scrollbar">
            <FormTemplateView
              title={title || '(Untitled form)'}
              description={description || null}
              fields={fields}
              preview
            />
          </div>
        </div>
      </div>
    </div>
  )
}
