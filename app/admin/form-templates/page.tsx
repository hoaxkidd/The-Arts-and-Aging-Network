import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { FileText, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { STYLES } from "@/lib/styles"
import { FormTemplateFilters } from "@/components/admin/FormTemplateFilters"
import { FormTemplateCard } from "@/components/admin/FormTemplateCard"
import { ROLE_LABELS } from "@/lib/roles"
import { StickyTable } from "@/components/ui/StickyTable"

export const revalidate = 60

export default async function FormTemplatesAdminPage({
  searchParams
}: {
  searchParams: Promise<{ category?: string; status?: string; view?: string; sort?: string; search?: string }>
}) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') redirect('/dashboard')

  const params = await searchParams
  const categoryFilter = params.category || 'ALL'
  const statusFilter = params.status || 'ALL'
  const view = params.view || 'cards'
  const sort = params.sort || 'title'
  const search = params.search || ''

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
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { description: { contains: search } }
    ]
  }

  // Build orderBy
  let orderBy: any = []
  if (sort === 'title') {
    orderBy = [{ title: 'asc' }]
  } else if (sort === 'date_desc') {
    orderBy = [{ createdAt: 'desc' }]
  } else if (sort === 'date_asc') {
    orderBy = [{ createdAt: 'asc' }]
  } else if (sort === 'category') {
    orderBy = [{ category: 'asc' }]
  } else if (sort === 'role') {
    orderBy = [{ allowedRoles: 'asc' }]
  } else {
    orderBy = [{ isActive: 'desc' }, { createdAt: 'desc' }]
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
    orderBy
  })

  // Serialize for client component
  const serializedTemplates = templates.map(t => ({
    ...t,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString()
  }))

  const categories = [
    { value: 'EVENT_SIGNUP', label: 'Event Sign-up', color: 'blue' },
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
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="flex-shrink-0 pb-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-primary-100 text-primary-600 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-gray-900">Form Templates</h1>
              <p className="text-xs text-gray-500">
                Manage form templates for staff use
              </p>
            </div>
          </div>
          <Link
            href="/admin/form-templates/new"
            className={cn(STYLES.btn, STYLES.btnSecondary)}
          >
            <Plus className="w-4 h-4" />
            New Template
          </Link>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
        <div className="bg-white rounded-lg border border-gray-200 p-2.5 text-center">
          <p className="text-xl font-bold text-gray-900">{stats.total}</p>
          <p className="text-[10px] text-gray-500">Total</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-2.5 text-center">
          <p className="text-xl font-bold text-green-700">{stats.active}</p>
          <p className="text-[10px] text-green-600">Active</p>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-center">
          <p className="text-xl font-bold text-gray-500">{stats.archived}</p>
          <p className="text-[10px] text-gray-500">Archived</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 text-center">
          <p className="text-xl font-bold text-blue-700">{stats.totalSubmissions}</p>
          <p className="text-[10px] text-blue-600">Submissions</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex-shrink-0 mt-4">
        <FormTemplateFilters
          categories={categories}
          currentCategory={categoryFilter}
          currentStatus={statusFilter}
          currentView={view}
          currentSort={sort}
          currentSearch={search}
          mode="admin"
        />
      </div>

      {/* Templates Display */}
      <div className="flex-1 min-h-0 overflow-auto mt-4">
        {templates.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">{search ? 'No forms match your search' : 'No form templates found'}</p>
            <Link
              href="/admin/form-templates/new"
              className={cn(STYLES.btn, STYLES.btnPrimary, "mt-4")}
            >
              Create First Template
            </Link>
          </div>
        ) : view === 'table' ? (
          /* Table View */
          <StickyTable 
            headers={["Form", "Category", "Status", "Access", "Submissions"]}
            className="bg-white rounded-lg border border-gray-200"
          >
            {serializedTemplates.map((template) => {
              const category = categories.find(c => c.value === template.category)
              const accessLabel = template.isPublic ? 'All' : (template.allowedRoles ? template.allowedRoles.split(',').map(r => ROLE_LABELS[r as keyof typeof ROLE_LABELS] || r).join(', ') : 'All')
              return (
                <tr key={template.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/form-templates/${template.id}/edit`} className="block">
                      <span className="text-sm font-medium text-gray-900 hover:text-primary-600">{template.title}</span>
                      {template.description && (
                        <p className="text-xs text-gray-500 line-clamp-1">{template.description}</p>
                      )}
                    </Link>
                  </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "inline-flex px-2 py-1 rounded-full text-xs font-medium",
                          category ? `bg-${category.color}-100 text-${category.color}-700` : "bg-gray-100 text-gray-700"
                        )}>
                          {category?.label || template.category}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "inline-flex px-2 py-1 rounded-full text-xs font-medium",
                          template.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                        )}>
                          {template.isActive ? 'Active' : 'Archived'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "inline-flex px-2 py-1 rounded-full text-xs font-medium",
                          template.isPublic ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                        )}>
                          {accessLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-900">{template._count.submissions}</span>
                      </td>
                    </tr>
                  )
                })}
              </StickyTable>
            ) : (
          /* Card View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {serializedTemplates.map((template) => (
              <FormTemplateCard
                key={template.id}
                template={template}
                categories={categories}
                mode="admin"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
