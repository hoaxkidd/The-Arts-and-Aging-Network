'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FileText, Edit2, Trash2, Archive, Loader2, X, Users, PenLine, Check, Edit, Eye, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { deleteFormTemplate, updateFormTemplateRoles, submitForm } from '@/app/actions/form-templates'
import { VALID_ROLES, ROLE_LABELS } from '@/lib/roles'
import { FormTemplateView } from '@/components/forms/FormTemplateView'
import type { FormTemplateField } from '@/lib/form-template-types'
import { parseFormFields } from '@/lib/form-template-types'
import { sanitizeHtml } from "@/lib/dompurify"

type Template = {
  id: string
  title: string
  description: string | null
  descriptionHtml: string | null
  category: string
  isActive: boolean
  isPublic: boolean
  isFillable: boolean
  allowedRoles: string | null
  formFields: string | null
  createdAt: Date | string
  updatedAt: Date | string
  _count: {
    submissions: number
  }
}

type Category = {
  value: string
  label: string
}

type ExistingSubmission = {
  id: string
  formData: string
  status: string
  createdAt: Date
}

type Submission = {
  id: string
  formData: string
  status: string
  createdAt: Date | string
  submitter: {
    name: string | null
    email: string | null
  }
}

const categoryColors: Record<string, string> = {
  INCIDENT: 'bg-red-100 text-red-700',
  FEEDBACK: 'bg-blue-100 text-blue-700',
  EVALUATION: 'bg-purple-100 text-purple-700',
  ADMINISTRATIVE: 'bg-gray-100 text-gray-700',
  HEALTH_SAFETY: 'bg-green-100 text-green-700',
  OTHER: 'bg-orange-100 text-orange-700',
  EVENT_SIGNUP: 'bg-blue-100 text-blue-700'
}

interface FormTemplateCardProps {
  template: Template
  categories: Category[]
  mode?: 'admin' | 'staff'
  fillUrlPrefix?: string
  existingSubmission?: ExistingSubmission | null
  submissions?: Submission[]
}

