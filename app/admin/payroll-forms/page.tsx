'use client'

import { useState } from 'react'
import Link from 'next/link'
import { 
  Plus, FileText, Trash2, Eye, Users, 
  AlertTriangle, CheckCircle, Clock, X
} from 'lucide-react'
import { createPayrollForm, deletePayrollForm, getPayrollFormStats } from '@/app/actions/payroll-forms'
import { STYLES } from '@/lib/styles'
import { logger } from '@/lib/logger'
import { cn } from '@/lib/utils'
import { DateInput } from '@/components/ui/DateInput'
import { toInputDate } from '@/lib/date-utils'
import { InlineStatStrip } from '@/components/ui/InlineStatStrip'
import { useAppDialogs } from '@/components/ui/AppDialogs'
import { toast } from 'sonner'

const FORM_TYPES = [
  { value: 'COMPLIANCE', label: 'Compliance' },
  { value: 'TAX', label: 'Tax' },
  { value: 'POLICE_CHECK', label: 'Police Check' },
  { value: 'HR', label: 'HR' },
  { value: 'OTHER', label: 'Other' },
]

const ROLES = [
  { value: 'PAYROLL', label: 'Payroll' },
  { value: 'FACILITATOR', label: 'Facilitator' },
  { value: 'VOLUNTEER', label: 'Volunteer' },
  { value: 'ADMIN', label: 'Admin' },
]

type Form = {
  id: string
  title: string
  description: string | null
  formType: string
  isRequired: boolean
  roles: string[]
  expiresAt: string | null
  fileUrl: string
  fileName: string
  isActive: boolean
  createdAt: string
  _count: { submissions: number }
  uploader: { name: string | null }
}

