'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FileText, Search, Filter, Check, X, Edit, Loader2, ArrowUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { approveEditRequest } from '@/app/actions/form-templates'
import { useRouter } from 'next/navigation'

type Submission = {
  id: string
  status: string
  editRequested: boolean
  editApproved: boolean
  editDenyReason: string | null
  createdAt: Date
  template: {
    id: string
    title: string
    category: string
  }
  submitter: {
    id: string
    name: string | null
    email: string | null
  }
}

type Props = {
  submissions: Submission[]
  editRequestCount: number
}

export function AdminFormSubmissionsList({ submissions: initialSubmissions, editRequestCount }: Props) {
  const router = useRouter()
  const [submissions, setSubmissions] = useState(initialSubmissions)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'edit_request'>('all')
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [denyReason, setDenyReason] = useState('')
  const [showDenyModal, setShowDenyModal] = useState<string | null>(null)

  const filteredSubmissions = submissions.filter(s => {
    const matchesSearch = !search || 
      s.template.title.toLowerCase().includes(search.toLowerCase()) ||
      s.submitter.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.submitter.email?.toLowerCase().includes(search.toLowerCase())
    
    if (filter === 'edit_request') {
      return matchesSearch && s.editRequested
    }
    return matchesSearch
  })

  const handleApprove = async (submissionId: string) => {
    setProcessingId(submissionId)
    try {
      await approveEditRequest(submissionId, true)
      router.refresh()
    } catch (error) {
      console.error('Failed to approve:', error)
    } finally {
      setProcessingId(null)
    }
  }

  const handleDeny = async (submissionId: string) => {
    setProcessingId(submissionId)
    try {
      await approveEditRequest(submissionId, false, denyReason || undefined)
      setShowDenyModal(null)
      setDenyReason('')
      router.refresh()
    } catch (error) {
      console.error('Failed to deny:', error)
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by form or submitter..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as 'all' | 'edit_request')}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Submissions</option>
            <option value="edit_request">Edit Requests ({editRequestCount})</option>
          </select>
        </div>
      </div>

      {/* Edit Requests Alert */}
      {editRequestCount > 0 && filter === 'all' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Edit className="w-4 h-4 text-yellow-600" />
            <span className="text-sm text-yellow-800">
              {editRequestCount} pending edit request{editRequestCount > 1 ? 's' : ''}
            </span>
          </div>
          <button
            onClick={() => setFilter('edit_request')}
            className="text-xs text-yellow-700 hover:text-yellow-800 font-medium"
          >
            View All
          </button>
        </div>
      )}

      {/* Submissions List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {filteredSubmissions.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No submissions found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Form</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Submitter</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredSubmissions.map((submission) => (
                <tr key={submission.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link 
                      href={`/admin/form-templates/${submission.template.id}`}
                      className="text-sm font-medium text-gray-900 hover:text-primary-600"
                    >
                      {submission.template.title}
                    </Link>
                    <p className="text-xs text-gray-500">{submission.template.category}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-900">{submission.submitter.name || 'Unknown'}</p>
                    <p className="text-xs text-gray-500">{submission.submitter.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <span className={cn(
                        "inline-flex px-2 py-0.5 rounded text-xs font-medium",
                        submission.status === 'SUBMITTED' && "bg-yellow-100 text-yellow-700",
                        submission.status === 'REVIEWED' && "bg-blue-100 text-blue-700",
                        submission.status === 'APPROVED' && "bg-green-100 text-green-700",
                        submission.status === 'REJECTED' && "bg-red-100 text-red-700"
                      )}>
                        {submission.status}
                      </span>
                      {submission.editRequested && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                          <Edit className="w-3 h-3" />
                          Edit Request
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(submission.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </td>
                  <td className="px-4 py-3">
                    {submission.editRequested && !submission.editApproved && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleApprove(submission.id)}
                          disabled={processingId === submission.id}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium hover:bg-green-200 disabled:opacity-50"
                        >
                          {processingId === submission.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Check className="w-3 h-3" />
                          )}
                          Approve
                        </button>
                        <button
                          onClick={() => setShowDenyModal(submission.id)}
                          disabled={processingId === submission.id}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium hover:bg-red-200 disabled:opacity-50"
                        >
                          {processingId === submission.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <X className="w-3 h-3" />
                          )}
                          Deny
                        </button>
                      </div>
                    )}
                    {submission.editApproved && (
                      <span className="text-xs text-green-600">Edit access granted</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Deny Modal */}
      {showDenyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Deny Edit Request</h3>
            <p className="text-sm text-gray-600 mb-4">
              Please provide a reason for denying this edit request. This will be visible to the user.
            </p>
            <textarea
              value={denyReason}
              onChange={(e) => setDenyReason(e.target.value)}
              placeholder="Enter reason for denial (optional)..."
              className="w-full border border-gray-300 rounded-lg p-3 text-sm mb-4"
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowDenyModal(null)
                  setDenyReason('')
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeny(showDenyModal)}
                disabled={processingId === showDenyModal}
                className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {processingId === showDenyModal ? 'Denying...' : 'Deny Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
