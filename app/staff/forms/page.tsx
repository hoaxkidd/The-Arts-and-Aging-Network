import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { FileText, Download, Calendar, CheckCircle, Clock, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"

export default async function StaffFormsPage({
  searchParams
}: {
  searchParams: Promise<{ category?: string; tab?: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const params = await searchParams
  const categoryFilter = params.category || 'ALL'
  const activeTab = params.tab || 'browse'

  // Get active templates
  const where: any = {
    isActive: true,
    isPublic: true
  }

  if (categoryFilter !== 'ALL') {
    where.category = categoryFilter
  }

  const templates = await prisma.formTemplate.findMany({
    where,
    include: {
      _count: {
        select: { submissions: true }
      }
    },
    orderBy: [
      { downloadCount: 'desc' },
      { createdAt: 'desc' }
    ]
  })

  // Get user's submissions
  const mySubmissions = await prisma.formSubmission.findMany({
    where: {
      submittedBy: session.user.id
    },
    include: {
      template: {
        select: {
          id: true,
          title: true,
          category: true
        }
      },
      event: {
        select: {
          id: true,
          title: true,
          startDateTime: true
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 20
  })

  const categories = [
    { value: 'INCIDENT', label: 'Incident Reports', icon: '⚠️' },
    { value: 'FEEDBACK', label: 'Feedback Forms', icon: '💬' },
    { value: 'EVALUATION', label: 'Evaluations', icon: '📊' },
    { value: 'ADMINISTRATIVE', label: 'Administrative', icon: '📄' },
    { value: 'HEALTH_SAFETY', label: 'Health & Safety', icon: '🏥' },
    { value: 'OTHER', label: 'Other', icon: '📋' }
  ]

  const submissionStats = {
    total: mySubmissions.length,
    pending: mySubmissions.filter(s => s.status === 'SUBMITTED').length,
    reviewed: mySubmissions.filter(s => s.status === 'REVIEWED').length,
    approved: mySubmissions.filter(s => s.status === 'APPROVED').length
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="flex-shrink-0 pb-3">
        <h1 className="text-lg font-bold text-gray-900">Form Templates</h1>
        <p className="text-xs text-gray-500">Access forms and track your submissions</p>
      </header>

      {/* Tabs */}
      <div className="flex-shrink-0 flex items-center gap-2 mb-4 border-b border-gray-200">
        <Link
          href="/staff/forms?tab=browse"
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
            activeTab === 'browse'
              ? "border-primary-600 text-primary-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          )}
        >
          Browse Templates ({templates.length})
        </Link>
        <Link
          href="/staff/forms?tab=submissions"
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
            activeTab === 'submissions'
              ? "border-primary-600 text-primary-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          )}
        >
          My Submissions ({submissionStats.total})
        </Link>
      </div>

      {/* Browse Tab */}
      {activeTab === 'browse' && (
        <>
          {/* Category Filter */}
          <div className="flex-shrink-0 mb-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              <Link
                href="/staff/forms?tab=browse&category=ALL"
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap",
                  categoryFilter === 'ALL'
                    ? "bg-primary-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
              >
                All Forms
              </Link>
              {categories.map(cat => (
                <Link
                  key={cat.value}
                  href={`/staff/forms?tab=browse&category=${cat.value}`}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap",
                    categoryFilter === cat.value
                      ? "bg-primary-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  )}
                >
                  {cat.icon} {cat.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Templates Grid */}
          <div className="flex-1 min-h-0 overflow-auto">
            {templates.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No forms available in this category</p>
              </div>
            ) : (
              <div className="space-y-3">
                {templates.map((template) => {
                  const category = categories.find(c => c.value === template.category)
                  return (
                    <Link
                      key={template.id}
                      href={`/staff/forms/${template.id}`}
                      className="block bg-white rounded-lg border border-gray-200 p-4 hover:border-primary-300 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-gray-900 mb-1">
                            {template.title}
                          </h3>
                          {template.description && (
                            <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                              {template.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span className="px-2 py-0.5 bg-gray-100 rounded">
                              {category?.icon} {category?.label}
                            </span>
                            {template.fileType && (
                              <span>{template.fileType}</span>
                            )}
                            <span className="flex items-center gap-1">
                              <Download className="w-3 h-3" />
                              {template.downloadCount} downloads
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Submissions Tab */}
      {activeTab === 'submissions' && (
        <>
          {/* Submission Stats */}
          <div className="flex-shrink-0 mb-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-lg border border-gray-200 p-3">
              <p className="text-xs text-gray-500">Total</p>
              <p className="text-xl font-bold text-gray-900">{submissionStats.total}</p>
            </div>
            <div className="bg-white rounded-lg border border-yellow-200 p-3">
              <p className="text-xs text-yellow-600">Pending</p>
              <p className="text-xl font-bold text-yellow-600">{submissionStats.pending}</p>
            </div>
            <div className="bg-white rounded-lg border border-blue-200 p-3">
              <p className="text-xs text-blue-600">Reviewed</p>
              <p className="text-xl font-bold text-blue-600">{submissionStats.reviewed}</p>
            </div>
            <div className="bg-white rounded-lg border border-green-200 p-3">
              <p className="text-xs text-green-600">Approved</p>
              <p className="text-xl font-bold text-green-600">{submissionStats.approved}</p>
            </div>
          </div>

          {/* Submissions List */}
          <div className="flex-1 min-h-0 overflow-auto">
            {mySubmissions.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No submissions yet</p>
                <Link
                  href="/staff/forms?tab=browse"
                  className="text-xs text-primary-600 hover:text-primary-700 mt-2 inline-block"
                >
                  Browse forms to get started
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {mySubmissions.map((submission) => (
                  <div
                    key={submission.id}
                    className="bg-white rounded-lg border border-gray-200 p-3"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {submission.template.title}
                        </h3>
                        <p className="text-xs text-gray-500">
                          Submitted {submission.createdAt.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                      <span className={cn(
                        "px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1 flex-shrink-0",
                        submission.status === 'SUBMITTED' && "bg-yellow-100 text-yellow-700",
                        submission.status === 'REVIEWED' && "bg-blue-100 text-blue-700",
                        submission.status === 'APPROVED' && "bg-green-100 text-green-700",
                        submission.status === 'REJECTED' && "bg-red-100 text-red-700"
                      )}>
                        {submission.status === 'SUBMITTED' && <Clock className="w-3 h-3" />}
                        {submission.status === 'APPROVED' && <CheckCircle className="w-3 h-3" />}
                        {submission.status === 'REJECTED' && <XCircle className="w-3 h-3" />}
                        {submission.status}
                      </span>
                    </div>
                    {submission.event && (
                      <p className="text-xs text-gray-600 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Related to: {submission.event.title}
                      </p>
                    )}
                    {submission.reviewNotes && (
                      <p className="text-xs text-gray-600 mt-2 p-2 bg-gray-50 rounded">
                        {submission.reviewNotes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
