'use client'

import { useState } from 'react'
import { parseFormFields } from '@/lib/form-template-types'
import { FormTemplateView } from '@/components/forms/FormTemplateView'
import { submitForm, requestEditAccess, updateFormSubmission } from '@/app/actions/form-templates'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Edit, Loader2 } from 'lucide-react'
import Link from 'next/link'

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
  editRequested: boolean
  editApproved: boolean
  editDenyReason: string | null
}

type Props = {
  template: TemplateForRender
  existingSubmission?: SubmissionData | null
}

export function StaffFormFill({ template, existingSubmission }: Props) {
  const router = useRouter()
  const fields = parseFormFields(template.formFields)
  
  const initialValues = existingSubmission 
    ? JSON.parse(existingSubmission.formData) 
    : {}
  
  const [values, setValues] = useState<Record<string, unknown>>(initialValues)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [requestingEdit, setRequestingEdit] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const canEdit = !existingSubmission || existingSubmission.editApproved
  const hasSubmission = !!existingSubmission
  const editRequested = existingSubmission?.editRequested || false
  const editDenied = !!existingSubmission?.editDenyReason

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

  const handleRequestEdit = async () => {
    if (!existingSubmission) return
    setRequestingEdit(true)
    setError(null)
    try {
      const result = await requestEditAccess(existingSubmission.id)
      if (result.error) {
        setError(result.error)
      } else {
        router.refresh()
      }
    } catch (e) {
      setError('Failed to request edit access')
    } finally {
      setRequestingEdit(false)
    }
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

      let result
      if (existingSubmission && existingSubmission.editApproved) {
        // Update existing submission
        result = await updateFormSubmission(
          existingSubmission.id,
          formData,
          attachments.length ? attachments : undefined
        )
      } else {
        // Create new submission
        result = await submitForm({
          templateId: template.id,
          formData,
          attachments: attachments.length ? attachments : undefined,
        })
      }

      if (result.error) {
        setError(result.error)
      } else {
        router.push('/staff/forms?tab=submissions')
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
          href={`/staff/forms/${template.id}`}
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 mb-2"
        >
          <ArrowLeft className="w-3 h-3" /> Back to Form Details
        </Link>
      </div>

      {/* Edit Request Status */}
      {hasSubmission && !canEdit && (
        <div className="flex-shrink-0 mt-4">
          {editRequested && !existingSubmission?.editApproved ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Edit className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Edit Request Pending
                  </h3>
                  <p className="text-xs text-yellow-700 mt-1">
                    Your request to edit this submission is pending admin approval.
                  </p>
                </div>
              </div>
            </div>
          ) : editDenied ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Edit className="w-5 h-5 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-red-800">
                    Edit Request Denied
                  </h3>
                  <p className="text-xs text-red-700 mt-1">
                    {existingSubmission?.editDenyReason 
                      ? `Reason: ${existingSubmission.editDenyReason}` 
                      : 'Your request to edit this submission was denied.'}
                  </p>
                  <button
                    onClick={handleRequestEdit}
                    disabled={requestingEdit}
                    className="mt-2 text-xs text-red-600 hover:text-red-700 font-medium"
                  >
                    {requestingEdit ? 'Requesting...' : 'Request Edit Again'}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Request Edit Button for submitted forms */}
      {hasSubmission && !editRequested && !canEdit && (
        <div className="flex-shrink-0 mt-4">
          <button
            onClick={handleRequestEdit}
            disabled={requestingEdit}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-50 text-primary-700 rounded-lg text-sm font-medium hover:bg-primary-100 disabled:opacity-50"
          >
            {requestingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <Edit className="w-4 h-4" />}
            Request Edit Access
          </button>
        </div>
      )}

      {/* Form */}
      <div className="flex-1 min-h-0 overflow-auto py-4">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {error}
          </div>
        )}
        
        {canEdit ? (
          <FormTemplateView
            title={template.title}
            description={template.description}
            descriptionHtml={template.descriptionHtml}
            fields={fields}
            preview={false}
            values={values}
            onFieldChange={setValue}
            errors={errors}
            submitLabel={hasSubmission ? "Save Changes" : "Submit Form"}
            onSubmit={handleSubmit}
            submitting={submitting}
          />
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
            <Edit className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">
              You cannot edit this submission while your edit request is pending.
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Please wait for admin approval or request edit access above.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
