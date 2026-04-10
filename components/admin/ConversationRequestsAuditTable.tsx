import { STYLES } from '@/lib/styles'
import { cn } from '@/lib/utils'

type AuditStatus = 'CREATED' | 'APPROVED' | 'DENIED'

export type ConversationRequestAuditRow = {
  id: string
  status: AuditStatus
  requesterName: string
  requestedName: string
  actorName: string
  note: string | null
  createdAt: Date
}

type Props = {
  rows: ConversationRequestAuditRow[]
}

function statusLabel(status: AuditStatus): string {
  if (status === 'APPROVED') return 'Approved'
  if (status === 'DENIED') return 'Denied'
  return 'Created'
}

function statusBadgeClass(status: AuditStatus): string {
  if (status === 'APPROVED') return STYLES.badgeSuccess
  if (status === 'DENIED') return STYLES.badgeDanger
  return STYLES.badgeInfo
}

export function ConversationRequestsAuditTable({ rows }: Props) {
  if (rows.length === 0) {
    return (
      <div className={cn(STYLES.card, 'p-10 text-center')}>
        <p className={STYLES.emptyTitle}>No request history yet</p>
        <p className={STYLES.emptyDescription}>Approvals and denials will appear here.</p>
      </div>
    )
  }

  return (
    <div className={cn(STYLES.card, 'p-0 overflow-hidden')}>
      <div className="px-5 py-4 border-b border-gray-200">
        <h2 className="text-base font-semibold text-gray-900">Request History</h2>
        <p className="text-sm text-gray-500 mt-1">Recent created, approved, and denied actions.</p>
      </div>

      <div className="table-scroll-wrapper max-h-[420px]">
        <table className={STYLES.table}>
          <thead className="bg-gray-50">
            <tr className={STYLES.tableHeadRow}>
              <th className={STYLES.tableHeader}>Status</th>
              <th className={STYLES.tableHeader}>Requester</th>
              <th className={STYLES.tableHeader}>Requested</th>
              <th className={STYLES.tableHeader}>Action By</th>
              <th className={STYLES.tableHeader}>Note</th>
              <th className={STYLES.tableHeader}>Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => (
              <tr key={row.id} className={STYLES.tableRow}>
                <td className={STYLES.tableCell}>
                  <span className={cn(STYLES.badge, statusBadgeClass(row.status))}>{statusLabel(row.status)}</span>
                </td>
                <td className={STYLES.tableCell}>{row.requesterName}</td>
                <td className={STYLES.tableCell}>{row.requestedName}</td>
                <td className={STYLES.tableCell}>{row.actorName}</td>
                <td className={cn(STYLES.tableCell, 'max-w-[280px] truncate')}>{row.note || '-'}</td>
                <td className={cn(STYLES.tableCell, 'whitespace-nowrap')}>
                  {row.createdAt.toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit'
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
