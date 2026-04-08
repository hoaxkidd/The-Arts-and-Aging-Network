'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Trash2, Save, Loader2, ChevronDown, ChevronUp, Eye, Users, Globe, Lock, Check, ArrowLeft, X } from 'lucide-react'
import type { FormTemplateField, FormFieldType } from '@/lib/form-template-types'
import { FORM_FIELD_TYPES, parseFormFields } from '@/lib/form-template-types'
import { createFormTemplate, updateFormTemplate } from '@/app/actions/form-templates'
import { FormTemplateView } from '@/components/forms/FormTemplateView'
import { VALID_ROLES, ROLE_LABELS } from '@/lib/roles'
import { cn } from '@/lib/utils'
import { RichTextEditor } from '@/components/ui/RichTextEditor'

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
  initialDescriptionHtml?: string | null
  initialCategory?: string
  initialFormFields?: string | null
  initialIsPublic?: boolean
  initialAllowedRoles?: string | null
  /** Called after successful create (not on update). Receives the new template. */
  onCreated?: (template: { id: string; title: string }) => void
}

export function FormTemplateBuilder({
  templateId,
  initialTitle = '',
  initialDescription = '',
  initialDescriptionHtml = '',
  initialCategory = 'EVENT_SIGNUP',
  initialFormFields = null,
  initialIsPublic = true,
  initialAllowedRoles = null,
  onCreated,
}: Props) {
  const [title, setTitle] = useState(initialTitle)
  const [description, setDescription] = useState(initialDescription || '')
  const [descriptionHtml, setDescriptionHtml] = useState(initialDescriptionHtml || '')
  const [category, setCategory] = useState(initialCategory)
  const [isPublic, setIsPublic] = useState(initialIsPublic)
  const [selectedRoles, setSelectedRoles] = useState<string[]>(
    initialAllowedRoles ? initialAllowedRoles.split(',') : []
  )
  const [fields, setFields] = useState<FormTemplateField[]>(() =>
    parseFormFields(initialFormFields)
  )
  const [focusedFieldId, setFocusedFieldId] = useState<string | null>(null)
  const fieldRefs = useRef<{ [key: string]: HTMLDivElement }>({})
  const previewRef = useRef<HTMLDivElement>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [accessControlMinimized, setAccessControlMinimized] = useState(false)
  const router = useRouter()
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showUnsavedModal, setShowUnsavedModal] = useState(false)
  const builderScrollRef = useRef<HTMLDivElement>(null)
  const fieldsScrollRef = useRef<HTMLDivElement>(null)

  // Store initial state snapshot for comparison (initialized after first render)
  const [mounted, setMounted] = useState(false)
  const initialSnapshot = useRef<{
    title: string
    description: string
    descriptionHtml: string
    category: string
    isPublic: boolean
    selectedRoles: string[]
    fields: FormTemplateField[]
  } | null>(null)

  // Initialize snapshot after mount
  useEffect(() => {
    if (!mounted) {
      initialSnapshot.current = {
        title: initialTitle,
        description: initialDescription || '',
        descriptionHtml: initialDescriptionHtml || '',
        category: initialCategory,
        isPublic: initialIsPublic,
        selectedRoles: initialAllowedRoles ? initialAllowedRoles.split(',') : [],
        fields: parseFormFields(initialFormFields)
      }
      setMounted(true)
    }
  }, [mounted, initialTitle, initialDescription, initialDescriptionHtml, initialCategory, initialIsPublic, initialAllowedRoles, initialFormFields])

  // Track unsaved changes - only after mount and snapshot is initialized
  useEffect(() => {
    if (!mounted || !initialSnapshot.current) return
    
    const titleChanged = title !== initialSnapshot.current.title
    const descChanged = description !== initialSnapshot.current.description
    const descHtmlChanged = descriptionHtml !== initialSnapshot.current.descriptionHtml
    const categoryChanged = category !== initialSnapshot.current.category
    const isPublicChanged = isPublic !== initialSnapshot.current.isPublic
    const rolesChanged = JSON.stringify(selectedRoles || []) !== JSON.stringify(initialSnapshot.current.selectedRoles || [])
    const fieldsChanged = JSON.stringify(fields || []) !== JSON.stringify(initialSnapshot.current.fields || [])
    
    const hasChanges = titleChanged || descChanged || descHtmlChanged || categoryChanged || isPublicChanged || rolesChanged || fieldsChanged
    
    setHasUnsavedChanges(hasChanges)
  }, [title, description, descriptionHtml, category, isPublic, selectedRoles, fields, mounted])

  // Browser-level warning for unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  // Handle back button with unsaved changes
  const handleBack = () => {
    if (hasUnsavedChanges) {
      setShowUnsavedModal(true)
    } else {
      router.push('/admin/forms?tab=templates')
    }
  }

  const confirmDiscard = () => {
    setShowUnsavedModal(false)
    router.push('/admin/forms?tab=templates')
  }

  // Auto-scroll to focused field
  useEffect(() => {
    if (focusedFieldId) {
      setTimeout(() => {
        // Scroll field into view in the builder
        if (fieldRefs.current[focusedFieldId]) {
          fieldRefs.current[focusedFieldId]?.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          })
        }
        // Also scroll preview to show the new field
        if (previewRef.current) {
          previewRef.current.scrollTo({ 
            top: previewRef.current.scrollHeight, 
            behavior: 'smooth' 
          })
        }
        setFocusedFieldId(null)
      }, 300)
    }
  }, [focusedFieldId])

  const addField = (type: FormFieldType) => {
    const field = newField(type)
    setFields((prev) => [...prev, field])
    setFocusedFieldId(field.id)
    
    // Scroll both preview and fields list to bottom after adding field
    setTimeout(() => {
      previewRef.current?.scrollTo({ top: previewRef.current.scrollHeight, behavior: 'smooth' })
      fieldsScrollRef.current?.scrollTo({ top: fieldsScrollRef.current.scrollHeight, behavior: 'smooth' })
    }, 150)
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

  const toggleRole = (role: string) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    )
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
          descriptionHtml: descriptionHtml || undefined,
          category,
          formFields: formFieldsJson,
          isFillable,
          isPublic,
          allowedRoles: selectedRoles,
        })
        if (res.error) throw new Error(res.error)
      } else {
        const res = await createFormTemplate({
          title: title.trim(),
          description: description.trim() || undefined,
          descriptionHtml: descriptionHtml || undefined,
          category,
          formFields: formFieldsJson,
          isFillable,
          isPublic,
          allowedRoles: selectedRoles,
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
    <div className="flex flex-col lg:flex-row lg:items-stretch gap-6 lg:gap-8 w-full max-w-[90vw] lg:h-[calc(100vh-8rem)] lg:min-h-[500px]">
      {/* Left: Builder */}
      <div className="flex-1 min-w-0 min-h-0 flex flex-col">
        {/* Fixed Header with Save Button */}
        <div className="sticky top-0 z-10 bg-gray-50 border border-gray-200 rounded-t-lg p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBack}
              className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-sm font-semibold text-gray-900">
              {templateId ? 'Edit Template' : 'Create Template'}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            {(error || success) && (
              <span className={success ? "text-sm text-green-600" : "text-sm text-red-600"}>
                {success ? 'Saved!' : error}
              </span>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save
            </button>
          </div>
        </div>
        {/* Scrollable Content */}
        <div ref={builderScrollRef} className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1 border border-t-0 border-gray-200 rounded-b-lg bg-white">
          <div className="space-y-6 p-4 pb-4">
          <div className="border border-gray-200 rounded-lg p-4 space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Template details</h3>
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
            <RichTextEditor
              value={descriptionHtml}
              onChange={setDescriptionHtml}
              placeholder="Instructions or context for respondents"
              minHeight={100}
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

          {/* Public/Private Toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Visibility
            </label>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setIsPublic(true)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border-2 transition-colors",
                  isPublic
                    ? "border-primary-500 bg-primary-50 text-primary-700"
                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                )}
              >
                <Globe className="w-4 h-4" />
                Public
              </button>
              <button
                type="button"
                onClick={() => setIsPublic(false)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border-2 transition-colors",
                  !isPublic
                    ? "border-purple-500 bg-purple-50 text-purple-700"
                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                )}
              >
                <Lock className="w-4 h-4" />
                Private
              </button>
            </div>
          </div>

          {isPublic && selectedRoles.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
              <div className="mt-0.5 h-5 w-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold">
                !
              </div>
              <div>
                <p className="text-xs font-semibold text-amber-900">Role restrictions will still apply</p>
                <p className="text-xs text-amber-800 mt-0.5">
                  This template is marked <span className="font-medium">Public</span> but has role restrictions selected.
                  It will only be visible to the selected roles.
                </p>
              </div>
            </div>
          )}

          {/* Access Control */}
          {!isPublic && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">
                  <Users className="w-4 h-4 inline mr-1" />
                  Access Control
                </label>
                <button
                  type="button"
                  onClick={() => setAccessControlMinimized(!accessControlMinimized)}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
                >
                  {accessControlMinimized ? (
                    <>
                      <span>{selectedRoles.length} role(s) selected</span>
                      <ChevronDown className="w-3 h-3" />
                    </>
                  ) : (
                    <>
                      <span>Minimize</span>
                      <ChevronUp className="w-3 h-3" />
                    </>
                  )}
                </button>
              </div>
              {!accessControlMinimized && (
                <>
                  <p className="text-xs text-gray-500 mb-2">
                    Select which roles can access this form. If none are selected, this private form will be hidden from all non-admin users.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {VALID_ROLES.map((role) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => toggleRole(role)}
                        className={cn(
                          "flex items-center gap-2 p-2 rounded-lg border transition-colors text-left",
                          selectedRoles.includes(role)
                            ? "border-primary-500 bg-primary-50"
                            : "border-gray-200 hover:border-gray-300"
                        )}
                      >
                        <div className={cn(
                          "w-4 h-4 rounded border flex items-center justify-center",
                          selectedRoles.includes(role)
                            ? "bg-primary-500 border-primary-500"
                            : "border-gray-300"
                        )}>
                          {selectedRoles.includes(role) && (
                            <Check className="w-3 h-3 text-white" />
                          )}
                        </div>
                        <span className="text-sm text-gray-700">{ROLE_LABELS[role]}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

        </div>

        <div className="border border-gray-200 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-sm font-semibold text-gray-900">Form fields</h3>
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
              ref={fieldsScrollRef}
              className="space-y-4 max-h-[400px] min-h-[120px] overflow-y-auto custom-scrollbar pr-1"
              role="region"
              aria-label="Form field list"
              onKeyDown={(e) => {
                const target = e.target as HTMLElement
                if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
                  e.stopPropagation()
                }
              }}
            >
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  ref={(el) => { if (el) fieldRefs.current[field.id] = el }}
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
                      autoFocus={focusedFieldId === field.id}
                      onFocus={() => setFocusedFieldId(null)}
                      className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Question or field label"
                    />
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
                    <RichTextEditor
                      value={field.descriptionHtml ?? field.description ?? ''}
                      onChange={(html) =>
                        updateField(index, {
                          descriptionHtml: html,
                          description: html.replace(/<[^>]*>/g, '').trim() || undefined,
                        })
                      }
                      placeholder="Additional instructions for this field"
                      minHeight={60}
                    />
                  </div>
                  <div className="flex items-center gap-4 flex-wrap">
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
                    {'date' === field.type && (
                      <label className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={(field as { isDateOfBirth?: boolean }).isDateOfBirth ?? false}
                          onChange={(e) =>
                            updateField(index, {
                              isDateOfBirth: e.target.checked,
                            } as any)
                          }
                        />
                        Date of Birth
                      </label>
                    )}
                  </div>
                  {(field.type === 'radio' || field.type === 'checkbox') && (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Options
                        </label>
                        <p className="text-xs text-gray-500 mb-2">Add options for this field.</p>
                        <div className="space-y-2">
                          {(field.options || []).map((option, optIndex) => (
                            <div key={optIndex} className="flex items-center gap-2">
                              <input
                                type="text"
                                value={option}
                                onChange={(e) => {
                                  const newOptions = [...(field.options || [])]
                                  newOptions[optIndex] = e.target.value
                                  updateField(index, { options: newOptions })
                                }}
                                className="flex-1 rounded border border-gray-300 px-2 py-1.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                placeholder={`Option ${optIndex + 1}`}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const newOptions = (field.options || []).filter((_, i) => i !== optIndex)
                                  updateField(index, { options: newOptions.length ? newOptions : [] })
                                }}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                                title="Remove option"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => {
                              const newOptions = [...(field.options || []), '']
                              updateField(index, { options: newOptions })
                            }}
                            className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                          >
                            + Add Option
                          </button>
                        </div>
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
      <div className="lg:w-[45%] xl:w-[45%] flex-shrink-0 flex flex-col min-h-0">
        <div className="sticky top-4 flex-1 min-h-0 flex flex-col border border-gray-200 rounded-lg bg-white overflow-hidden">
          <div className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 border-b border-gray-200 bg-gray-50">
            <Eye className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">
              How users will see this form
            </span>
          </div>
          <div ref={previewRef} className="flex-1 min-h-0 p-4 pr-2 overflow-y-auto custom-scrollbar">
            <FormTemplateView
              title={title || '(Untitled form)'}
              description={description || null}
              descriptionHtml={descriptionHtml || null}
              fields={fields}
              preview
            />
          </div>
        </div>
      </div>

      {/* Unsaved Changes Modal */}
      {showUnsavedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Unsaved Changes</h3>
            <p className="text-sm text-gray-600 mb-6">
              You have unsaved changes. Are you sure you want to leave?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowUnsavedModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Keep Editing
              </button>
              <button
                type="button"
                onClick={confirmDiscard}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
              >
                Discard Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
