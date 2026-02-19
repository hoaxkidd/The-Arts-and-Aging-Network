import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { FileText, Download, Eye, Edit2, Trash2, Plus, Archive } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { STYLES } from "@/lib/styles"
import { FormTemplateFilters } from "@/components/admin/FormTemplateFilters"

export default async function FormTemplatesAdminPage({
  searchParams
}: {
  searchParams: Promise<{ category?: string; status?: string }>
}) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') redirect('/dashboard')

  const params = await searchParams
  const categoryFilter = params.category || 'ALL'
  const statusFilter = params.status || 'ALL'

  // Build where clause
  const where: any = {}
  if (categoryFilter !== 'ALL') {
    where.category = categoryFilter
  }
  if (statusFilter === 'ACTIVE') {
    where.isActive = true
  } else if (statusFilter === 'ARCHIVED') {
    where.isActive = false
  }

  const templates = await prisma.formTemplate.findMany({
    where,
    include: {
      uploader: {
        select: { name: true, image: true }
      },
      _count: {
        select: { submissions: true }
      }
    },
    orderBy: [
      { isActive: 'desc' },
      { createdAt: 'desc' }
    ]
  })

  const categories = [
    { value: 'INCIDENT', label: 'Incident Reports', color: 'red' },
    { value: 'FEEDBACK', label: 'Feedback Forms', color: 'blue' },
    { value: 'EVALUATION', label: 'Evaluations', color: 'purple' },
    { value: 'ADMINISTRATIVE', label: 'Administrative', color: 'gray' },
    { value: 'HEALTH_SAFETY', label: 'Health & Safety', color: 'green' },
    { value: 'OTHER', label: 'Other', color: 'orange' }
  ]

  const stats = {
    total: templates.length,
    active: templates.filter(t => t.isActive).length,
    archived: templates.filter(t => !t.isActive).length,
    totalSubmissions: templates.reduce((sum, t) => sum + t._count.submissions, 0)
  }

  return (
    <div className="h-full flex flex-col p-6">
      <div className="flex-shrink-0 mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-gray-900">Form Templates</h1>
          <Link
            href="/admin/form-templates/new"
            className={cn(STYLES.btn, STYLES.btnPrimary)}
          >
            <Plus className="w-4 h-4" />
            New Template
          </Link>
        </div>
        <p className="text-sm text-gray-500">Manage form templates for staff use</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase">Total Templates</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg border border-green-200 p-4">
          <p className="text-xs text-green-600 uppercase">Active</p>
          <p className="text-2xl font-bold text-green-600">{stats.active}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase">Archived</p>
          <p className="text-2xl font-bold text-gray-500">{stats.archived}</p>
        </div>
        <div className="bg-white rounded-lg border border-blue-200 p-4">
          <p className="text-xs text-blue-600 uppercase">Total Submissions</p>
          <p className="text-2xl font-bold text-blue-600">{stats.totalSubmissions}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex-shrink-0 mb-4">
        <FormTemplateFilters
          categories={categories}
          currentCategory={categoryFilter}
          currentStatus={statusFilter}
        />
      </div>

      {/* Templates Grid */}
      <div className="flex-1 min-h-0 overflow-auto">
        {templates.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No form templates found</p>
            <Link
              href="/admin/form-templates/new"
              className={cn(STYLES.btn, STYLES.btnPrimary, "mt-4")}
            >
              Create First Template
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => {
              const category = categories.find(c => c.value === template.category)
              return (
                <div
                  key={template.id}
                  className="bg-white rounded-lg border border-gray-200 p-4 transition-colors"
                >
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
                          `bg-${category?.color || 'gray'}-100 text-${category?.color || 'gray'}-700`
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
                      <Download className="w-3 h-3" />
                      {template.downloadCount}
                    </div>
                    <div className="flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      {template._count.submissions} submitted
                    </div>
                  </div>

                  {template.fileType && (
                    <p className="text-xs text-gray-400 mb-3">
                      Format: {template.fileType}
                    </p>
                  )}

                  <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                    <Link
                      href={`/staff/forms/${template.id}`}
                      className="flex-1 text-center px-3 py-1.5 text-xs font-medium text-primary-600 bg-primary-50 rounded hover:bg-primary-100"
                    >
                      <Eye className="w-3 h-3 inline mr-1" />
                      View
                    </Link>
                    <Link
                      href={`/admin/form-templates/${template.id}/edit`}
                      className="flex-1 text-center px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 rounded hover:bg-gray-100"
                    >
                      <Edit2 className="w-3 h-3 inline mr-1" />
                      Edit
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
