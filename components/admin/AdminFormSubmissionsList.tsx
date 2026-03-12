'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { FileText, Search, Filter, Check, X, Edit, Loader2, ArrowUpDown, ChevronLeft, ChevronRight, Eye, CheckCircle, XCircle, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { approveEditRequest, reviewFormSubmission } from '@/app/actions/form-templates'

type Submission = {
  id: string
  status: string
  editRequested: boolean
  editApproved: boolean
  editDenyReason: string | null
  createdAt: Date
  formData?: string
  reviewNotes?: string | null
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
  event?: {
    id: string
    title: string
  } | null
}

type Template = {
  id: string
  title: string
  category: string
}

type User = {
  id: string
  name: string | null
  email: string | null
}

type Props = {
  submissions: Submission[]
  editRequestCount: number
  templates?: Template[]
  categories?: string[]
  users?: User[]
  currentSort?: string
  currentOrder?: string
  currentStatus?: string
  currentCategory?: string
  currentForm?: string
  currentUser?: string
  currentPage?: number
  totalPages?: number
  totalCount?: number
}

export function AdminFormSubmissionsList({ 
  submissions: initialSubmissions, 
  editRequestCount,
  templates = [],
  categories = [],
  users = [],
  currentSort = 'createdAt',
  currentOrder = 'desc',
  currentStatus = 'all',
  currentCategory = 'all',
  currentForm = 'all',
  currentUser = 'all',
  currentPage = 1,
  totalPages = 1,
  totalCount = 0
}: Props) {
  const router = useRouter()
  const [submissions, setSubmissions] = useState(initialSubmissions)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'edit_request'>('all')
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [denyReason, setDenyReason] = useState('')
  const [showDenyModal, setShowDenyModal] = useState<string | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState<Submission | null>(null)
  const [reviewStatus, setReviewStatus] = useState<'REVIEWED' | 'APPROVED' | 'REJECTED'>('REVIEWED')
  const [reviewNotes, setReviewNotes] = useState('')
  const [showReviewModal, setShowReviewModal] = useState<Submission | null>(null)
  const [reviewing, setReviewing] = useState(false)

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

  const handleSort = (field: string) => {
    const params = new URLSearchParams()
    params.set('sort', field)
    if (currentSort === field) {
      params.set('order', currentOrder === 'asc' ? 'desc' : 'asc')
    } else {
      params.set('order', 'desc')
    }
    if (currentStatus !== 'all') params.set('status', currentStatus)
    if (currentCategory !== 'all') params.set('category', currentCategory)
    if (currentForm !== 'all') params.set('form', currentForm)
    if (currentUser !== 'all') params.set('user', currentUser)
    router.push(`/admin/form-submissions?${params.toString()}`)
  }

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams()
    params.set('sort', currentSort)
    params.set('order', currentOrder)
    if (key !== 'status') params.set('status', currentStatus)
    if (key !== 'category') params.set('category', currentCategory)
    if (key !== 'form') params.set('form', currentForm)
    if (key !== 'user') params.set('user', currentUser)
    params.set(key, value)
    router.push(`/admin/form-submissions?${params.toString()}`)
  }

  const handleReview = async () => {
    if (!showReviewModal) return
    setReviewing(true)
    try {
      await reviewFormSubmission(showReviewModal.id, {
        status: reviewStatus,
        reviewNotes: reviewNotes || undefined
      })
      setShowReviewModal(null)
      setReviewNotes('')
      router.refresh()
    } catch (error) {
      console.error('Failed to review:', error)
    } finally {
      setReviewing(false)
    }
  }

  const getSortIcon = (field: string) => {
    if (currentSort !== field) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-30" />
    return currentOrder === 'asc' 
      ? <span className="ml-1">↑</span> 
      : <span className="ml-1">↓</span>
  }

  const categoryLabels: Record<string, string> = {
    EVENT_SIGNUP: 'Event Sign-up',
    INCIDENT: 'Incident Reports',
    FEEDBACK: 'Feedback Forms',
    EVALUATION: 'Evaluations',
    ADMINISTRATIVE: 'Administrative',
    HEALTH_SAFETY: 'Health & Safety',
    OTHER: 'Other'
  }

  return (
    <div className="space-y-4">
      {/* Filters Row 1 - Search and Quick Filters */}
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

      {/* Filters Row 2 - Dropdown Filters */}
      <div className="flex flex-wrap gap-2">
        <select
          value={currentStatus}
          onChange={(e) => handleFilterChange('status', e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs focus:ring-2 focus:ring-primary-500"
        >
          <option value="all">All Status</option>
          <option value="SUBMITTED">Submitted</option>
          <option value="REVIEWED">Reviewed</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>

        <select
          value={currentCategory}
          onChange={(e) => handleFilterChange('category', e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs focus:ring-2 focus:ring-primary-500"
        >
          <option value="all">All Categories</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{categoryLabels[cat] || cat}</option>
          ))}
        </select>

        <select
          value={currentForm}
          onChange={(e) => handleFilterChange('form', e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs focus:ring-2 focus:ring-primary-500 min-w-[150px]"
        >
          <option value="all">All Forms</option>
          {templates.map(t => (
            <option key={t.id} value={t.id}>{t.title}</option>
          ))}
        </select>

        <select
          value={currentUser}
          onChange={(e) => handleFilterChange('user', e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs focus:ring-2 focus:ring-primary-500 min-w-[150px]"
        >
          <option value="all">All Users</option>
          {users.map(u => (
            <option key={u.id} value={u.id}>{u.name || u.email}</option>
          ))}
        </select>
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

      {/* Results Count */}
      <div className="text-xs text-gray-500">
        Showing {filteredSubmissions.length} of {totalCount} submissions
      </div>

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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  <button 
                    onClick={() => handleSort('form')}
                    className="flex items-center hover:text-gray-700"
                  >
                    Form {getSortIcon('form')}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  <button 
                    onClick={() => handleSort('user')}
                    className="flex items-center hover:text-gray-700"
                  >
                    Submitter {getSortIcon('user')}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  <button 
                    onClick={() => handleSort('status')}
                    className="flex items-center hover:text-gray-700"
                  >
                    Status {getSortIcon('status')}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  <button 
                    onClick={() => handleSort('createdAt')}
                    className="flex items-center hover:text-gray-700"
                  >
                    Date {getSortIcon('createdAt')}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredSubmissions.map((submission) => (
                <tr key={submission.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link 
                      href={`/admin/form-templates/${submission.template.id}/edit`}
                      className="text-sm font-medium text-gray-900 hover:text-primary-600"
                    >
                      {submission.template.title}
                    </Link>
                    <p className="text-xs text-gray-500">{categoryLabels[submission.template.category] || submission.template.category}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-900">{submission.submitter.name || 'Unknown'}</p>
                    <p className="text-xs text-gray-500">{submission.submitter.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    {submission.event ? (
                      <span className="text-xs text-gray-600">{submission.event.title}</span>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
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
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setShowDetailsModal(submission)}
                        className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setShowReviewModal(submission)
                          setReviewStatus(submission.status as any)
                          setReviewNotes(submission.reviewNotes || '')
                        }}
                        className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded"
                        title="Review"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      {submission.editRequested && !submission.editApproved && (
                        <div className="flex items-center gap-1 ml-2 pl-2 border-l border-gray-200">
                          <button
                            onClick={() => handleApprove(submission.id)}
                            disabled={processingId === submission.id}
                            className="p-1 text-green-600 hover:text-green-700 hover:bg-green-50 rounded disabled:opacity-50"
                            title="Approve Edit"
                          >
                            {processingId === submission.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Check className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => setShowDenyModal(submission.id)}
                            className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded"
                            title="Deny Edit"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                      {submission.editApproved && (
                        <span className="text-xs text-green-600 ml-2">Edit access granted</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-gray-500">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const params = new URLSearchParams()
                params.set('sort', currentSort)
                params.set('order', currentOrder)
                if (currentStatus !== 'all') params.set('status', currentStatus)
                if (currentCategory !== 'all') params.set('category', currentCategory)
                if (currentForm !== 'all') params.set('form', currentForm)
                if (currentUser !== 'all') params.set('user', currentUser)
                params.set('page', String(currentPage - 1))
                router.push(`/admin/form-submissions?${params.toString()}`)
              }}
              disabled={currentPage <= 1}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                const params = new URLSearchParams()
                params.set('sort', currentSort)
                params.set('order', currentOrder)
                if (currentStatus !== 'all') params.set('status', currentStatus)
                if (currentCategory !== 'all') params.set('category', currentCategory)
                if (currentForm !== 'all') params.set('form', currentForm)
                if (currentUser !== 'all') params.set('user', currentUser)
                params.set('page', String(currentPage + 1))
                router.push(`/admin/form-submissions?${params.toString()}`)
              }}
              disabled={currentPage >= totalPages}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

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

      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Review Submission</h3>
            <p className="text-sm text-gray-600 mb-4">
              Update the status of this form submission.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={reviewStatus}
                  onChange={(e) => setReviewStatus(e.target.value as any)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="REVIEWED">Reviewed</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Add notes about your review decision..."
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm"
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  setShowReviewModal(null)
                  setReviewNotes('')
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleReview}
                disabled={reviewing}
                className="px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {reviewing ? 'Saving...' : 'Save Review'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {showDetailsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Submission Details</h3>
              <button
                onClick={() => setShowDetailsModal(null)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Form</p>
                  <p className="text-sm font-medium text-gray-900">{showDetailsModal.template.title}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Category</p>
                  <p className="text-sm text-gray-700">{categoryLabels[showDetailsModal.template.category] || showDetailsModal.template.category}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Submitted By</p>
                  <p className="text-sm font-medium text-gray-900">{showDetailsModal.submitter.name || 'Unknown'}</p>
                  <p className="text-xs text-gray-500">{showDetailsModal.submitter.email}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Date Submitted</p>
                  <p className="text-sm text-gray-700">
                    {new Date(showDetailsModal.createdAt).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Status</p>
                  <span className={cn(
                    "inline-flex px-2 py-0.5 rounded text-xs font-medium",
                    showDetailsModal.status === 'SUBMITTED' && "bg-yellow-100 text-yellow-700",
                    showDetailsModal.status === 'REVIEWED' && "bg-blue-100 text-blue-700",
                    showDetailsModal.status === 'APPROVED' && "bg-green-100 text-green-700",
                    showDetailsModal.status === 'REJECTED' && "bg-red-100 text-red-700"
                  )}>
                    {showDetailsModal.status}
                  </span>
                </div>
                {showDetailsModal.event && (
                  <div>
                    <p className="text-xs text-gray-500">Related Event</p>
                    <p className="text-sm text-gray-700">{showDetailsModal.event.title}</p>
                  </div>
                )}
              </div>

              {showDetailsModal.reviewNotes && (
                <div className="border-t pt-4">
                  <p className="text-xs text-gray-500 mb-1">Review Notes</p>
                  <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">{showDetailsModal.reviewNotes}</p>
                </div>
              )}

              {showDetailsModal.editRequested && (
                <div className="border-t pt-4">
                  <p className="text-xs text-gray-500 mb-2">Edit Request</p>
                  <div className="flex items-center gap-2">
                    {showDetailsModal.editApproved ? (
                      <span className="text-sm text-green-600 flex items-center gap-1">
                        <Check className="w-4 h-4" /> Edit access granted
                      </span>
                    ) : showDetailsModal.editDenyReason ? (
                      <span className="text-sm text-red-600">
                        Edit denied: {showDetailsModal.editDenyReason}
                      </span>
                    ) : (
                      <span className="text-sm text-yellow-600">Pending edit request</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