export function FormTemplateCard({ template, categories, mode = 'admin', fillUrlPrefix = '/staff/forms', existingSubmission, submissions = [] }: FormTemplateCardProps) {
  const router = useRouter()
  const isAdmin = mode === 'admin'

  const [isDeleting, setIsDeleting] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showRolesModal, setShowRolesModal] = useState(false)
  const [showFillModal, setShowFillModal] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [selectedRoles, setSelectedRoles] = useState<string[]>(
    template.allowedRoles ? template.allowedRoles.split(',') : []
  )
  const [isUpdatingRoles, setIsUpdatingRoles] = useState(false)

  // Fill form state
  const [fillValues, setFillValues] = useState<Record<string, unknown>>({})
  const [fillErrors, setFillErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  
  // Admin submission viewing
  const [viewingSubmission, setViewingSubmission] = useState<Submission | null>(null)

  const category = categories.find(c => c.value === template.category)
  
  const currentRoles = template.allowedRoles ? template.allowedRoles.split(',') : []

  // Parse form fields from JSON
  const parsedFields: FormTemplateField[] = template.formFields ? parseFormFields(template.formFields) : []

  const hasSubmission = !!existingSubmission

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this template? This action cannot be undone.')) {
      return
    }

    setIsDeleting(true)
    setDeleteError(null)

    const result = await deleteFormTemplate(template.id)
    
    if (result.error) {
      setDeleteError(result.error)
      setIsDeleting(false)
    } else {
      window.location.reload()
    }
  }

  const toggleRole = (role: string) => {
    if (selectedRoles.includes(role)) {
      setSelectedRoles(selectedRoles.filter(r => r !== role))
    } else {
      setSelectedRoles([...selectedRoles, role])
    }
  }

  const handleSaveRoles = async () => {
    setIsUpdatingRoles(true)
    const result = await updateFormTemplateRoles(template.id, selectedRoles)
    if (result.error) {
      alert(result.error)
    } else {
      window.location.reload()
    }
    setIsUpdatingRoles(false)
  }

  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowViewModal(false)
        setShowRolesModal(false)
        setShowFillModal(false)
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [])

  // Initialize fill values when modal opens
  useEffect(() => {
    if (showFillModal) {
      if (existingSubmission) {
        try {
          setFillValues(JSON.parse(existingSubmission.formData))
        } catch {
          setFillValues({})
        }
      } else {
        setFillValues({})
      }
      setFillErrors({})
      setSubmitError(null)
      setSubmitSuccess(false)
    }
  }, [showFillModal, existingSubmission])

  const handleFillFieldChange = (fieldId: string, value: unknown) => {
    setFillValues((prev) => ({ ...prev, [fieldId]: value }))
    if (fillErrors[fieldId]) setFillErrors((prev) => ({ ...prev, [fieldId]: '' }))
  }

  const validateFillForm = (): boolean => {
    const next: Record<string, string> = {}
    for (const f of parsedFields) {
      if (!f.required) continue
      const v = fillValues[f.id]
      if (v === undefined || v === null || v === '') {
        next[f.id] = 'This field is required'
      } else if (f.type === 'checkbox' && Array.isArray(v) && v.length === 0) {
        next[f.id] = 'Select at least one option'
      }
    }
    setFillErrors(next)
    return Object.keys(next).length === 0
  }

  const handleFillSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateFillForm()) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const attachments: string[] = []
      const formData = { ...fillValues }
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
        setSubmitError(result.error)
      } else {
        setSubmitSuccess(true)
        setTimeout(() => {
          setShowFillModal(false)
          router.refresh()
        }, 1500)
      }
    } catch (e) {
      setSubmitError('Failed to submit form. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200 p-4 transition-colors relative flex flex-col min-h-[280px]">
        {deleteError && (
          <div className="absolute inset-0 bg-white/95 flex items-center justify-center z-10 rounded-lg">
            <div className="text-center p-4">
              <p className="text-red-600 text-sm mb-2">{deleteError}</p>
              <button 
                onClick={() => setDeleteError(null)}
                className="text-xs text-gray-500 underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        <div className="flex-1">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-gray-900 truncate">
                  {template.title}
                </h3>
                <span className={cn(
                  "text-xs px-2 py-0.5 rounded-full inline-block mt-1",
                  categoryColors[template.category] || 'bg-gray-100 text-gray-700'
                )}>
                  {category?.label || template.category}
                </span>
              </div>
            </div>
            {!template.isActive && (
              <Archive className="w-4 h-4 text-gray-400" />
            )}
          </div>

          <div className="mb-3 text-xs text-gray-600 min-h-[1.5rem]">
            {(template.description || template.descriptionHtml) && (
              <div 
                className="line-clamp-2 rich-text-content"
                dangerouslySetInnerHTML={{ 
                  __html: sanitizeHtml(template.descriptionHtml || template.description || '') 
                }} 
              />
            )}
          </div>

          <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
            <div className="flex items-center gap-1">
              <FileText className="w-3 h-3" />
              {template._count.submissions} submitted
            </div>
          </div>

                {/* Role Access */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-500">
                      {currentRoles.length === 0 ? 'All roles' : currentRoles.length === 1 ? currentRoles[0] : `${currentRoles.length} roles`}
                    </span>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => setShowRolesModal(true)}
                      className="text-xs text-primary-600 hover:text-primary-700"
                    >
                      Access Control
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1 mb-3 min-h-[1.5rem]">
                  {currentRoles.length === 0 ? (
                    <span className="text-[10px] px-2 py-0.5 bg-green-100 text-green-700 rounded-full">All roles</span>
                  ) : currentRoles.slice(0, 3).map(role => (
                    <span key={role} className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                      {role}
                    </span>
                  ))}
                  {currentRoles.length > 3 && (
                    <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">
                      +{currentRoles.length - 3}
                    </span>
                  )}
                </div>
        </div>

        <div className="flex items-center gap-2 pt-3 border-t border-gray-100 shrink-0">
          {isAdmin ? (
            <>
              <button
                onClick={() => setShowViewModal(true)}
                className="flex-1 text-center px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 rounded hover:bg-gray-100"
              >
                <Eye className="w-3 h-3 inline mr-1" />
                Preview
              </button>
              <Link
                href={`/admin/forms/${template.id}/edit`}
                className="flex-1 text-center px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 rounded hover:bg-gray-100"
              >
                <Edit2 className="w-3 h-3 inline mr-1" />
                Edit
              </Link>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 text-center px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded hover:bg-red-100 disabled:opacity-50"
              >
                {isDeleting ? (
                  <Loader2 className="w-3 h-3 inline mr-1 animate-spin" />
                ) : (
                  <Trash2 className="w-3 h-3 inline mr-1" />
                )}
                Delete
              </button>
            </>
          ) : (
            template.isFillable && (
              <div className="flex items-center gap-2 w-full">
                <button
                  onClick={() => setShowFillModal(true)}
                  className="flex-1 text-center px-3 py-1.5 text-xs font-medium text-primary-600 bg-primary-50 rounded hover:bg-primary-100"
                >
                  <Eye className="w-3 h-3 inline mr-1" />
                  View
                </button>
                {existingSubmission && (
                  <button
                    onClick={() => setShowFillModal(true)}
                    className="flex-1 text-center px-3 py-1.5 text-xs font-medium text-white bg-primary-600 rounded hover:bg-primary-700"
                  >
                    <PenLine className="w-3 h-3 inline mr-1" />
                    Edit
                  </button>
                )}
              </div>
            )
          )}
        </div>
      </div>

      {/* View Modal */}
      {showViewModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowViewModal(false)
          }}
        >
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{template.title}</h2>
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded-full",
                    categoryColors[template.category] || 'bg-gray-100 text-gray-700'
                  )}>
                    {category?.label || template.category}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <>
                    <span className={cn(
                      "text-xs px-2 py-1 font-medium rounded-full",
                      template.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                    )}>
                      {template.isActive ? 'Active' : 'Archived'}
                    </span>
                    <Link
                      href={`/admin/forms/${template.id}/edit`}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                      onClick={() => setShowViewModal(false)}
                    >
                      <Edit2 className="w-5 h-5" />
                    </Link>
                  </>
                )}
                <button 
                  onClick={() => setShowViewModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-auto p-6 space-y-6">
              {/* If viewing a specific submission, show the data */}
              {isAdmin && viewingSubmission ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setViewingSubmission(null)}
                      className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                    >
                      ← Back to submissions list
                    </button>
                    <span className="text-xs text-gray-500">
                      Submitted by {viewingSubmission.submitter?.name || 'Unknown'} on {new Date(viewingSubmission.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                    <FormTemplateView
                      title={template.title}
                      description={template.description}
                      descriptionHtml={template.descriptionHtml}
                      fields={parsedFields}
                      preview={false}
                      values={JSON.parse(viewingSubmission.formData || '{}')}
                    />
                  </div>
                </div>
              ) : (
                <>
                  {/* Template Preview */}
                  {parsedFields && parsedFields.length > 0 && (
                    <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                      <FormTemplateView
                        title={template.title}
                        description={template.description}
                        descriptionHtml={template.descriptionHtml}
                        fields={parsedFields}
                        preview={true}
                      />
                    </div>
                  )}

                  {/* Admin-only: Submissions List */}
                  {isAdmin && submissions.length > 0 && (
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                        <h3 className="text-sm font-medium text-gray-900">Submissions ({submissions.length})</h3>
                      </div>
                      <div className="divide-y divide-gray-100 max-h-60 overflow-auto">
                        {submissions.map((sub) => (
                          <button
                            key={sub.id}
                            onClick={() => setViewingSubmission(sub)}
                            className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center justify-between"
                          >
                            <div className="flex items-center gap-3">
                              <User className="w-4 h-4 text-gray-400" />
                              <div>
                                <p className="text-sm text-gray-900">{sub.submitter?.name || 'Unknown'}</p>
                                <p className="text-xs text-gray-500">{sub.submitter?.email}</p>
                              </div>
                            </div>
                            <span className="text-xs text-gray-500">
                              {new Date(sub.createdAt).toLocaleDateString()}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Admin-only: Stats and Dates */}
                  {isAdmin && (
                    <div className="flex items-center justify-between text-xs text-gray-500 pt-4 border-t border-gray-200">
                      <div className="flex items-center gap-4">
                        <span>{template._count.submissions} submissions</span>
                        {template.isFillable && (
                          <span className="text-green-600">Fillable</span>
                        )}
                      </div>
                      <div>
                        Updated {new Date(template.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center gap-3 p-4 border-t border-gray-200 shrink-0">
              {!isAdmin && template.isFillable && (
                <>
                  {existingSubmission ? (
                    <>
                      <button
                        onClick={() => {
                          setShowViewModal(false)
                          setShowFillModal(true)
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
                      >
                        <Eye className="w-4 h-4" />
                        View Submission
                      </button>
                      <button
                        onClick={() => {
                          setShowViewModal(false)
                          setShowFillModal(true)
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium"
                      >
                        <PenLine className="w-4 h-4" />
                        Edit
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => {
                        setShowViewModal(false)
                        setShowFillModal(true)
                      }}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium"
                    >
                      <PenLine className="w-4 h-4" />
                      Fill Form
                    </button>
                  )}
                </>
              )}
              <button
                onClick={() => setShowViewModal(false)}
                className={cn(
                  "px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium",
                  !template.isFillable || !isAdmin ? "w-full" : "w-auto"
                )}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Roles Modal - Admin only */}
      {isAdmin && showRolesModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowRolesModal(false)
          }}
        >
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Access Control</h2>
                  <p className="text-xs text-gray-500">Select who can access this form</p>
                </div>
              </div>
              <button 
                onClick={() => setShowRolesModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4">
              <div className="grid grid-cols-2 gap-2">
                {VALID_ROLES.map(role => (
                  <label
                    key={role}
                    className={cn(
                      "flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors",
                      selectedRoles.includes(role)
                        ? "border-primary-500 bg-primary-50"
                        : "border-gray-200 hover:border-gray-300"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={selectedRoles.includes(role)}
                      onChange={() => toggleRole(role)}
                      className="sr-only"
                    />
                    <div className={cn(
                      "w-5 h-5 rounded border flex items-center justify-center",
                      selectedRoles.includes(role)
                        ? "bg-primary-500 border-primary-500"
                        : "border-gray-300"
                    )}>
                      {selectedRoles.includes(role) && (
                        <Check className="w-3 h-3 text-white" />
                      )}
                    </div>
                    <span className="text-sm text-gray-700">{ROLE_LABELS[role as keyof typeof ROLE_LABELS]}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-4">
                Leave all unchecked to allow all roles to access this form.
              </p>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center gap-2 p-4 border-t border-gray-200">
              <button
                onClick={() => setShowRolesModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRoles}
                disabled={isUpdatingRoles}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium disabled:opacity-50"
              >
                {isUpdatingRoles ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fill Form Modal - for non-admin users */}
      {!isAdmin && showFillModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowFillModal(false)
          }}
        >
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center">
                  <PenLine className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {hasSubmission ? 'Your Submission' : 'Fill Form'}
                  </h2>
                  <p className="text-xs text-gray-500">{template.title}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowFillModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Submission Status Banner */}
            {hasSubmission && !submitSuccess && (
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "px-2 py-1 rounded text-xs font-medium",
                      existingSubmission?.status === 'SUBMITTED' && "bg-yellow-100 text-yellow-700",
                      existingSubmission?.status === 'REVIEWED' && "bg-blue-100 text-blue-700",
                      existingSubmission?.status === 'APPROVED' && "bg-green-100 text-green-700",
                      existingSubmission?.status === 'REJECTED' && "bg-red-100 text-red-700"
                    )}>
                      {existingSubmission?.status}
                    </span>
                    <span className="text-xs text-gray-500">
                      Submitted {existingSubmission?.createdAt ? new Date(existingSubmission.createdAt).toLocaleDateString() : ''}
                    </span>
                  </div>
                </div>
              </div>
            )}

              {/* Success Message */}
            {submitSuccess && (
              <div className="px-4 py-6 border-b border-gray-200 bg-green-50">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-2">
                    <Check className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-medium text-green-800">Form submitted successfully!</p>
                  <p className="text-xs text-green-600 mt-1">Redirecting...</p>
                </div>
              </div>
            )}

            {/* Error Message */}
            {submitError && (
              <div className="px-4 py-3 border-b border-gray-200 bg-red-50">
                <p className="text-sm text-red-600">{submitError}</p>
              </div>
            )}

            {/* Modal Body - Form */}
            <div className="flex-1 overflow-auto p-6">
              <FormTemplateView
                title={template.title}
                description={template.description}
                descriptionHtml={template.descriptionHtml}
                fields={parsedFields}
                preview={false}
                values={fillValues}
                onFieldChange={handleFillFieldChange}
                errors={fillErrors}
                submitLabel={hasSubmission ? "Save Changes" : "Submit Form"}
                onSubmit={handleFillSubmit}
                submitting={submitting}
              />
            </div>

            {/* Modal Footer */}
            {!submitSuccess && (
              <div className="flex items-center gap-3 p-4 border-t border-gray-200 shrink-0">
                <button
                  onClick={() => setShowFillModal(false)}
                  className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
