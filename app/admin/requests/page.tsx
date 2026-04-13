import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { approveChangeRequest, rejectChangeRequest, updateRequestStatus } from "@/app/actions/admin"
import { CheckCircle, XCircle, Clock, FileText, DollarSign, Calendar, UserRound, Building2 } from "lucide-react"
import { STYLES } from "@/lib/styles"
import { cn } from "@/lib/utils"
import { formatDateShort } from "@/lib/date-utils"
import Link from "next/link"

export const dynamic = 'force-dynamic'

type ChangeRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export default async function AdminRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    return <div>Unauthorized</div>
  }

  const params = await searchParams
  const selectedStatus = (params.status || 'PENDING').toUpperCase() as ChangeRequestStatus

  const [expenseRequests, requestedLogs, decisionLogs] = await Promise.all([
    prisma.expenseRequest.findMany({
      orderBy: { createdAt: 'desc' },
      include: { user: true },
    }),
    prisma.auditLog.findMany({
      where: {
        action: {
          in: ['HOME_CHANGE_REQUESTED', 'PROGRAM_COORDINATOR_PROFILE_CHANGE_REQUESTED'],
        },
      },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    }),
    prisma.auditLog.findMany({
      where: {
        action: {
          in: [
            'HOME_CHANGE_APPROVED',
            'HOME_CHANGE_REJECTED',
            'PROGRAM_COORDINATOR_PROFILE_CHANGE_APPROVED',
            'PROGRAM_COORDINATOR_PROFILE_CHANGE_REJECTED',
          ],
        },
      },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 400,
    }),
  ])

  const decisionByRequest = new Map<string, { status: ChangeRequestStatus; reviewedAt: Date; reviewer: string | null; note: string | null }>()
  for (const decision of decisionLogs) {
    let requestAuditId: string | null = null
    let note: string | null = null
    try {
      const parsed = decision.details ? JSON.parse(decision.details) : null
      requestAuditId = parsed?.requestAuditId || null
      note = parsed?.note || null
    } catch {
      requestAuditId = null
    }
    if (!requestAuditId || decisionByRequest.has(requestAuditId)) continue

    const status: ChangeRequestStatus = decision.action.endsWith('APPROVED') ? 'APPROVED' : 'REJECTED'
    decisionByRequest.set(requestAuditId, {
      status,
      reviewedAt: decision.createdAt,
      reviewer: decision.user?.name || decision.user?.email || null,
      note,
    })
  }

  const changeRequests = requestedLogs.map((request) => {
    let parsed: any = {}
    try {
      parsed = request.details ? JSON.parse(request.details) : {}
    } catch {
      parsed = {}
    }

    const decision = decisionByRequest.get(request.id)
    const status: ChangeRequestStatus = decision?.status || 'PENDING'
    const type = request.action === 'HOME_CHANGE_REQUESTED' ? 'HOME_PROFILE' : 'PROGRAM_COORDINATOR_PROFILE'

    return {
      id: request.id,
      status,
      type,
      requesterName: request.user?.name || request.user?.email || 'Unknown requester',
      requesterEmail: request.user?.email || null,
      requesterId: request.userId,
      createdAt: request.createdAt,
      payload: parsed?.requestedUpdates || {},
      homeId: parsed?.homeId || null,
      targetUserId: parsed?.userId || null,
      reviewedAt: decision?.reviewedAt || null,
      reviewer: decision?.reviewer || null,
      note: decision?.note || null,
    }
  })

  const filteredChangeRequests = changeRequests.filter((request) => request.status === selectedStatus)

  return (
    <div className="space-y-8">
      <section className={cn(STYLES.card, 'p-4 sm:p-5')}>
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Program Coordinator Change Requests</h2>
            <p className="text-xs text-gray-500 mt-1">Approve or reject pending profile and care home updates.</p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Link href="/admin/requests?status=PENDING" className={cn(STYLES.badge, selectedStatus === 'PENDING' ? STYLES.badgeWarning : STYLES.badgeNeutral)}>
              Pending
            </Link>
            <Link href="/admin/requests?status=APPROVED" className={cn(STYLES.badge, selectedStatus === 'APPROVED' ? STYLES.badgeSuccess : STYLES.badgeNeutral)}>
              Approved
            </Link>
            <Link href="/admin/requests?status=REJECTED" className={cn(STYLES.badge, selectedStatus === 'REJECTED' ? STYLES.badgeDanger : STYLES.badgeNeutral)}>
              Rejected
            </Link>
          </div>
        </div>

        <div className="space-y-3">
          {filteredChangeRequests.length === 0 ? (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-sm text-gray-500 text-center">
              No {selectedStatus.toLowerCase()} change requests.
            </div>
          ) : (
            filteredChangeRequests.map((request) => (
              <article key={request.id} className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      {request.type === 'HOME_PROFILE' ? <Building2 className="w-4 h-4 text-primary-600" /> : <UserRound className="w-4 h-4 text-primary-600" />}
                      {request.type === 'HOME_PROFILE' ? 'Care Home Profile Update' : 'Program Coordinator Profile Update'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Requested by {request.requesterName}
                      {request.requesterEmail ? ` (${request.requesterEmail})` : ''}
                      {' • '} {formatDateShort(new Date(request.createdAt))}
                    </p>
                    {request.homeId && (
                      <p className="text-xs text-gray-500 mt-1">Home: <Link href={`/admin/homes/${request.homeId}`} className="text-primary-600 hover:underline">{request.homeId}</Link></p>
                    )}
                    {request.targetUserId && (
                      <p className="text-xs text-gray-500 mt-1">User: <Link href={`/admin/users/${request.targetUserId}`} className="text-primary-600 hover:underline">{request.targetUserId}</Link></p>
                    )}
                  </div>

                  <span className={cn(STYLES.badge, request.status === 'PENDING' ? STYLES.badgeWarning : request.status === 'APPROVED' ? STYLES.badgeSuccess : STYLES.badgeDanger)}>
                    {request.status}
                  </span>
                </div>

                <div className="mt-3 rounded-md border border-gray-100 bg-gray-50 p-3">
                  <p className="text-xs font-medium text-gray-700 mb-2">Requested Changes</p>
                  <pre className="text-xs text-gray-600 whitespace-pre-wrap break-words">{JSON.stringify(request.payload, null, 2)}</pre>
                </div>

                {request.status === 'PENDING' ? (
                  <div className="mt-3 flex items-center gap-2">
                    <form action={async () => {
                      'use server'
                      await approveChangeRequest(request.id)
                    }}>
                      <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-green-600 text-white hover:bg-green-700">
                        <CheckCircle className="w-3.5 h-3.5" /> Approve
                      </button>
                    </form>
                    <form action={async () => {
                      'use server'
                      await rejectChangeRequest(request.id)
                    }}>
                      <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-red-600 text-white hover:bg-red-700">
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </button>
                    </form>
                  </div>
                ) : (
                  <div className="mt-3 text-xs text-gray-500">
                    Reviewed by {request.reviewer || 'Admin'} on {request.reviewedAt ? formatDateShort(new Date(request.reviewedAt)) : 'N/A'}
                    {request.note ? ` • Note: ${request.note}` : ''}
                  </div>
                )}
              </article>
            ))
          )}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Expense & Time Requests</h2>
        <div className={cn(STYLES.card, "p-0 overflow-hidden")}>
          <div className="table-scroll-wrapper max-h-[calc(100vh-320px)]">
            <table className={STYLES.table}>
              <thead className="bg-gray-50">
                <tr className={STYLES.tableHeadRow}>
                  <th className={STYLES.tableHeader}>Staff Member</th>
                  <th className={STYLES.tableHeader}>Type</th>
                  <th className={STYLES.tableHeader}>Details</th>
                  <th className={STYLES.tableHeader}>Amount</th>
                  <th className={STYLES.tableHeader}>Date</th>
                  <th className={STYLES.tableHeader}>Status</th>
                  <th className={cn(STYLES.tableHeader, "text-right")}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {expenseRequests.map((req) => (
                  <tr key={req.id} className={STYLES.tableRow}>
                    <td className={STYLES.tableCell}>
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-bold text-xs">
                          {req.user.name?.[0] || 'U'}
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">{req.user.name}</div>
                          <div className="text-xs text-gray-500">{req.user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className={STYLES.tableCell}>
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        {req.category === 'EXPENSE' ? <DollarSign className="w-4 h-4 text-green-600" /> :
                         req.category === 'SICK_DAY' ? <Calendar className="w-4 h-4 text-red-600" /> :
                          <FileText className="w-4 h-4 text-blue-600" />}
                        <span className="capitalize">{req.category.replace('_', ' ').toLowerCase()}</span>
                      </div>
                    </td>
                    <td className={STYLES.tableCell}>
                      <p className="text-sm text-gray-600 truncate max-w-xs" title={req.description}>{req.description}</p>
                    </td>
                    <td className={STYLES.tableCell}>{req.amount ? `$${req.amount.toFixed(2)}` : '-'}</td>
                    <td className={STYLES.tableCell}>{formatDateShort(new Date(req.createdAt))}</td>
                    <td className={STYLES.tableCell}>
                      <span className={cn(STYLES.badge, req.status === 'APPROVED' ? 'text-green-700' : req.status === 'REJECTED' ? 'text-red-700' : 'text-yellow-700')}>
                        {req.status}
                      </span>
                    </td>
                    <td className={cn(STYLES.tableCell, "text-right")}>
                      {req.status === 'PENDING' && (
                        <div className="flex items-center justify-end gap-2">
                          <form action={async () => {
                            'use server'
                            await updateRequestStatus(req.id, 'APPROVED')
                          }}>
                            <button className="text-green-600 hover:text-green-900 p-1 hover:bg-green-50 rounded" title="Approve">
                              <CheckCircle className="w-5 h-5" />
                            </button>
                          </form>
                          <form action={async () => {
                            'use server'
                            await updateRequestStatus(req.id, 'REJECTED')
                          }}>
                            <button className="text-red-600 hover:text-red-900 p-1 hover:bg-red-50 rounded" title="Reject">
                              <XCircle className="w-5 h-5" />
                            </button>
                          </form>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {expenseRequests.length === 0 && (
                  <tr>
                    <td colSpan={7} className={cn(STYLES.tableCell, "text-center py-12")}>No requests found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  )
}
