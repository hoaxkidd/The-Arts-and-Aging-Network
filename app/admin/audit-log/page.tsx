import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { FileSearch, Download, ChevronLeft, ChevronRight, UserPlus, Edit, Trash2, LogIn, LogOut, FileText, CheckCircle, XCircle } from "lucide-react"
import { STYLES } from "@/lib/styles"
import { cn, safeJsonParse } from "@/lib/utils"
import Link from "next/link"
import { getRelativeTime } from "@/lib/date-utils"
import { AuditLogDetailsCell } from "./AuditLogDetailsCell"

export const revalidate = 60

interface SearchParams {
  page?: string
  search?: string
  filter?: string
}

export default async function AuditLogPage({
  searchParams
}: {
  searchParams: Promise<SearchParams>
}) {
  const resolvedParams = await searchParams
  const session = await auth()
  
  if (!session?.user) {
    return <div>Unauthorized</div>
  }

  const page = parseInt(resolvedParams.page || '1')
  const search = resolvedParams.search || ''
  const filter = resolvedParams.filter || 'all'
  const perPage = 25

  // Calculate date filter
  const now = new Date()
  let dateFilter: { gte?: Date } = {}
  
  switch (filter) {
    case 'today':
      const today = new Date(now)
      today.setHours(0, 0, 0, 0)
      dateFilter = { gte: today }
      break
    case 'week':
      const weekAgo = new Date(now)
      weekAgo.setDate(weekAgo.getDate() - 7)
      dateFilter = { gte: weekAgo }
      break
    case 'month':
      const monthAgo = new Date(now)
      monthAgo.setMonth(monthAgo.getMonth() - 1)
      dateFilter = { gte: monthAgo }
      break
    default:
      dateFilter = {}
  }

  // Build where clause
  const where: Prisma.AuditLogWhereInput = {}
  
  if (search) {
    where.OR = [
      { action: { contains: search } },
      { user: { name: { contains: search } } }
    ]
  }
  
  if (dateFilter.gte) {
    where.createdAt = dateFilter
  }

  // Execute queries in parallel
  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      take: perPage,
      skip: (page - 1) * perPage,
      where,
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.auditLog.count({ where })
  ])

  const totalPages = Math.ceil(total / perPage)

  function formatAction(action: string): string {
    return action.split('_')
      .map(word => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ')
  }

  function getActionIcon(action: string) {
    if (action.includes('CREATED')) return UserPlus
    if (action.includes('DELETED')) return Trash2
    if (action.includes('UPDATED')) return Edit
    if (action.includes('LOGIN')) return LogIn
    if (action.includes('LOGOUT')) return LogOut
    if (action.includes('APPROVED') || action.includes('ACCEPTED')) return CheckCircle
    if (action.includes('REJECTED') || action.includes('DENIED')) return XCircle
    return FileText
  }

  function getActionColor(action: string): string {
    if (action.includes('CREATED')) return 'bg-green-100 text-green-800 border-green-200'
    if (action.includes('UPDATED')) return 'bg-blue-100 text-blue-800 border-blue-200'
    if (action.includes('DELETED') || action.includes('CANCELLED')) return 'bg-red-100 text-red-800 border-red-200'
    if (action.includes('LOGIN') || action.includes('LOGOUT')) return 'bg-gray-100 text-gray-800 border-gray-200'
    if (action.includes('APPROVED') || action.includes('ACCEPTED')) return 'bg-emerald-100 text-emerald-800 border-emerald-200'
    if (action.includes('REJECTED') || action.includes('DENIED')) return 'bg-orange-100 text-orange-800 border-orange-200'
    return 'bg-yellow-100 text-yellow-800 border-yellow-200'
  }

  function formatAuditDetails(details: string | null): string {
    if (!details) return '-'
    
    const parsed = safeJsonParse<Record<string, unknown>>(details, {} as Record<string, unknown>)
    const updates = parsed.updates as Record<string, unknown> | undefined
    
    // Handle format: {"homeId":"...","updates":{"name":"...","address":"..."}}
    if (updates && typeof updates === 'object') {
      const changes = Object.keys(updates)
      if (changes.length === 1) {
        return `Changed ${changes[0]}`
      }
      if (changes.length === 2) {
        return `Changed ${changes[0]} and ${changes[1]}`
      }
      return `Changed ${changes.slice(0, 2).join(', ')} and ${changes.length - 2} more`
    }
    
    // Handle format: {"name":"New Home"} - for created items
    const name = parsed.name as string | undefined
    const title = parsed.title as string | undefined
    const email = parsed.email as string | undefined
    const eventId = parsed.eventId as string | undefined
    
    if (name) {
      return name
    }
    
    // Handle format: {"title":"Event Title"} 
    if (title) {
      return title
    }
    
    // Handle user-related details
    if (email) {
      return email
    }
    
    // Handle event details
    if (eventId) {
      return 'Event action'
    }
    
    // Default - no details shown
    return '-'
  }

  function buildPageUrl(newPage: number): string {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (filter !== 'all') params.set('filter', filter)
    if (newPage > 1) params.set('page', newPage.toString())
    const queryString = params.toString()
    return queryString ? `/admin/audit-log?${queryString}` : '/admin/audit-log'
  }

  function buildFilterUrl(newFilter: string): string {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (newFilter !== 'all') params.set('filter', newFilter)
    if (page > 1) params.set('page', '1')
    const queryString = params.toString()
    return queryString ? `/admin/audit-log?${queryString}` : '/admin/audit-log'
  }

  // Generate CSV content
  const csvContent = [
    ['Action', 'User', 'Details', 'Date'].join(','),
    ...logs.map(log => [
      `"${log.action}"`,
      `"${log.user?.name || 'System'}"`,
      `"${formatAuditDetails(log.details).replace(/"/g, '""')}"`,
      log.createdAt.toISOString()
    ].join(','))
  ].join('\n')

  const csvUrl = `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`

  return (
    <div className="h-full flex flex-col">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-gray-50 px-4 sm:px-6 pt-5 pb-3">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center">
            <FileSearch className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Audit Log</h1>
            <p className="text-xs text-gray-500">Track all system activity and changes</p>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <form className="flex-1" method="GET">
            <input
              type="text"
              name="search"
              defaultValue={search}
              placeholder="Search actions or users..."
              className={STYLES.input}
            />
            {filter !== 'all' && <input type="hidden" name="filter" value={filter} />}
          </form>
          <div className="flex gap-2">
            <Link
              href={buildFilterUrl('all')}
              className={cn(
                "px-3 py-2 text-xs font-medium rounded-lg border transition-colors",
                filter === 'all' 
                  ? "bg-primary-100 border-primary-300 text-primary-700" 
                  : "bg-white border-gray-300 text-gray-600 hover:bg-gray-50"
              )}
            >
              All
            </Link>
            <Link
              href={buildFilterUrl('today')}
              className={cn(
                "px-3 py-2 text-xs font-medium rounded-lg border transition-colors",
                filter === 'today' 
                  ? "bg-primary-100 border-primary-300 text-primary-700" 
                  : "bg-white border-gray-300 text-gray-600 hover:bg-gray-50"
              )}
            >
              Today
            </Link>
            <Link
              href={buildFilterUrl('week')}
              className={cn(
                "px-3 py-2 text-xs font-medium rounded-lg border transition-colors",
                filter === 'week' 
                  ? "bg-primary-100 border-primary-300 text-primary-700" 
                  : "bg-white border-gray-300 text-gray-600 hover:bg-gray-50"
              )}
            >
              Week
            </Link>
            <Link
              href={buildFilterUrl('month')}
              className={cn(
                "px-3 py-2 text-xs font-medium rounded-lg border transition-colors",
                filter === 'month' 
                  ? "bg-primary-100 border-primary-300 text-primary-700" 
                  : "bg-white border-gray-300 text-gray-600 hover:bg-gray-50"
              )}
            >
              Month
            </Link>
          </div>
          <a
            href={csvUrl}
            download={`audit-log-${new Date().toISOString().split('T')[0]}.csv`}
            className={cn(STYLES.btn, STYLES.btnSecondary, "px-3 py-2 text-xs")}
          >
            <Download className="w-3 h-3" />
            Export
          </a>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-4 sm:px-6 pb-4">
        <div className={STYLES.tableWrapper}>
          <table className={STYLES.table}>
            <thead className="sticky top-0 z-10 bg-gray-50">
              <tr>
                <th className="w-[20%] px-3 py-2.5 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Action</th>
                <th className="w-[20%] px-3 py-2.5 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">User</th>
                <th className="w-[40%] px-3 py-2.5 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Details</th>
                <th className="w-[20%] px-3 py-2.5 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.length > 0 ? (
                logs.map((log) => (
                  <tr key={log.id} className={STYLES.tableRow}>
                    <td className="px-3 py-2.5">
                      <span className={cn(STYLES.badge, getActionColor(log.action), "inline-flex items-center gap-1")}>
                        {(() => {
                          const Icon = getActionIcon(log.action)
                          return <Icon className="w-3 h-3" />
                        })()}
                        {formatAction(log.action)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-sm font-medium text-gray-900">
                        {log.user?.name || 'System'}
                      </span>
                    </td>
                    <AuditLogDetailsCell details={log.details}>
                      {formatAuditDetails(log.details)}
                    </AuditLogDetailsCell>
                    <td className="px-3 py-2.5">
                      <span className="text-sm text-gray-500">
                        {getRelativeTime(log.createdAt)}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center">
                    <FileSearch className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">No audit logs found</p>
                    {search && (
                      <Link 
                        href="/admin/audit-log" 
                        className="text-xs text-primary-600 hover:text-primary-700 mt-1 inline-block"
                      >
                        Clear search
                      </Link>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Showing {(page - 1) * perPage + 1} to {Math.min(page * perPage, total)} of {total} entries
            </p>
            <div className="flex items-center gap-2">
              {page > 1 && (
                <Link
                  href={buildPageUrl(page - 1)}
                  className={cn(STYLES.btn, STYLES.btnSecondary, "px-3 py-1.5 text-xs")}
                >
                  <ChevronLeft className="w-3 h-3" />
                  Previous
                </Link>
              )}
              <span className="text-sm text-gray-500 px-2">
                Page {page} of {totalPages}
              </span>
              {page < totalPages && (
                <Link
                  href={buildPageUrl(page + 1)}
                  className={cn(STYLES.btn, STYLES.btnSecondary, "px-3 py-1.5 text-xs")}
                >
                  Next
                  <ChevronRight className="w-3 h-3" />
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
