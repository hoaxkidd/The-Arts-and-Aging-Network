'use client'

import { useState } from 'react'
import { parseFormFields } from '@/lib/form-template-types'
import { FormTemplateView } from '@/components/forms/FormTemplateView'
import { submitForm } from '@/app/actions/form-templates'
import { usePathname, useRouter } from 'next/navigation'
import { ArrowLeft, Lock } from 'lucide-react'
import Link from 'next/link'
import { getStaffBasePathFromPathname } from '@/lib/role-routes'

type TemplateForRender = {
  id: string
  title: string
  description: string | null
  descriptionHtml: string | null
  formFields: string | null
}

type SubmissionData = {
  id: string
  formData: string
}

type Props = {
  template: TemplateForRender
  existingSubmission?: SubmissionData | null
  redirectUrl?: string
}

export function StaffFormFill({ template, existingSubmission, redirectUrl }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const basePath = getStaffBasePathFromPathname(pathname || '/staff')
  const fields = parseFormFields(template.formFields)
  
  const initialValues = existingSubmission 
    ? JSON.parse(existingSubmission.formData) 
    : {}
  
  const [values, setValues] = useState<Record<string, unknown>>(initialValues)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hasSubmission = !!existingSubmission
  const previewValues = existingSubmission ? JSON.parse(existingSubmission.formData || '{}') : {}

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
    setError(null)
    try {
      const attachments: string[] = []
      const formData = { ...values }
      for (const [k, v] of Object.entries(formData)) {
        if (typeof v === 'string' && v.startsWith('data:')) {
          attachments.push(v)
        }
      }

      const result = await submitForm({
        templateId: template.id,
        formData,
        attachments: attachments.length ? attachments : undefined,
      })

      if (result.error) {
        setError(result.error)
      } else {
        const destination = redirectUrl || `${basePath}/forms?tab=submissions`
        router.push(destination)
      }
    } catch (e) {
      setError('Failed to submit form. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 pb-3 border-b border-gray-200">
        <Link
          href={`${basePath}/forms/${template.id}`}
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 mb-2"
        >
          <ArrowLeft className="w-3 h-3" /> Back to Form Details
        </Link>
      </div>

      {/* Form */}
      <div className="flex-1 min-h-0 overflow-auto py-4">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {error}
          </div>
        )}
        
        {!hasSubmission ? (
          <FormTemplateView
            title={template.title}
            description={template.description}
            descriptionHtml={template.descriptionHtml}
            fields={fields}
            preview={false}
            values={values}
            onFieldChange={setValue}
            errors={errors}
            submitLabel="Submit Form"
            onSubmit={handleSubmit}
            submitting={submitting}
          />
        ) : (
          <div className="space-y-4">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
              <Lock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-700 font-medium">
                This form has already been submitted.
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Sensitive forms can only be submitted once. Your latest submission is shown below.
              </p>
            </div>

            <FormTemplateView
              title={`${template.title} (Submitted Preview)`}
              description={template.description}
              descriptionHtml={template.descriptionHtml}
              fields={fields}
              preview
              values={previewValues}
              onFieldChange={() => {}}
              errors={{}}
              submitLabel="Submitted"
              submitting={false}
            />
          </div>
        )}
      </div>
    </div>
  )
}
