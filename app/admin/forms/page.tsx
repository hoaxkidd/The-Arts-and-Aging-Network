import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { Prisma } from "@prisma/client"
import { FileText, Inbox, Plus, Search, Filter } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { FormTemplateCard } from "@/components/admin/FormTemplateCard"
import { FormTemplateFilters } from "@/components/admin/FormTemplateFilters"
import { AdminFormSubmissionsList } from "@/components/admin/AdminFormSubmissionsList"
import { CreateTemplateButton } from "@/components/admin/CreateTemplateButton"
import { ROLE_LABELS } from "@/lib/roles"

export const dynamic = 'force-dynamic'

const SEARCH_STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'by',
  'for',
  'from',
  'in',
  'is',
  'it',
  'of',
  'on',
  'or',
  'that',
  'the',
  'to',
  'was',
  'were',
  'with',
  'all',
  'you',
  'your',
  'we',
  'our',
])

function tokenizeSearch(input: string): string[] {
  const normalized = input.toLowerCase().replace(/[^a-z0-9\s]/g, ' ')
  const tokens = normalized
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !SEARCH_STOP_WORDS.has(token))

  return Array.from(new Set(tokens))
}

export default async function AdminFormsPage({
  searchParams
}: {
  searchParams: Promise<{ tab?: string; category?: string; status?: string; view?: string; sort?: string; search?: string; page?: string; subStatus?: string; subCategory?: string; subForm?: string; subUser?: string; subRole?: string; subSort?: string; subOrder?: string }>
}) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') redirect('/dashboard')

  const params = await searchParams
  const activeTab = params.tab || 'templates'
  const categoryFilter = params.category || 'ALL'
  const statusFilter = params.status || 'ALL'
  const view = params.view || 'cards'
  const sort = params.sort || 'title'
  const search = params.search || ''
  const normalizedSearch = search.trim().toLowerCase()
  const searchTokens = tokenizeSearch(search)
  const page = parseInt(params.page || '1')
  const perPage = 20
  const submissionStatus = params.subStatus || 'all'
  const submissionCategory = params.subCategory || 'all'
  const submissionForm = params.subForm || 'all'
  const submissionUser = params.subUser || 'all'
  const submissionRole = params.subRole || 'all'
  const submissionSort = params.subSort || 'createdAt'
  const submissionOrder: 'asc' | 'desc' = params.subOrder === 'asc' ? 'asc' : 'desc'

  // Categories
  const categories = [
    { value: 'EVENT_SIGNUP', label: 'Booking Sign-up', color: 'blue' },
    { value: 'INCIDENT', label: 'Incident Reports', color: 'red' },
    { value: 'FEEDBACK', label: 'Feedback Forms', color: 'blue' },
    { value: 'EVALUATION', label: 'Evaluations', color: 'purple' },
    { value: 'ADMINISTRATIVE', label: 'Administrative', color: 'gray' },
    { value: 'HEALTH_SAFETY', label: 'Health & Safety', color: 'green' },
    { value: 'OTHER', label: 'Other', color: 'orange' }
  ]

  // TEMPLATES DATA
  const templateWhere: Prisma.FormTemplateWhereInput = {}
  if (categoryFilter !== 'ALL') templateWhere.category = categoryFilter
  if (statusFilter === 'ACTIVE') templateWhere.isActive = true
  else if (statusFilter === 'ARCHIVED') templateWhere.isActive = false

  let templateOrderBy: Prisma.FormTemplateOrderByWithRelationInput[] = []
  if (sort === 'title') templateOrderBy = [{ title: 'asc' }]
  else if (sort === 'date_desc') templateOrderBy = [{ createdAt: 'desc' }]
  else if (sort === 'category') templateOrderBy = [{ category: 'asc' }]
  else templateOrderBy = [{ isActive: 'desc' }, { createdAt: 'desc' }]

  const templates = await prisma.formTemplate.findMany({
    where: templateWhere,
    include: {
      uploader: { select: { name: true, image: true } },
      _count: { select: { submissions: true } }
    },
    orderBy: templateOrderBy
  })

  const compareBySort = (a: any, b: any) => {
    if (sort === 'title') return a.title.localeCompare(b.title)
    if (sort === 'date_desc') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    if (sort === 'category') {
      const byCategory = a.category.localeCompare(b.category)
      return byCategory !== 0 ? byCategory : a.title.localeCompare(b.title)
    }
    return Number(b.isActive) - Number(a.isActive) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  }

  const getSearchScore = (template: any) => {
    if (!normalizedSearch) return 0
    const title = String(template.title || '').toLowerCase()
    const description = String(template.description || '').toLowerCase()
    const descriptionHtml = String(template.descriptionHtml || '').toLowerCase()
    const formFields = String(template.formFields || '').toLowerCase()

    let score = 0
    if (title === normalizedSearch) score += 1000
    if (title.startsWith(normalizedSearch)) score += 700
    if (title.includes(normalizedSearch)) score += 500
    if (description.includes(normalizedSearch)) score += 250
    if (descriptionHtml.includes(normalizedSearch)) score += 200
    if (formFields.includes(normalizedSearch)) score += 300

    for (const token of searchTokens) {
      if (title.includes(token)) score += 160
      if (description.includes(token)) score += 70
      if (descriptionHtml.includes(token)) score += 50
      if (formFields.includes(token)) score += 110
    }

    const searchableBlob = `${title} ${description} ${descriptionHtml} ${formFields}`
    const tokenHits = searchTokens.reduce((acc, token) => acc + (searchableBlob.includes(token) ? 1 : 0), 0)
    score += tokenHits * 25

    return score
  }

  let matchedTemplates = templates
  if (normalizedSearch) {
    matchedTemplates = templates.filter((template: any) => {
      const title = String(template.title || '').toLowerCase()
      const description = String(template.description || '').toLowerCase()
      const descriptionHtml = String(template.descriptionHtml || '').toLowerCase()
      const formFields = String(template.formFields || '').toLowerCase()

      if (
        title.includes(normalizedSearch) ||
        description.includes(normalizedSearch) ||
        descriptionHtml.includes(normalizedSearch) ||
        formFields.includes(normalizedSearch)
      ) {
        return true
      }

      if (searchTokens.length === 0) return false

      const searchableBlob = `${title} ${description} ${descriptionHtml} ${formFields}`
      const tokenHits = searchTokens.reduce((acc, token) => acc + (searchableBlob.includes(token) ? 1 : 0), 0)
      return tokenHits >= Math.min(2, searchTokens.length)
    })

    matchedTemplates = [...matchedTemplates].sort((a: any, b: any) => {
      const byScore = getSearchScore(b) - getSearchScore(a)
      if (byScore !== 0) return byScore
      return compareBySort(a, b)
    })
  }

  const hasSearch = normalizedSearch.length > 0
  const displayTemplates = hasSearch && matchedTemplates.length > 0 ? matchedTemplates : templates

  const templateStats = {
    total: displayTemplates.length,
    active: displayTemplates.filter(t => t.isActive).length,
    archived: displayTemplates.filter(t => !t.isActive).length,
    totalSubmissions: displayTemplates.reduce((sum, t) => sum + t._count.submissions, 0)
  }

  // SUBMISSIONS DATA
  const submissionWhere: Prisma.FormSubmissionWhereInput = {}
  if (submissionStatus !== 'all') {
    submissionWhere.status = submissionStatus as any
  }
  if (submissionCategory !== 'all') {
    submissionWhere.template = { category: submissionCategory }
  }
  if (submissionForm !== 'all') {
    submissionWhere.templateId = submissionForm
  }
  if (submissionUser !== 'all') {
    submissionWhere.submittedBy = submissionUser
  }
  if (submissionRole !== 'all') {
    submissionWhere.submitter = { role: submissionRole }
  }

  let submissionOrderBy: Prisma.FormSubmissionOrderByWithRelationInput = { createdAt: 'desc' }
  if (submissionSort === 'status') submissionOrderBy = { status: submissionOrder }
  else if (submissionSort === 'user') submissionOrderBy = { submitter: { name: submissionOrder } }
  else if (submissionSort === 'role') submissionOrderBy = { submitter: { role: submissionOrder } }
  else if (submissionSort === 'form') submissionOrderBy = { template: { title: submissionOrder } }
  else submissionOrderBy = { createdAt: submissionOrder }

  const totalSubmissions = await prisma.formSubmission.count({ where: submissionWhere })
  const totalPages = Math.ceil(totalSubmissions / perPage)
  const editRequestCount = await prisma.formSubmission.count({ where: { editRequested: true } })
  const unreviewedCount = await prisma.formSubmission.count({ where: { reviewedBy: null } })

  const submissions = await prisma.formSubmission.findMany({
    where: submissionWhere,
    include: {
      template: { select: { id: true, title: true, category: true } },
      submitter: { select: { id: true, name: true, email: true, role: true } },
      event: { select: { id: true, title: true } }
    },
    orderBy: submissionOrderBy,
    skip: (page - 1) * perPage,
    take: perPage
  })

  const allTemplates = await prisma.formTemplate.findMany({
    select: { id: true, title: true, category: true },
    orderBy: { title: 'asc' }
  })

  const allUsers = await prisma.user.findMany({
    where: {
      id: { in: await prisma.formSubmission.findMany({ select: { submittedBy: true }, distinct: ['submittedBy'] }).then(s => s.map(x => x.submittedBy)) }
    },
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: 'asc' }
  })

  const roleOptions = [...new Set(allUsers.map((u) => u.role).filter(Boolean))].map((role) => ({
    value: role!,
    label: ROLE_LABELS[role as keyof typeof ROLE_LABELS] || role!,
  }))

  const allCategories = [...new Set(allTemplates.map(t => t.category))]

  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 flex items-center gap-1 mt-2 border-b border-gray-200">
        {(['templates', 'submissions'] as const).map((tab) => (
          <Link
            key={tab}
            href={`/admin/forms?tab=${tab}`}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px capitalize",
              activeTab === tab ? "border-primary-600 text-primary-600" : "border-transparent text-gray-500 hover:text-gray-700"
            )}
          >
            {tab === 'templates' && <FileText className="w-4 h-4 inline mr-2" />}
            {tab === 'submissions' && <Inbox className="w-4 h-4 inline mr-2" />}
            {tab}
            {tab === 'submissions' && (unreviewedCount > 0 || editRequestCount > 0) && (
              <span className="ml-1 px-1.5 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                {unreviewedCount + editRequestCount}
              </span>
            )}
          </Link>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-auto pt-4">
        {activeTab === 'templates' && (
          <TemplatesTab 
            templates={displayTemplates}
            matchedTemplates={matchedTemplates}
            templateStats={templateStats}
            categories={categories}
            categoryFilter={categoryFilter}
            statusFilter={statusFilter}
            sort={sort}
            search={search}
          />
        )}

        {activeTab === 'submissions' && (
          <SubmissionsTab 
            submissions={submissions}
            editRequestCount={editRequestCount}
            templates={allTemplates}
            categories={allCategories}
            users={allUsers}
            roles={roleOptions}
            currentPage={page}
            totalPages={totalPages}
            totalCount={totalSubmissions}
            currentStatus={submissionStatus}
            currentCategory={submissionCategory}
            currentForm={submissionForm}
            currentUser={submissionUser}
            currentRole={submissionRole}
            currentSort={submissionSort}
            currentOrder={submissionOrder}
          />
        )}
      </div>
    </div>
  )
}

