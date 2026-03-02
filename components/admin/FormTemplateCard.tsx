'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { FileText, Edit2, Trash2, Archive, Loader2, X, Copy, Check, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { deleteFormTemplate, updateFormTemplateRoles } from '@/app/actions/form-templates'
import { VALID_ROLES, ROLE_LABELS } from '@/lib/roles'

type Template = {
  id: string
  title: string
  description: string | null
  category: string
  isActive: boolean
  isPublic: boolean
  allowedRoles: string | null
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

const categoryColors: Record<string, string> = {
  INCIDENT: 'bg-red-100 text-red-700',
  FEEDBACK: 'bg-blue-100 text-blue-700',
  EVALUATION: 'bg-purple-100 text-purple-700',
  ADMINISTRATIVE: 'bg-gray-100 text-gray-700',
  HEALTH_SAFETY: 'bg-green-100 text-green-700',
  OTHER: 'bg-orange-100 text-orange-700'
}

interface FormTemplateCardProps {
  template: Template
  categories: Category[]
}

export function FormTemplateCard({ template, categories }: FormTemplateCardProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showRolesModal, setShowRolesModal] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [selectedRoles, setSelectedRoles] = useState<string[]>(
    template.allowedRoles ? template.allowedRoles.split(',') : []
  )
  const [isUpdatingRoles, setIsUpdatingRoles] = useState(false)

  const category = categories.find(c => c.value === template.category)
  const formUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/staff/forms/${template.id}`
  
  const currentRoles = template.allowedRoles ? template.allowedRoles.split(',') : []

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

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(formUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
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
      if (e.key === 'Escape') setShowViewModal(false)
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [])

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200 p-4 transition-colors relative">
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

        {template.description && (
          <p className="text-xs text-gray-600 mb-3 line-clamp-2">
            {template.description}
          </p>
        )}

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
                <button
                  onClick={() => setShowRolesModal(true)}
                  className="text-xs text-primary-600 hover:text-primary-700"
                >
                  Edit
                </button>
              </div>
              <div className="flex flex-wrap gap-1 mb-3">
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

        <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
          <button
            onClick={() => setShowViewModal(true)}
            className="flex-1 text-center px-3 py-1.5 text-xs font-medium text-primary-600 bg-primary-50 rounded hover:bg-primary-100"
          >
            View
          </button>
          <Link
            href={`/admin/form-templates/${template.id}/edit`}
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
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
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
              <button 
                onClick={() => setShowViewModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-auto p-4 space-y-4">
              {/* Status */}
              <div className="flex items-center gap-2">
                <span className={cn(
                  "px-2 py-1 text-xs font-medium rounded-full",
                  template.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                )}>
                  {template.isActive ? 'Active' : 'Archived'}
                </span>
                <span className={cn(
                  "px-2 py-1 text-xs font-medium rounded-full",
                  template.isPublic ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                )}>
                  {template.isPublic ? 'Public' : 'Private'}
                </span>
              </div>

              {/* Description */}
              {template.description && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-1">Description</h3>
                  <p className="text-sm text-gray-600">{template.description}</p>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Submissions</p>
                  <p className="text-lg font-semibold text-gray-900">{template._count.submissions}</p>
                </div>
              </div>

              {/* Dates */}
              <div className="text-xs text-gray-500 space-y-1">
                <p>Created: {new Date(template.createdAt).toLocaleDateString()}</p>
                <p>Updated: {new Date(template.updatedAt).toLocaleDateString()}</p>
              </div>

              {/* Form URL */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Form Link</h3>
                <div className="flex items-center gap-2">
                  <input 
                    type="text" 
                    value={formUrl}
                    readOnly
                    className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded px-3 py-2 text-gray-600"
                  />
                  <button
                    onClick={handleCopyLink}
                    className={cn(
                      "px-3 py-2 rounded-lg text-xs font-medium transition-colors",
                      copied 
                        ? "bg-green-100 text-green-700" 
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    )}
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center gap-2 p-4 border-t border-gray-200">
              <Link
                href={`/admin/form-templates/${template.id}/edit`}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
                onClick={() => setShowViewModal(false)}
              >
                <Edit2 className="w-4 h-4" />
                Edit
              </Link>
              <button
                onClick={() => setShowViewModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Roles Modal */}
      {showRolesModal && (
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
    </>
  )
}
