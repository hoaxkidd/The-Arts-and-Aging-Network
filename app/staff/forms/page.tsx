import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { FileText, Calendar, CheckCircle, Clock, XCircle, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { ROLE_LABELS } from "@/lib/roles"
import { FormTemplateCard } from "@/components/admin/FormTemplateCard"
import { FormTemplateFilters } from "@/components/admin/FormTemplateFilters"
import { StickyTable } from "@/components/ui/StickyTable"

export default async function StaffFormsPage({
  searchParams
}: {
  searchParams: Promise<{ category?: string; tab?: string; view?: string; sort?: string; search?: string; status?: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const params = await searchParams
  const categoryFilter = params.category || 'ALL'
  const activeTab = params.tab || 'browse'
  const view = params.view || 'cards'
  const sort = params.sort || 'title'
  const search = params.search || ''
  const statusFilter = params.status || 'active'

  // Get active templates
  const userRole = session.user.role || ''
  const isAdmin = session.user.role === 'ADMIN'

  // Build query based on user role
  let templates
  const categoryFilterObj = categoryFilter !== 'ALL' ? { category: categoryFilter } : {}
  const statusFilterObj = statusFilter === 'active' ? { isActive: true } : {}
  
  // Build where clause based on filters
  const where: any = {
    ...categoryFilterObj,
    ...statusFilterObj,
  }
  
  // Add search filter if provided
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { description: { contains: search } }
    ]
  }

  if (isAdmin) {
    // Admin sees all forms based on status filter
    templates = await prisma.formTemplate.findMany({
      where,
      include: {
        _count: {
          select: { submissions: true }
        }
      },
      orderBy: sort === 'title' ? { title: 'asc' } : sort === 'category' ? { category: 'asc' } : { createdAt: 'desc' }
    })
  } else {
    // Non-admin: show public forms OR forms where their role has access
    templates = await prisma.formTemplate.findMany({
      where: {
        ...where,
        OR: [
          { isPublic: true },  // Public forms
          { allowedRoles: { contains: userRole } }  // Role-restricted forms
        ]
      },
      include: {
        _count: {
          select: { submissions: true }
        }
      },
      orderBy: sort === 'title' ? { title: 'asc' } : sort === 'category' ? { category: 'asc' } : { createdAt: 'desc' }
    })
  }

  // Get user's submissions with template ID for linking to cards
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
    orderBy: { createdAt: 'desc' }
  })

  // Create a map of latest submission per template for the form cards
  const submissionMap = new Map<string, typeof mySubmissions[0]>()
  for (const sub of mySubmissions) {
    if (!submissionMap.has(sub.templateId)) {
      submissionMap.set(sub.templateId, sub)
    }
  }

  const categories = [
    { value: 'EVENT_SIGNUP', label: 'Event Sign-up', icon: '📅' },
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
      {/* Filters */}
      <div className="flex-shrink-0 mt-4">
        <FormTemplateFilters
          categories={categories.map(c => ({ value: c.value, label: c.label, color: 'blue' }))}
          currentCategory={categoryFilter}
          currentStatus={statusFilter}
          currentView={view}
          currentSort={sort}
          currentSearch={search}
          mode="staff"
        />
      </div>

      {/* Tabs */}
      <div className="flex-shrink-0 flex items-center gap-2 mb-4 border-b border-gray-200">
        <Link
          href={`/staff/forms?tab=browse&view=${view}&sort=${sort}&search=${search}&category=${categoryFilter}&status=${statusFilter}`}
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
          href={`/staff/forms?tab=submissions&view=${view}&sort=${sort}&search=${search}&category=${categoryFilter}&status=${statusFilter}`}
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

          {/* Templates Display */}
          <div className="flex-1 min-h-0 overflow-auto">
            {templates.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">{search ? 'No forms match your search' : 'No forms available in this category'}</p>
              </div>
            ) : view === 'table' ? (
              /* Table View */
              <StickyTable 
                headers={["Form", "Category", "Status", "Access", "Submissions"]}
                className="bg-white rounded-lg border border-gray-200"
              >
                {templates.map((template) => {
                  const category = categories.find(c => c.value === template.category)
                  const accessLabel = template.isPublic ? 'All' : (template.allowedRoles ? template.allowedRoles.split(',').map(r => ROLE_LABELS[r as keyof typeof ROLE_LABELS] || r).join(', ') : 'All')
                  return (
                    <tr key={template.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link href={`/staff/forms/${template.id}`} className="block">
                          <span className="text-sm font-medium text-gray-900 hover:text-primary-600">{template.title}</span>
                          {template.description && (
                            <p className="text-xs text-gray-500 line-clamp-1">{template.description}</p>
                          )}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-700">
                          {category?.icon} {category?.label || template.category}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "inline-flex text-xs font-medium",
                          template.isActive ? "text-green-700" : "text-gray-500"
                            )}>
                              {template.isActive ? 'Active' : 'Archived'}
                            </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "inline-flex text-xs font-medium",
                          template.isPublic ? "text-blue-700" : "text-purple-700"
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((template) => (
                  <FormTemplateCard
                    key={template.id}
                    template={template}
                    categories={categories.map(c => ({ value: c.value, label: c.label }))}
                    mode="staff"
                    fillUrlPrefix="/staff/forms"
                    existingSubmission={submissionMap.get(template.id) ? {
                      id: submissionMap.get(template.id)!.id,
                      formData: submissionMap.get(template.id)!.formData,
                      status: submissionMap.get(template.id)!.status,
                      createdAt: submissionMap.get(template.id)!.createdAt,
                    } : undefined}
                  />
                ))}
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