export default function PayrollFormsPage() {
  const { confirm: confirmDialog } = useAppDialogs()
  const [forms, setForms] = useState<Form[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const [stats, setStats] = useState<{
    totalForms: number
    formsByType: { formType: string; _count: number }[]
  } | null>(null)

  React.useEffect(() => {
    loadForms()
    loadStats()
  }, [])

  async function loadForms() {
    setLoading(true)
    try {
      const res = await fetch('/api/payroll-forms')
      const data = await res.json()
      if (data.success) setForms(data.data)
    } catch (e) {
      logger.serverAction('Failed to load forms:', e)
    }
    setLoading(false)
  }

  async function loadStats() {
    try {
      const res = await fetch('/api/payroll-forms/stats')
      const data = await res.json()
      if (data.success) setStats(data.data)
    } catch (e) {
      logger.serverAction('Failed to load stats:', e)
    }
  }

  async function handleDelete(id: string) {
    const ok = await confirmDialog({
      title: 'Delete this form?',
      message: 'This cannot be undone.',
      confirmLabel: 'Delete',
      variant: 'danger',
    })
    if (!ok) return
    setDeleting(id)
    const res = await deletePayrollForm(id)
    if (res.success) {
      setForms(forms.filter(f => f.id !== id))
      toast.success('Form deleted')
    } else {
      toast.error(res.error ?? 'Delete failed')
    }
    setDeleting(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <button
          onClick={() => setShowCreateModal(true)}
          className={cn(STYLES.btn, STYLES.btnPrimary, "flex items-center gap-2")}
        >
          <Plus className="w-4 h-4" /> Add Form
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <InlineStatStrip
          className="grid grid-cols-2 md:grid-cols-4 gap-2"
          items={[
            { value: stats.totalForms, label: "Total Forms" },
            ...stats.formsByType.map((type) => ({
              value: type._count,
              label: type.formType.replace('_', ' '),
            })),
          ]}
        />
      )}

      {/* Forms List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : forms.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No payroll forms yet</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 text-primary-600 hover:underline"
            >
              Add your first form
            </button>
          </div>
        ) : (
          <div className="table-scroll-wrapper max-h-[calc(100vh-320px)]">
            <table className={STYLES.table}>
              <thead className="bg-gray-50">
                <tr>
                  <th className={STYLES.tableHeader}>Form</th>
                  <th className={STYLES.tableHeader}>Type</th>
                  <th className={STYLES.tableHeader}>Required For</th>
                  <th className={STYLES.tableHeader}>Submissions</th>
                  <th className={STYLES.tableHeader}>Actions</th>
                </tr>
              </thead>
            <tbody className="divide-y divide-gray-100">
              {forms.map((form) => (
                <tr key={form.id} className={STYLES.tableRow}>
                  <td className={STYLES.tableCell}>
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">{form.title}</p>
                        <p className="text-xs text-gray-500">{form.fileName}</p>
                      </div>
                    </div>
                  </td>
                  <td className={STYLES.tableCell}>
                    <span className={cn(
                      "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                      form.formType === 'COMPLIANCE' && "bg-red-100 text-red-800",
                      form.formType === 'TAX' && "bg-blue-100 text-blue-800",
                      form.formType === 'POLICE_CHECK' && "bg-purple-100 text-purple-800",
                      form.formType === 'HR' && "bg-green-100 text-green-800",
                      form.formType === 'OTHER' && "bg-gray-100 text-gray-800"
                    )}>
                      {form.formType.replace('_', ' ')}
                    </span>
                  </td>
                  <td className={STYLES.tableCell}>
                    <div className="flex flex-wrap gap-1">
                      {form.roles.map((role) => (
                        <span key={role} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          {role}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className={STYLES.tableCell}>
                    {form._count.submissions}
                  </td>
                  <td className={STYLES.tableCell}>
                    <div className="flex items-center gap-2">
                      <a
                        href={form.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                      >
                        <Eye className="w-4 h-4" />
                      </a>
                      <button
                        onClick={() => handleDelete(form.id)}
                        disabled={deleting === form.id}
                        className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <CreateFormModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false)
            loadForms()
            loadStats()
          }}
        />
      )}
    </div>
  )
}

import React from 'react'

function CreateFormModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [selectedRoles, setSelectedRoles] = useState<string[]>(['PAYROLL'])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    formData.set('roles', selectedRoles.join(','))

    const res = await createPayrollForm(formData)
    if (res.success) {
      onSuccess()
    } else {
      setError(res.error || 'Failed to create form')
    }
    setSubmitting(false)
  }

  function toggleRole(role: string) {
    setSelectedRoles(prev => 
      prev.includes(role) 
        ? prev.filter(r => r !== role)
        : [...prev, role]
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Add Payroll Form</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input
              name="title"
              required
              className={STYLES.input}
              placeholder="e.g. W-4 Tax Form 2024"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              name="description"
              rows={2}
              className={STYLES.input}
              placeholder="Optional description..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Form Type *</label>
            <select name="formType" required className={cn(STYLES.input, STYLES.select)}>
              {FORM_TYPES.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Required For *</label>
            <div className="flex flex-wrap gap-2">
              {ROLES.map(role => (
                <button
                  key={role.value}
                  type="button"
                  onClick={() => toggleRole(role.value)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors",
                    selectedRoles.includes(role.value)
                      ? "bg-primary-100 border-primary-300 text-primary-700"
                      : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                  )}
                >
                  {role.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="isRequired"
                className="w-4 h-4 rounded border-gray-300 text-primary-600"
              />
              <span className="text-sm text-gray-700">Required form (staff must complete)</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expiration Date</label>
            <DateInput
              name="expiresAt"
            />
            <p className="text-xs text-gray-500 mt-1">Leave empty for no expiration</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">File *</label>
            <input
              type="file"
              name="file"
              required
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
              className={STYLES.input}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className={cn(STYLES.btn, "flex-1")}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || selectedRoles.length === 0}
              className={cn(STYLES.btn, STYLES.btnPrimary, "flex-1 disabled:opacity-50")}
            >
              {submitting ? 'Creating...' : 'Create Form'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
