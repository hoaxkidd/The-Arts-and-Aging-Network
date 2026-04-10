"use client"

import { useMemo, useState } from 'react'
import { STYLES } from '@/lib/styles'
import { cn } from '@/lib/utils'
import { Search, MoreVertical, Eye, Copy, X } from 'lucide-react'
import { getRelativeTime } from '@/lib/date-utils'
import { notify } from '@/lib/notify'

type AuditStatus = 'CREATED' | 'APPROVED' | 'DENIED'

export type ConversationRequestAuditRow = {
  id: string
  status: AuditStatus
  requesterName: string
  requestedName: string
  actorName: string
  note: string | null
  createdAt: Date | string
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

function formatDateTime(value: Date | string): string {
  const date = new Date(value)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const month = months[date.getUTCMonth()]
  const day = date.getUTCDate()
  const year = date.getUTCFullYear()
  const hours24 = date.getUTCHours()
  const minutes = String(date.getUTCMinutes()).padStart(2, '0')
  const ampm = hours24 >= 12 ? 'PM' : 'AM'
  const hour12 = hours24 % 12 === 0 ? 12 : hours24 % 12
  return `${month} ${day}, ${year} at ${hour12}:${minutes} ${ampm}`
}

function menuPositionFromRect(rect: DOMRect) {
  const menuWidth = 176
  const menuHeight = 116
  const left = Math.max(8, rect.right - menuWidth)
  const top = Math.max(8, Math.min(rect.bottom + 4, window.innerHeight - menuHeight - 8))
  return { top, left }
}

export function ConversationRequestsAuditTable({ rows }: Props) {
  const [statusFilter, setStatusFilter] = useState<'ALL' | AuditStatus>('ALL')
  const [query, setQuery] = useState('')
  const [actionMenu, setActionMenu] = useState<{ id: string; top: number; left: number } | null>(null)
  const [selectedRow, setSelectedRow] = useState<ConversationRequestAuditRow | null>(null)

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((row) => {
      if (statusFilter !== 'ALL' && row.status !== statusFilter) return false
      if (!q) return true

      const haystack = `${row.requesterName} ${row.requestedName} ${row.actorName} ${row.note || ''}`.toLowerCase()
      return haystack.includes(q)
    })
  }, [rows, statusFilter, query])

  async function copySummary(row: ConversationRequestAuditRow) {
    const summary = `${statusLabel(row.status)} | ${row.requesterName} -> ${row.requestedName} | by ${row.actorName} | ${formatDateTime(row.createdAt)}${row.note ? ` | note: ${row.note}` : ''}`
    try {
      await navigator.clipboard.writeText(summary)
      notify.success({ title: 'Summary copied' })
    } catch {
      notify.error({ title: 'Copy failed', description: 'Could not copy summary to clipboard.' })
    }
  }

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
      <div className="px-5 py-4 border-b border-gray-200 space-y-3">
        <h2 className="text-base font-semibold text-gray-900">Request History</h2>
        <p className="text-sm text-gray-500">Previous approvals, denials, and request creation events.</p>

        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={cn(
                STYLES.btn,
                STYLES.btnSecondary,
                'h-8 px-3 py-0 text-xs',
                statusFilter === 'ALL' && 'bg-primary-50 border-primary-300 text-primary-700'
              )}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('CREATED')}
              className={cn(
                STYLES.btn,
                STYLES.btnSecondary,
                'h-8 px-3 py-0 text-xs',
                statusFilter === 'CREATED' && 'bg-primary-50 border-primary-300 text-primary-700'
              )}
            >
              Created
            </button>
            <button
              onClick={() => setStatusFilter('APPROVED')}
              className={cn(
                STYLES.btn,
                STYLES.btnSecondary,
                'h-8 px-3 py-0 text-xs',
                statusFilter === 'APPROVED' && 'bg-primary-50 border-primary-300 text-primary-700'
              )}
            >
              Approved
            </button>
            <button
              onClick={() => setStatusFilter('DENIED')}
              className={cn(
                STYLES.btn,
                STYLES.btnSecondary,
                'h-8 px-3 py-0 text-xs',
                statusFilter === 'DENIED' && 'bg-primary-50 border-primary-300 text-primary-700'
              )}
            >
              Denied
            </button>
          </div>

          <div className="relative lg:ml-auto w-full lg:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search requester, requested, actor, note..."
              className={cn(STYLES.input, 'pl-9')}
            />
          </div>
        </div>
      </div>

      {filteredRows.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <p className={STYLES.emptyTitle}>No matching history entries</p>
          <p className={STYLES.emptyDescription}>Try a different filter or search term.</p>
        </div>
      ) : (
        <>
      <div className="md:hidden divide-y divide-gray-100">
        {filteredRows.map((row) => (
          <div key={row.id} className="px-4 py-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className={cn(STYLES.badge, statusBadgeClass(row.status))}>{statusLabel(row.status)}</span>
              <p className="text-xs text-gray-500 text-right">
                {formatDateTime(row.createdAt)}
                <br />
                <span suppressHydrationWarning>{getRelativeTime(row.createdAt)}</span>
              </p>
            </div>
            <p className="text-sm text-gray-800">
              <span className="font-medium">{row.requesterName}</span> -&gt; <span className="font-medium">{row.requestedName}</span>
            </p>
            <p className="text-xs text-gray-500">Action by: {row.actorName}</p>
            {row.note && <p className="text-sm text-gray-600">Note: {row.note}</p>}
          </div>
        ))}
      </div>

      <div className="hidden md:block table-scroll-wrapper max-h-[420px]">
        <table className={STYLES.table}>
          <thead className="bg-gray-50">
            <tr className={STYLES.tableHeadRow}>
              <th className={STYLES.tableHeader}>Status</th>
              <th className={STYLES.tableHeader}>Requester</th>
              <th className={STYLES.tableHeader}>Requested</th>
              <th className={STYLES.tableHeader}>Action By</th>
              <th className={STYLES.tableHeader}>Note</th>
              <th className={STYLES.tableHeader}>Time</th>
              <th className={cn(STYLES.tableHeader, 'text-right')}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredRows.map((row) => (
              <tr key={row.id} className={STYLES.tableRow}>
                <td className={STYLES.tableCell}>
                  <span className={cn(STYLES.badge, statusBadgeClass(row.status))}>{statusLabel(row.status)}</span>
                </td>
                <td className={STYLES.tableCell}>{row.requesterName}</td>
                <td className={STYLES.tableCell}>{row.requestedName}</td>
                <td className={STYLES.tableCell}>{row.actorName}</td>
                <td className={cn(STYLES.tableCell, 'max-w-[280px] truncate')} title={row.note || undefined}>{row.note || '-'}</td>
                <td className={cn(STYLES.tableCell, 'whitespace-nowrap')}>
                  {formatDateTime(row.createdAt)}
                  <div className="text-xs text-gray-400" suppressHydrationWarning>{getRelativeTime(row.createdAt)}</div>
                </td>
                <td className={cn(STYLES.tableCell, 'text-right')}>
                  <button
                    onClick={(event) => {
                      event.stopPropagation()
                      const rect = event.currentTarget.getBoundingClientRect()
                      const { top, left } = menuPositionFromRect(rect)
                      setActionMenu((prev) => (prev?.id === row.id ? null : { id: row.id, top, left }))
                    }}
                    className={cn(STYLES.btnIcon, 'inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white hover:bg-gray-50')}
                    aria-label="Open quick actions"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </>
      )}

      {actionMenu && (
        <>
          <div className="fixed inset-0 z-[95]" onClick={() => setActionMenu(null)} />
          <div
            className="fixed z-[100] w-44 rounded-lg border border-gray-200 bg-white p-1.5 shadow-xl"
            style={{ top: actionMenu.top, left: actionMenu.left }}
          >
            <button
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
              onClick={() => {
                const row = filteredRows.find((entry) => entry.id === actionMenu.id)
                if (row) setSelectedRow(row)
                setActionMenu(null)
              }}
            >
              <Eye className="h-4 w-4" />
              View details
            </button>
            <button
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
              onClick={() => {
                const row = filteredRows.find((entry) => entry.id === actionMenu.id)
                if (row) {
                  void copySummary(row)
                }
                setActionMenu(null)
              }}
            >
              <Copy className="h-4 w-4" />
              Copy summary
            </button>
          </div>
        </>
      )}

      {selectedRow && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedRow(null)} />
          <div className="relative w-full max-w-xl rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Request History Detail</h3>
                <p className="text-sm text-gray-500">Read-only audit details for this request action.</p>
              </div>
              <button
                onClick={() => setSelectedRow(null)}
                className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex items-center gap-2">
                <span className={cn(STYLES.badge, statusBadgeClass(selectedRow.status))}>{statusLabel(selectedRow.status)}</span>
                <span className="text-sm text-gray-500">{formatDateTime(selectedRow.createdAt)}</span>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <p className="text-xs uppercase tracking-wide text-gray-500">Requester</p>
                <p className="text-sm font-medium text-gray-900 mt-1">{selectedRow.requesterName}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <p className="text-xs uppercase tracking-wide text-gray-500">Requested</p>
                <p className="text-sm font-medium text-gray-900 mt-1">{selectedRow.requestedName}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <p className="text-xs uppercase tracking-wide text-gray-500">Action By</p>
                <p className="text-sm font-medium text-gray-900 mt-1">{selectedRow.actorName}</p>
              </div>
              <div className="rounded-lg border border-gray-200 p-3">
                <p className="text-xs uppercase tracking-wide text-gray-500">Note</p>
                <p className="text-sm text-gray-800 mt-1">{selectedRow.note || '-'}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
