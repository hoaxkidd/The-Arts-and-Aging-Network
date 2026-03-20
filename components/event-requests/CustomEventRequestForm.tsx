'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { STYLES } from '@/lib/styles'
import { createCustomEventRequest } from '@/app/actions/event-requests'
import { getEventSignupForms } from '@/app/actions/form-templates'
import { FormTemplateView } from '@/components/forms/FormTemplateView'
import type { FormTemplateField } from '@/lib/form-template-types'

type FormTemplate = {
  id: string
  title: string
  description: string | null
  descriptionHtml: string | null
  formFields: string | null
}

export function CustomEventRequestForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [success, setSuccess] = useState(false)
  const [formTemplates, setFormTemplates] = useState<FormTemplate[]>([])
  const [selectedFormId, setSelectedFormId] = useState('')
  const [formValues, setFormValues] = useState<Record<string, unknown>>({})
  const [isLoadingForms, setIsLoadingForms] = useState(true)

  useEffect(() => {
    async function fetchForms() {
      try {
        const result = await getEventSignupForms()
        if (result.success && result.data) {
          setFormTemplates(result.data as FormTemplate[])
        }
      } catch (error) {
        console.error('Error fetching forms:', error)
      } finally {
        setIsLoadingForms(false)
      }
    }
    fetchForms()
  }, [])

  const selectedForm = formTemplates.find(f => f.id === selectedFormId)
  
  const getFormFields = (): FormTemplateField[] => {
    if (!selectedForm?.formFields) return []
    try {
      return JSON.parse(selectedForm.formFields) as FormTemplateField[]
    } catch {
      return []
    }
  }

  const handleFormSelection = (formId: string) => {
    setSelectedFormId(formId)
    setFormValues({})
    setErrors({})
  }

  const handleFieldChange = (fieldId: string, value: unknown) => {
    setFormValues(prev => ({ ...prev, [fieldId]: value }))
  }

  const isEmptyValue = (value: unknown): boolean => {
    if (value === undefined || value === null) return true
    if (typeof value === 'string') return value.trim() === ''
    if (Array.isArray(value)) return value.length === 0
    return false
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!selectedFormId) {
      newErrors.formTemplate = 'Please select a form'
    }

    // Validate required form fields
    const fields = getFormFields()
    for (const field of fields) {
      if (field.required) {
        const value = formValues[field.id]
        if (isEmptyValue(value)) {
          newErrors[field.id] = `${field.label || 'This field'} is required`
        }
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    startTransition(async () => {
      const requestData = {
        formTemplateId: selectedFormId,
        formData: formValues
      }

      const result = await createCustomEventRequest(requestData)

      if (result.error) {
        setErrors({ submit: result.error })
      } else {
        setSuccess(true)
        setTimeout(() => {
          router.push('/dashboard/requests')
        }, 2000)
      }
    })
  }

  if (success) {
    return (
      <div className="bg-white rounded-lg border border-green-200 p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Request Submitted!</h2>
        <p className="text-gray-600 mb-4">
          Your custom event request has been submitted for review. You'll be notified when an administrator responds.
        </p>
        <p className="text-sm text-gray-500">Redirecting to your requests...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Error Banner */}
      {errors.submit && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-700">{errors.submit}</p>
        </div>
      )}

      {/* Form Card */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-6 space-y-5">
          <h2 className="font-semibold text-gray-900">
            Select Event Sign-up Form
          </h2>

          {/* Form Template Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Event Form <span className="text-red-500">*</span>
            </label>
            {isLoadingForms ? (
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading available forms...
              </div>
            ) : (
              <select
                value={selectedFormId}
                onChange={(e) => handleFormSelection(e.target.value)}
                className={cn(STYLES.input, errors.formTemplate && "border-red-300")}
              >
                <option value="">-- Select an event form --</option>
                {formTemplates.map((form) => (
                  <option key={form.id} value={form.id}>
                    {form.title}
                  </option>
                ))}
              </select>
            )}
            {errors.formTemplate && (
              <p className="mt-1 text-xs text-red-500">{errors.formTemplate}</p>
            )}
            {!isLoadingForms && formTemplates.length === 0 && (
              <p className="mt-1 text-xs text-amber-600">
                No event forms available. Please check back later or contact your administrator.
              </p>
            )}
          </div>
        </div>

        {/* Form Fields */}
        {selectedForm && (
          <div className="border-t border-gray-100">
            <FormTemplateView
              title={selectedForm.title}
              description={selectedForm.description}
              descriptionHtml={selectedForm.descriptionHtml}
              fields={getFormFields()}
              values={formValues}
              onFieldChange={handleFieldChange}
              errors={errors}
              onSubmit={handleSubmit}
              submitting={isPending}
            />
          </div>
        )}

        {/* Actions */}
        {selectedForm && (
          <div className="p-6 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
            <Link
              href="/dashboard/requests"
              className={cn(STYLES.btn, "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50")}
            >
              Cancel
            </Link>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isPending}
              className={cn(STYLES.btn, STYLES.btnPrimary, "flex items-center gap-2")}
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Submit Request
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
