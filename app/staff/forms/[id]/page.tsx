import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { notFound } from "next/navigation"
import { FileText, Download, Calendar, ArrowLeft, ExternalLink, FileType, Edit } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { STYLES } from "@/lib/styles"

export default async function FormTemplateDetailPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const { id } = await params

  const template = await prisma.formTemplate.findUnique({
    where: { id },
    include: {
      uploader: {
        select: {
          id: true,
          name: true,
          image: true
        }
      },
      _count: {
        select: { submissions: true }
      }
    }
  })

  if (!template) notFound()

  // Check access
  if (!template.isActive || !template.isPublic) {
    if (session.user.role !== 'ADMIN') {
      return (
        <div className="p-8 text-center">
          <p className="text-gray-500">This template is not available</p>
          <Link href="/staff/forms" className="text-primary-600 hover:text-primary-700 text-sm mt-2 inline-block">
            Back to Forms
          </Link>
        </div>
      )
    }
  }

  // Get user's submissions for this template
  const mySubmissions = await prisma.formSubmission.findMany({
    where: {
      templateId: id,
      submittedBy: session.user.id
    },
    include: {
      event: {
        select: {
          id: true,
          title: true,
          startDateTime: true
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 5
  })

  const categories = [
    { value: 'INCIDENT', label: 'Incident Reports', color: 'red', icon: '⚠️' },
    { value: 'FEEDBACK', label: 'Feedback Forms', color: 'blue', icon: '💬' },
    { value: 'EVALUATION', label: 'Evaluations', color: 'purple', icon: '📊' },
    { value: 'ADMINISTRATIVE', label: 'Administrative', color: 'gray', icon: '📄' },
    { value: 'HEALTH_SAFETY', label: 'Health & Safety', color: 'green', icon: '🏥' },
    { value: 'OTHER', label: 'Other', color: 'orange', icon: '📋' }
  ]

  const category = categories.find(c => c.value === template.category)
  const tags = template.tags ? JSON.parse(template.tags) : []

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="flex-shrink-0 pb-3">
        <Link
          href="/staff/forms"
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 mb-2"
        >
          <ArrowLeft className="w-3 h-3" /> Back to Forms
        </Link>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <div className="w-12 h-12 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center flex-shrink-0">
              <FileText className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-gray-900 mb-1">{template.title}</h1>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn(
                  "px-2 py-0.5 rounded text-xs font-medium",
                  `bg-${category?.color || 'gray'}-100 text-${category?.color || 'gray'}-700`
                )}>
                  {category?.icon} {category?.label}
                </span>
                {template.fileType && (
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-medium flex items-center gap-1">
                    <FileType className="w-3 h-3" />
                    {template.fileType}
                  </span>
                )}
                {template.isFillable && (
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
                    Fillable Form
                  </span>
                )}
              </div>
            </div>
          </div>
          {session.user.role === 'ADMIN' && (
            <Link
              href={`/admin/form-templates/${template.id}/edit`}
              className="text-gray-400 hover:text-gray-600"
            >
              <Edit className="w-4 h-4" />
            </Link>
          )}
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-auto space-y-4">
        {/* Description */}
        {template.description && (
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-2">Description</h2>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{template.description}</p>
          </div>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-2">Tags</h2>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag: string, i: number) => (
                <span key={i} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Actions</h2>
          <div className="flex flex-col gap-2">
            {template.fileUrl && (
              <a
                href={template.fileUrl}
                download={template.fileName || `${template.title}.pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(STYLES.btn, "bg-primary-600 text-white hover:bg-primary-700 justify-center")}
              >
                <Download className="w-4 h-4" />
                Download {template.fileType || 'Form'}
              </a>
            )}
            {template.isFillable && (
              <Link
                href={`/staff/forms/${template.id}/fill`}
                className={cn(STYLES.btn, STYLES.btnSecondary, "justify-center")}
              >
                <Edit className="w-4 h-4" />
                Fill Out Online
              </Link>
            )}
            {template.fileType === 'GOOGLE_FORM' && template.fileUrl && (
              <a
                href={template.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(STYLES.btn, STYLES.btnSecondary, "justify-center")}
              >
                <ExternalLink className="w-4 h-4" />
                Open Google Form
              </a>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Usage Stats</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-500">Downloads</p>
              <p className="text-lg font-bold text-gray-900">{template.downloadCount}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Submissions</p>
              <p className="text-lg font-bold text-gray-900">{template._count.submissions}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Your Submissions</p>
              <p className="text-lg font-bold text-primary-600">{mySubmissions.length}</p>
            </div>
          </div>
        </div>

        {/* My Submissions */}
        {mySubmissions.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-900">Your Recent Submissions</h2>
              <Link
                href="/staff/forms?tab=submissions"
                className="text-xs text-primary-600 hover:text-primary-700"
              >
                View All
              </Link>
            </div>
            <div className="space-y-2">
              {mySubmissions.map((submission) => (
                <div
                  key={submission.id}
                  className="p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-500">
                      {submission.createdAt.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit'
                      })}
                    </span>
                    <span className={cn(
                      "px-2 py-0.5 rounded text-xs font-medium",
                      submission.status === 'SUBMITTED' && "bg-yellow-100 text-yellow-700",
                      submission.status === 'REVIEWED' && "bg-blue-100 text-blue-700",
                      submission.status === 'APPROVED' && "bg-green-100 text-green-700",
                      submission.status === 'REJECTED' && "bg-red-100 text-red-700"
                    )}>
                      {submission.status}
                    </span>
                  </div>
                  {submission.event && (
                    <p className="text-xs text-gray-600 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {submission.event.title}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Template Info */}
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-2">Template Information</h2>
          <div className="space-y-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Version:</span>
              <span className="text-gray-900 font-medium">{template.version}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Last Updated:</span>
              <span className="text-gray-900 font-medium">
                {template.updatedAt.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </span>
            </div>
            {template.fileSize && (
              <div className="flex items-center justify-between">
                <span className="text-gray-500">File Size:</span>
                <span className="text-gray-900 font-medium">
                  {(template.fileSize / 1024).toFixed(0)} KB
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
