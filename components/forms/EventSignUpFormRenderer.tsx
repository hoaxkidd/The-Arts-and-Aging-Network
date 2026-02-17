'use client'

import { useState } from 'react'
import { parseFormFields } from '@/lib/form-template-types'
import { FormTemplateView } from './FormTemplateView'

export type TemplateForRender = {
  title: string
  description?: string | null
  formFields: string | null
}

type Props = {
  template: TemplateForRender
  eventTitle?: string
  onSubmit: (formData: Record<string, unknown>, attachments?: string[]) => Promise<void>
}

export function EventSignUpFormRenderer({ template, eventTitle, onSubmit }: Props) {
  const fields = parseFormFields(template.formFields)
  const [values, setValues] = useState<Record<string, unknown>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  const setValue = (fieldId: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }))
    if (errors[fieldId]) setErrors((prev) => ({ ...prev, [fieldId]: '' }))
  }

  const validate = (): boolean => {
    const next: Record<string, string> = {}
    for (const f of fields) {
      if (!f.required) continue
      const v = values[f.id]
      if (v === undefined || v === null || v === '') {
        next[f.id] = 'This field is required'
      } else if (f.type === 'checkbox' && Array.isArray(v) && v.length === 0) {
        next[f.id] = 'Select at least one option'
      }
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    try {
      const attachments: string[] = []
      const formData = { ...values }
      for (const [k, v] of Object.entries(formData)) {
        if (typeof v === 'string' && v.startsWith('data:')) {
          attachments.push(v)
        }
      }
      await onSubmit(formData, attachments.length ? attachments : undefined)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <FormTemplateView
      title={template.title}
      description={template.description}
      fields={fields}
      eventTitle={eventTitle}
      preview={false}
      values={values}
      onFieldChange={setValue}
      errors={errors}
      submitLabel="Submit and request event"
      onSubmit={handleSubmit}
      submitting={submitting}
    />
  )
}
