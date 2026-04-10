import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getPendingConversationRequests } from "@/app/actions/conversation-requests"
import { ConversationRequestsList } from "@/components/admin/ConversationRequestsList"
import { ConversationRequestsAuditTable, type ConversationRequestAuditRow } from "@/components/admin/ConversationRequestsAuditTable"
import { prisma } from "@/lib/prisma"
import { STYLES } from "@/lib/styles"
import { cn, safeJsonParse } from "@/lib/utils"

export const dynamic = 'force-dynamic'

type AuditDetails = {
  requesterId?: string
  requestedId?: string
  note?: string | null
}

function actionToStatus(action: string): ConversationRequestAuditRow['status'] | null {
  if (action === 'CONVERSATION_REQUEST_CREATED') return 'CREATED'
  if (action === 'CONVERSATION_REQUEST_APPROVED') return 'APPROVED'
  if (action === 'CONVERSATION_REQUEST_DENIED') return 'DENIED'
  return null
}

export default async function ConversationRequestsPage() {
  const session = await auth()

  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    redirect('/admin')
  }

  const result = await getPendingConversationRequests()

  const [auditLogs, approvedCount, deniedCount] = await Promise.all([
    prisma.auditLog.findMany({
      where: {
        action: {
          in: [
            'CONVERSATION_REQUEST_CREATED',
            'CONVERSATION_REQUEST_APPROVED',
            'CONVERSATION_REQUEST_DENIED'
          ]
        }
      },
      include: {
        user: {
          select: {
            name: true,
            preferredName: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    }),
    prisma.directMessageRequest.count({ where: { status: 'APPROVED' } }),
    prisma.directMessageRequest.count({ where: { status: 'DENIED' } })
  ])

  if ('error' in result) {
    return <div className="p-4 text-red-600">{result.error}</div>
  }

  const allUserIds = new Set<string>()
  for (const log of auditLogs) {
    const details = safeJsonParse<AuditDetails>(log.details, {})
    if (details.requesterId) allUserIds.add(details.requesterId)
    if (details.requestedId) allUserIds.add(details.requestedId)
  }

  const users = allUserIds.size
    ? await prisma.user.findMany({
        where: { id: { in: Array.from(allUserIds) } },
        select: { id: true, name: true, preferredName: true, userCode: true }
      })
    : []

  const userMap = new Map(
    users.map((user) => [user.id, user.preferredName || user.name || user.userCode || 'Unknown user'])
  )

  const historyRows: ConversationRequestAuditRow[] = auditLogs
    .map((log) => {
      const status = actionToStatus(log.action)
      if (!status) return null

      const details = safeJsonParse<AuditDetails>(log.details, {})
      return {
        id: log.id,
        status,
        requesterName: details.requesterId ? userMap.get(details.requesterId) || 'Unknown user' : 'Unknown user',
        requestedName: details.requestedId ? userMap.get(details.requestedId) || 'Unknown user' : 'Unknown user',
        actorName: log.user?.preferredName || log.user?.name || 'System',
        note: details.note || null,
        createdAt: log.createdAt
      }
    })
    .filter((row): row is ConversationRequestAuditRow => row !== null)

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className={cn(STYLES.statsCard, 'p-4')}>
          <p className="text-sm text-gray-500">Pending</p>
          <p className="text-2xl font-bold text-gray-900">{result.requests.length}</p>
        </div>
        <div className={cn(STYLES.statsCard, 'p-4')}>
          <p className="text-sm text-gray-500">Approved (All-time)</p>
          <p className="text-2xl font-bold text-green-700">{approvedCount}</p>
        </div>
        <div className={cn(STYLES.statsCard, 'p-4')}>
          <p className="text-sm text-gray-500">Denied (All-time)</p>
          <p className="text-2xl font-bold text-red-700">{deniedCount}</p>
        </div>
      </div>

      <ConversationRequestsList requests={result.requests} />
      <ConversationRequestsAuditTable rows={historyRows} />
    </div>
  )
}