function TemplatesTab({ 
  templates, 
  matchedTemplates,
  templateStats, 
  categories, 
  categoryFilter, 
  statusFilter, 
  sort, 
  search 
}: { 
  templates: any[]
  matchedTemplates: any[]
  templateStats: { total: number; active: number; archived: number; totalSubmissions: number }
  categories: { value: string; label: string; color: string }[]
  categoryFilter: string
  statusFilter: string
  sort: string
  search: string
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="bg-white text-gray-700 border border-gray-300 px-3 py-1.5 rounded-lg font-medium text-sm hover:bg-gray-50 text-center">
            <p className="text-sm font-semibold text-gray-900">{templateStats.total} Total Templates</p>
          </div>
          <div className="bg-white text-gray-700 border border-gray-300 px-3 py-1.5 rounded-lg font-medium text-sm hover:bg-gray-50 text-center">
            <p className="text-sm font-semibold text-green-700">{templateStats.active} Active</p>
          </div>
          <div className="bg-white text-gray-700 border border-gray-300 px-3 py-1.5 rounded-lg font-medium text-sm hover:bg-gray-50 text-center">
            <p className="text-sm font-semibold text-gray-600">{templateStats.archived} Archived</p>
          </div>
          <div className="bg-white text-gray-700 border border-gray-300 px-3 py-1.5 rounded-lg font-medium text-sm hover:bg-gray-50 text-center">
            <p className="text-sm font-semibold text-blue-700">{templateStats.totalSubmissions} Submissions</p>
          </div>
        </div>
        <CreateTemplateButton />
      </div>

      <FormTemplateFilters
        categories={categories}
        currentCategory={categoryFilter}
        currentStatus={statusFilter}
        currentSort={sort}
        currentSearch={search}
        mode="admin"
        preserveParams={{ tab: 'templates' }}
        showSearchResults={Boolean(search.trim())}
        searchResults={matchedTemplates.map((template) => ({
          id: template.id,
          title: template.title,
          isActive: template.isActive,
          categoryLabel: categories.find((cat) => cat.value === template.category)?.label || template.category,
          description: template.description,
          descriptionHtml: template.descriptionHtml,
          formFields: template.formFields,
        }))}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => (
          <FormTemplateCard
            key={template.id}
            template={{
              ...template,
              createdAt: new Date(template.createdAt),
              updatedAt: new Date(template.updatedAt)
            }}
            categories={categories.map(c => ({ value: c.value, label: c.label }))}
            mode="admin"
          />
        ))}
      </div>

      {templates.length === 0 && (
        <div className="bg-white rounded-lg border p-8 text-center">
          <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          {search ? (
            <>
              <p className="text-sm text-gray-500">No templates match "{search}"</p>
              <p className="text-xs text-gray-400 mt-2">Try another keyword from the form title, description, or form fields.</p>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-500">No form templates yet</p>
              <p className="text-xs text-gray-400 mt-2">
                Click "Create Template" button above to add your first template
              </p>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function SubmissionsTab({ 
  submissions, 
  editRequestCount,
  templates,
  categories,
  users,
  roles,
  currentPage,
  totalPages,
  totalCount,
  currentSort,
  currentOrder,
  currentStatus,
  currentCategory,
  currentForm,
  currentUser,
  currentRole,
}: { 
  submissions: any[]
  editRequestCount: number
  templates: { id: string; title: string; category: string }[]
  categories: string[]
  users: { id: string; name: string | null; email: string | null; role: string | null }[]
  roles: { value: string; label: string }[]
  currentSort: string
  currentOrder: string
  currentStatus: string
  currentCategory: string
  currentForm: string
  currentUser: string
  currentRole: string
  currentPage: number
  totalPages: number
  totalCount: number
}) {
  return (
    <AdminFormSubmissionsList 
      submissions={submissions}
      editRequestCount={editRequestCount}
      templates={templates}
      categories={categories}
      users={users}
      roles={roles}
      currentSort={currentSort}
      currentOrder={currentOrder}
      currentStatus={currentStatus}
      currentCategory={currentCategory}
      currentForm={currentForm}
      currentUser={currentUser}
      currentRole={currentRole}
      currentPage={currentPage}
      totalPages={totalPages}
      totalCount={totalCount}
    />
  )
}
