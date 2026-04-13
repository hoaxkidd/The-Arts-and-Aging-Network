'use client'

import { useEffect, useState } from 'react'
import { Eye, PenLine, X, Check } from 'lucide-react'
import { parseFormFields } from '@/lib/form-template-types'
import { FormTemplateView } from '@/components/forms/FormTemplateView'
import { submitForm } from '@/app/actions/form-templates'
import { cn } from '@/lib/utils'
import { STYLES } from '@/lib/styles'

type TemplateForActions = {
  id: string
  title: string
  description: string | null
  descriptionHtml: string | null
  category: string
  isFillable: boolean
  formFields: string | null
}

type ExistingSubmission = {
  id: string
  formData: string
  status: string
  createdAt: string | Date
}

type Mode = 'preview' | 'fill' | 'view'

export function FormActionButtons({
  template,
  existingSubmission,
  isProgramCoordinator,
  className,
}: {
  template: TemplateForActions
  existingSubmission?: ExistingSubmission | null
  isProgramCoordinator: boolean
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<Mode>('preview')
  const [values, setValues] = useState<Record<string, unknown>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  const fields = parseFormFields(template.formFields)
  const allowsMultiple = template.category === 'EVENT_SIGNUP' && isProgramCoordinator
  const hasSubmission = Boolean(existingSubmission)
  const isSingleSubmit = !allowsMultiple

  useEffect(() => {
    if (!open) return
    if (mode === 'view' && existingSubmission?.formData) {
      try {
        setValues(JSON.parse(existingSubmission.formData))
      } catch {
        setValues({})
      }
    } else {
      setValues({})
    }
    setErrors({})
    setSubmitError(null)
    setSubmitSuccess(false)
  }, [open, mode, existingSubmission])

  const validate = () => {
    const next: Record<string, string> = {}
    for (const field of fields) {
      if (!field.required) continue
      const value = values[field.id]
      if (value === undefined || value === null || value === '') {
        next[field.id] = 'This field is required'
      } else if (field.type === 'checkbox' && Array.isArray(value) && value.length === 0) {
        next[field.id] = 'Select at least one option'
      }
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (mode !== 'fill') return
    if (!validate()) return

    setSubmitting(true)
    setSubmitError(null)
    try {
      const attachments: string[] = []
      for (const value of Object.values(values)) {
        if (typeof value === 'string' && value.startsWith('data:')) attachments.push(value)
      }

      const result = await submitForm({
        templateId: template.id,
        formData: values,
        attachments: attachments.length ? attachments : undefined,
      })

      if (result.error) {
        setSubmitError(result.error)
      } else {
        setSubmitSuccess(true)
        setTimeout(() => {
          window.location.reload()
        }, 900)
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (!template.isFillable) return null

  return (
    <div className={cn('space-y-2', className)}>
      {isSingleSubmit ? (
        hasSubmission ? (
          <button
            onClick={() => { setMode('view'); setOpen(true) }}
            className={cn(STYLES.btn, STYLES.btnSecondary, 'w-full justify-center')}
          >
            <Eye className="w-4 h-4" />
            View
          </button>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => { setMode('preview'); setOpen(true) }}
              className={cn(STYLES.btn, STYLES.btnSecondary, 'justify-center')}
            >
              <Eye className="w-4 h-4" />
              Preview
            </button>
            <button
              onClick={() => { setMode('fill'); setOpen(true) }}
              className={cn(STYLES.btn, STYLES.btnPrimary, 'justify-center')}
            >
              <PenLine className="w-4 h-4" />
              Fill
            </button>
          </div>
        )
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => { setMode('preview'); setOpen(true) }}
            className={cn(STYLES.btn, STYLES.btnSecondary, 'justify-center')}
          >
            <Eye className="w-4 h-4" />
            Preview
          </button>
          <button
            onClick={() => { setMode('fill'); setOpen(true) }}
            className={cn(STYLES.btn, STYLES.btnPrimary, 'justify-center')}
          >
            <PenLine className="w-4 h-4" />
            Fill
          </button>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-base font-semibold text-gray-900">
                {mode === 'fill' ? 'Fill Form' : mode === 'preview' ? 'Form Preview' : 'Submitted Form'}
              </h3>
              <button onClick={() => setOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            {submitSuccess && (
              <div className="px-4 py-3 bg-green-50 border-b border-green-100 text-green-700 text-sm flex items-center gap-2">
                <Check className="w-4 h-4" />
                Submitted successfully.
              </div>
            )}
            {submitError && (
              <div className="px-4 py-3 bg-red-50 border-b border-red-100 text-red-700 text-sm">{submitError}</div>
            )}

            <div className="flex-1 overflow-auto p-4">
              <FormTemplateView
                title={mode === 'view' ? `${template.title} (Submitted)` : template.title}
                description={template.description}
                descriptionHtml={template.descriptionHtml}
                fields={fields}
                preview={mode !== 'fill'}
                values={values}
                onFieldChange={mode === 'fill' ? (id, value) => setValues((prev) => ({ ...prev, [id]: value })) : undefined}
                errors={errors}
                submitLabel={mode === 'fill' ? 'Submit Form' : undefined}
                onSubmit={mode === 'fill' ? onSubmit : undefined}
                submitting={submitting}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
