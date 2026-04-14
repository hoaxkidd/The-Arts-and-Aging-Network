import { prisma } from "@/lib/prisma"
import { FileText, Calendar, CheckCircle, Clock, XCircle, Lock } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { FormTemplateCard } from "@/components/admin/FormTemplateCard"
import { FormTemplateFilters } from "@/components/admin/FormTemplateFilters"
import { StickyTable } from "@/components/ui/StickyTable"
import { STYLES } from "@/lib/styles"
import { canAccessTemplate } from "@/lib/form-access"

type FormsParams = {
  category?: string
  formsTab?: string
  view?: string
  sort?: string
  search?: string
  status?: string
}

function buildProfileFormsHref(current: {
  formsTab: string
  view: string
  sort: string
  search: string
  category: string
  status: string
}, updates: Partial<{
  formsTab: string
  view: string
  sort: string
  search: string
  category: string
  status: string
}>) {
  const next = { ...current, ...updates }
  const params = new URLSearchParams()
  params.set('tab', 'forms')
  params.set('formsTab', next.formsTab)
  params.set('view', next.view)
  params.set('sort', next.sort)
  params.set('search', next.search)
  params.set('category', next.category)
  params.set('status', next.status)
  return `/dashboard/profile?${params.toString()}`
}

export async function ProfileFormsTab({
  userId,
  userRole,
  params,
}: {
  userId: string
  userRole: string
  params: FormsParams
}) {
  const categoryFilter = params.category || 'ALL'
  const activeFormsTab = params.formsTab === 'submissions' ? 'submissions' : 'browse'
  const view = params.view || 'cards'
  const sort = params.sort || 'title'
  const search = params.search || ''
  const statusFilter = params.status || 'active'

  const isAdmin = userRole === 'ADMIN'
  const isHomeAdmin = userRole === 'HOME_ADMIN'
  const roles = userRole ? [userRole] : []

  let templates
  const categoryFilterObj = categoryFilter !== 'ALL' ? { category: categoryFilter } : {}
  const statusFilterObj = statusFilter === 'active' ? { isActive: true } : {}
  const where: any = {
    ...categoryFilterObj,
    ...statusFilterObj,
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { descriptionHtml: { contains: search, mode: 'insensitive' } },
      { formFields: { contains: search, mode: 'insensitive' } },
    ]
  }

  if (isAdmin) {
    templates = await prisma.formTemplate.findMany({
      where,
      include: { _count: { select: { submissions: true } } },
      orderBy: sort === 'title' ? { title: 'asc' } : sort === 'category' ? { category: 'asc' } : { createdAt: 'desc' },
    }) as any
  } else if (isHomeAdmin) {
    templates = await prisma.formTemplate.findMany({
      where: {
        ...where,
        isPublic: false,
        isActive: statusFilter === 'active' ? true : undefined,
      },
      include: { _count: { select: { submissions: true } } },
      orderBy: sort === 'title' ? { title: 'asc' } : sort === 'category' ? { category: 'asc' } : { createdAt: 'desc' },
    }) as any
  } else {
    templates = await prisma.formTemplate.findMany({
      where: {
        ...where,
        isActive: statusFilter === 'active' ? true : undefined,
      },
      include: { _count: { select: { submissions: true } } },
      orderBy: sort === 'title' ? { title: 'asc' } : sort === 'category' ? { category: 'asc' } : { createdAt: 'desc' },
    }) as any
  }

  if (!isAdmin) {
    templates = (templates as any[]).filter((t: any) =>
      canAccessTemplate(
        { isActive: Boolean(t.isActive), isPublic: Boolean(t.isPublic), allowedRoles: t.allowedRoles ?? null },
        { roles, isHomeAdmin }
      )
    )
  }

  const mySubmissions = await prisma.formSubmission.findMany({
    where: { submittedBy: userId },
    include: {
      template: { select: { id: true, title: true, category: true } },
      event: { select: { id: true, title: true, startDateTime: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const submissionMap = new Map<string, (typeof mySubmissions)[0]>()
  for (const sub of mySubmissions) {
    if (!submissionMap.has(sub.templateId)) submissionMap.set(sub.templateId, sub)
  }

  const categories = [
    { value: 'EVENT_SIGNUP', label: 'Booking Sign-up', icon: '📅' },
    { value: 'INCIDENT', label: 'Incident Reports', icon: '⚠️' },
    { value: 'FEEDBACK', label: 'Feedback Forms', icon: '💬' },
    { value: 'EVALUATION', label: 'Evaluations', icon: '📊' },
    { value: 'ADMINISTRATIVE', label: 'Administrative', icon: '📄' },
    { value: 'HEALTH_SAFETY', label: 'Health & Safety', icon: '🏥' },
    { value: 'OTHER', label: 'Other', icon: '📋' },
  ]

  const submissionStats = {
    total: mySubmissions.length,
    pending: mySubmissions.filter((s) => s.status === 'SUBMITTED').length,
    reviewed: mySubmissions.filter((s) => s.status === 'REVIEWED').length,
    approved: mySubmissions.filter((s) => s.status === 'APPROVED').length,
  }

  const currentState = {
    formsTab: activeFormsTab,
    view,
    sort,
    search,
    category: categoryFilter,
    status: statusFilter,
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 mb-4 bg-white border border-gray-200 rounded-xl p-4">
        <h2 className="text-sm font-semibold text-gray-900">Forms Workspace</h2>
        <p className="text-xs text-gray-600 mt-1">
          Preview and complete forms assigned to your role, and track all submissions in one place.
        </p>
      </div>

      {isHomeAdmin && (
        <div className="flex-shrink-0 mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
          <Lock className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-blue-700">
            Only forms specifically assigned to Program Coordinators are shown here.
            Public forms are not accessible from this page.
          </p>
        </div>
      )}

      <div className="flex-shrink-0 mt-2">
        <FormTemplateFilters
          categories={categories.map((c) => ({ value: c.value, label: c.label, color: 'blue' }))}
          currentCategory={categoryFilter}
          currentStatus={statusFilter}
          currentView={view}
          currentSort={sort}
          currentSearch={search}
          mode="staff"
          preserveParams={{ tab: 'forms', formsTab: activeFormsTab }}
        />
      </div>

      <div className="flex-shrink-0 flex items-center gap-2 mb-4 rounded-lg border border-gray-200 bg-white p-1">
        <Link
          href={buildProfileFormsHref(currentState, { formsTab: 'browse' })}
          className={cn(
            'px-4 py-2 text-sm font-medium rounded-md transition-colors',
            activeFormsTab === 'browse' ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-100'
          )}
        >
          Browse Forms ({templates.length})
        </Link>
        <Link
          href={buildProfileFormsHref(currentState, { formsTab: 'submissions' })}
          className={cn(
            'px-4 py-2 text-sm font-medium rounded-md transition-colors',
            activeFormsTab === 'submissions' ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-100'
          )}
        >
          My Submissions ({submissionStats.total})
        </Link>
      </div>

      {activeFormsTab === 'browse' && (
        <>
          <div className="flex-shrink-0 mb-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              <Link
                href={buildProfileFormsHref(currentState, { formsTab: 'browse', category: 'ALL' })}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 min-w-[90px] text-center',
                  categoryFilter === 'ALL' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                All Forms
              </Link>
              {categories.map((cat) => (
                <Link
                  key={cat.value}
                  href={buildProfileFormsHref(currentState, { formsTab: 'browse', category: cat.value })}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 min-w-[100px] text-center',
                    categoryFilter === cat.value ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  {cat.icon} {cat.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-auto">
            {templates.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">{search ? 'No forms match your search' : 'No forms assigned to your role'}</p>
              </div>
            ) : view === 'table' ? (
              <StickyTable headers={isAdmin ? ["Form", "Category", "Status", "Access", "Submissions"] : ["Form", "Category", "Status"]}>
                {templates.map((template: any) => {
                  const category = categories.find((c) => c.value === template.category)
                  return (
                    <tr key={template.id} className={STYLES.tableRow}>
                      <td className={STYLES.tableCell}>
                        <Link href={`/dashboard/forms/${template.id}`} className="block">
                          <span className="text-sm font-medium text-gray-900 hover:text-primary-600">{template.title}</span>
                          {template.description && <p className="text-xs text-gray-500 line-clamp-1">{template.description}</p>}
                        </Link>
                      </td>
                      <td className={STYLES.tableCell}>
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-700">
                          {category?.icon} {category?.label || template.category}
                        </span>
                      </td>
                      <td className={STYLES.tableCell}>
                        <span className={cn("inline-flex text-xs font-medium", template.isActive ? "text-green-700" : "text-gray-500")}>
                          {template.isActive ? 'Active' : 'Archived'}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className={STYLES.tableCell}>
                          <span className={cn("inline-flex px-2 py-1 rounded-full text-xs font-medium", template.isPublic ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700")}>
                            {template.isPublic ? 'All' : 'Restricted'}
                          </span>
                        </td>
                      )}
                      {isAdmin && (
                        <td className={STYLES.tableCell}>
                          <span className="text-sm text-gray-900">{template._count.submissions}</span>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </StickyTable>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((template: any) => (
                  <FormTemplateCard
                    key={template.id}
                    template={template}
                    categories={categories.map((c) => ({ value: c.value, label: c.label }))}
                    mode="staff"
                    fillUrlPrefix="/dashboard/forms"
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

      {activeFormsTab === 'submissions' && (
        <>
          <div className="flex-shrink-0 mb-4 flex items-center gap-4 text-sm">
            <span><span className="font-medium text-gray-700">Total:</span> {submissionStats.total}</span>
            <span className="text-yellow-600"><span className="font-medium">Pending:</span> {submissionStats.pending}</span>
            <span className="text-blue-600"><span className="font-medium">Reviewed:</span> {submissionStats.reviewed}</span>
            <span className="text-green-600"><span className="font-medium">Approved:</span> {submissionStats.approved}</span>
          </div>

          <div className="flex-1 min-h-0 overflow-auto">
            {mySubmissions.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No submissions yet</p>
                <Link
                  href={buildProfileFormsHref(currentState, { formsTab: 'browse' })}
                  className="text-xs text-primary-600 hover:text-primary-700 mt-2 inline-block"
                >
                  Browse forms to get started
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {mySubmissions.map((submission) => (
                  <div key={submission.id} className="bg-white rounded-lg border border-gray-200 p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900 truncate">{submission.template.title}</h3>
                        <p className="text-xs text-gray-500">
                          Submitted {submission.createdAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                      <span className={cn(
                        'px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1 flex-shrink-0',
                        submission.status === 'SUBMITTED' && 'bg-yellow-100 text-yellow-700',
                        submission.status === 'REVIEWED' && 'bg-blue-100 text-blue-700',
                        submission.status === 'APPROVED' && 'bg-green-100 text-green-700',
                        submission.status === 'REJECTED' && 'bg-red-100 text-red-700'
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
                      <p className="text-xs text-gray-600 mt-2 p-2 bg-gray-50 rounded">{submission.reviewNotes}</p>
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
