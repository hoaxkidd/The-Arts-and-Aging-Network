'use client'

import { useEffect, useMemo, useState, type MouseEvent } from 'react'
import { Eye, Info, Loader2, Megaphone, MoreVertical, Pencil, Plus, Search, Send, ShieldCheck, Trash2, X } from 'lucide-react'
import {
  approveBoardVisibilityForBroadcast,
  createBroadcast,
  deleteBroadcast,
  getBroadcasts,
  sendBroadcast,
  updateBroadcast,
} from '@/app/actions/broadcast-messages'
import { STYLES } from '@/lib/styles'
import { cn } from '@/lib/utils'
import { notify } from '@/lib/notify'
import { InlineStatStrip } from '@/components/ui/InlineStatStrip'
import { DataTableShell } from '@/components/admin/shared/DataTableShell'

type Broadcast = {
  id: string
  title: string
  content: string
  status: string
  createdAt: string | Date
  sentAt: string | Date | null
  targetRoles: string | null
  _count: {
    recipients: number
  }
}

type PendingAction =
  | { type: 'send'; broadcast: Broadcast }
  | { type: 'delete'; broadcast: Broadcast }
  | { type: 'approve'; broadcast: Broadcast }

type ActionMenuState = {
  id: string
  top: number
  left: number
}

const ROLE_OPTIONS = ['PAYROLL', 'HOME_ADMIN', 'FACILITATOR', 'VOLUNTEER', 'PARTNER', 'BOARD']

function formatRole(role: string) {
  return role
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function summarizeAudience(rawRoles: string | null) {
  const roles = (rawRoles || '')
    .split(',')
    .map((role) => role.trim())
    .filter(Boolean)

  if (roles.length === 0) {
    return { short: '-', full: '-' }
  }

  const formatted = roles.map(formatRole)
  if (formatted.length === 1) {
    return { short: formatted[0], full: formatted[0] }
  }

  return {
    short: `${formatted[0]} +${formatted.length - 1} others`,
    full: formatted.join(', '),
  }
}

function formatDate(value: string | Date | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function getStatusBadgeClass(status: string) {
  if (status === 'SENT') return 'bg-emerald-100 text-emerald-700'
  if (status === 'PENDING_BOARD_APPROVAL') return 'bg-amber-100 text-amber-800'
  if (status === 'FAILED') return 'bg-red-100 text-red-700'
  if (status === 'CANCELLED') return 'bg-gray-100 text-gray-600'
  return 'bg-blue-100 text-blue-700'
}

function getStatusLabel(status: string) {
  if (status === 'PENDING_BOARD_APPROVAL') return 'Needs approval'
  if (status === 'PENDING') return 'Pending'
  if (status === 'SENT') return 'Sent'
  if (status === 'FAILED') return 'Failed'
  if (status === 'CANCELLED') return 'Cancelled'
  return status.replaceAll('_', ' ')
}

export default function BroadcastMessagesPage() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [activeActionId, setActiveActionId] = useState<string | null>(null)
  const [actionMenu, setActionMenu] = useState<ActionMenuState | null>(null)
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
  const [quickViewBroadcast, setQuickViewBroadcast] = useState<Broadcast | null>(null)
  const [editingBroadcast, setEditingBroadcast] = useState<Broadcast | null>(null)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [search, setSearch] = useState('')

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    targetRoles: ['PAYROLL', 'HOME_ADMIN', 'FACILITATOR', 'VOLUNTEER', 'PARTNER'] as string[],
  })

  const [editFormData, setEditFormData] = useState({
    title: '',
    content: '',
    targetRoles: ['PAYROLL', 'HOME_ADMIN', 'FACILITATOR', 'VOLUNTEER', 'PARTNER'] as string[],
  })

  useEffect(() => {
    void loadBroadcasts()
  }, [])

  async function loadBroadcasts() {
    setLoading(true)
    const result = await getBroadcasts()
    if (result.error) {
      notify.error({ title: 'Failed to load broadcasts', description: result.error })
      setLoading(false)
      return
    }
    setBroadcasts((result.data as Broadcast[]) || [])
    setLoading(false)
  }

  const filteredBroadcasts = useMemo(() => {
    const query = search.trim().toLowerCase()
    return broadcasts.filter((broadcast) => {
      if (statusFilter !== 'ALL' && broadcast.status !== statusFilter) return false
      if (!query) return true
      return (
        broadcast.title.toLowerCase().includes(query) ||
        broadcast.content.toLowerCase().includes(query)
      )
    })
  }, [broadcasts, statusFilter, search])

  const stats = useMemo(() => {
    return {
      total: broadcasts.length,
      pending: broadcasts.filter((broadcast) => broadcast.status === 'PENDING').length,
      pendingApproval: broadcasts.filter((broadcast) => broadcast.status === 'PENDING_BOARD_APPROVAL').length,
      sent: broadcasts.filter((broadcast) => broadcast.status === 'SENT').length,
      recipients: broadcasts.reduce((sum, broadcast) => sum + (broadcast._count?.recipients || 0), 0),
    }
  }, [broadcasts])

  function closeForm() {
    setShowForm(false)
    setFormData({
      title: '',
      content: '',
      targetRoles: ['PAYROLL', 'HOME_ADMIN', 'FACILITATOR', 'VOLUNTEER', 'PARTNER'],
    })
  }

  function toggleRole(role: string) {
    setFormData((prev) => {
      const has = prev.targetRoles.includes(role)
      const nextRoles = has ? prev.targetRoles.filter((entry) => entry !== role) : [...prev.targetRoles, role]
      return { ...prev, targetRoles: nextRoles }
    })
  }

  function toggleEditRole(role: string) {
    setEditFormData((prev) => {
      const has = prev.targetRoles.includes(role)
      const nextRoles = has ? prev.targetRoles.filter((entry) => entry !== role) : [...prev.targetRoles, role]
      return { ...prev, targetRoles: nextRoles }
    })
  }

  function openActionMenu(event: MouseEvent<HTMLButtonElement>, id: string) {
    const rect = event.currentTarget.getBoundingClientRect()
    const menuWidth = 176
    const menuHeight = 220
    const left = Math.max(8, rect.right - menuWidth)
    const top = Math.max(8, Math.min(rect.bottom + 4, window.innerHeight - menuHeight - 8))
    setActionMenu((prev) => (prev?.id === id ? null : { id, top, left }))
  }

  async function handleCreate() {
    if (!formData.title.trim() || !formData.content.trim()) {
      notify.warning({ title: 'Missing required fields', description: 'Title and message are required.' })
      return
    }

    if (formData.targetRoles.length === 0) {
      notify.warning({ title: 'Select at least one audience role' })
      return
    }

    setSaving(true)
    const result = await createBroadcast({
      title: formData.title.trim(),
      content: formData.content.trim(),
      targetRoles: formData.targetRoles,
    })

    if (result.error) {
      notify.error({ title: 'Broadcast creation failed', description: result.error })
      setSaving(false)
      return
    }

    notify.success({
      title: 'Broadcast created',
      description: `${result.recipientCount || 0} recipients queued`,
    })
    closeForm()
    await loadBroadcasts()
    setSaving(false)
  }

  async function runPendingAction() {
    if (!pendingAction) return
    const { broadcast } = pendingAction
    setActiveActionId(broadcast.id)

    if (pendingAction.type === 'send') {
      const result = await sendBroadcast(broadcast.id)
      if (result.error) {
        notify.error({ title: 'Send failed', description: result.error })
      } else {
        notify.success({
          title: 'Broadcast sent',
          description: `${result.recipientCount || 0} recipients notified`,
        })
      }
    }

    if (pendingAction.type === 'delete') {
      const result = await deleteBroadcast(broadcast.id)
      if (result.error) {
        notify.error({ title: 'Delete failed', description: result.error })
      } else {
        notify.success({ title: 'Broadcast deleted' })
      }
    }

    if (pendingAction.type === 'approve') {
      const result = await approveBoardVisibilityForBroadcast(broadcast.id)
      if (result.error) {
        notify.error({ title: 'Approval failed', description: result.error })
      } else {
        notify.success({ title: 'Board visibility approved' })
      }
    }

    setPendingAction(null)
    setActiveActionId(null)
    setActionMenu(null)
    await loadBroadcasts()
  }

  async function handleUpdate() {
    if (!editingBroadcast) return
    if (!editFormData.title.trim() || !editFormData.content.trim()) {
      notify.warning({ title: 'Missing required fields', description: 'Title and message are required.' })
      return
    }
    if (editFormData.targetRoles.length === 0) {
      notify.warning({ title: 'Select at least one audience role' })
      return
    }

    setSaving(true)
    const result = await updateBroadcast({
      id: editingBroadcast.id,
      title: editFormData.title.trim(),
      content: editFormData.content.trim(),
      targetRoles: editFormData.targetRoles,
    })

    if (result.error) {
      notify.error({ title: 'Update failed', description: result.error })
      setSaving(false)
      return
    }

    notify.success({
      title: 'Broadcast updated',
      description: `${result.recipientCount || 0} recipients queued`,
    })
    setEditingBroadcast(null)
    setSaving(false)
    await loadBroadcasts()
  }

  const actionLabel = pendingAction?.type === 'send'
    ? 'Send now'
    : pendingAction?.type === 'delete'
      ? 'Delete'
      : 'Approve board visibility'

  return (
    <div className="flex h-full min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <div className="relative min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search title or content"
              className={cn(STYLES.input, 'pl-9')}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className={cn(STYLES.select, 'w-[130px] min-w-[130px]')}
          >
            <option value="ALL">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="PENDING_BOARD_APPROVAL">Needs board approval</option>
            <option value="SENT">Sent</option>
            <option value="FAILED">Failed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        <InlineStatStrip
          className="flex-1 min-w-0"
          items={[
            { label: 'Total', value: stats.total },
            { label: 'Pending', value: stats.pending, tone: 'warning' },
            { label: 'Needs approval', value: stats.pendingApproval, tone: 'warning' },
            { label: 'Sent', value: stats.sent, tone: 'success' },
            { label: 'Recipients', value: stats.recipients, tone: 'info' },
          ]}
        />

        <button
          onClick={() => setShowForm(true)}
          className={cn(STYLES.btn, STYLES.btnPrimary, 'ml-auto h-10 px-3 text-xs')}
        >
          <Plus className="h-4 w-4" />
          New Broadcast
        </button>
      </div>

      <DataTableShell className="flex-1 min-h-0">
        {loading ? (
          <div className="flex h-full items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : filteredBroadcasts.length === 0 ? (
          <div className={cn(STYLES.emptyState, 'h-full')}>
            <div className={STYLES.emptyIcon}>
              <Megaphone className="h-8 w-8 text-gray-400" />
            </div>
            <p className={STYLES.emptyTitle}>No broadcasts found</p>
            <p className={STYLES.emptyDescription}>Create a broadcast to send in-app updates at scale.</p>
          </div>
        ) : (
            <table className={cn(STYLES.table, 'table-fixed min-w-[1216px]')}>
              <thead>
                <tr className={STYLES.tableHeadRow}>
                  <th className={cn(STYLES.tableHeader, 'w-[280px]')}>Title</th>
                  <th className={cn(STYLES.tableHeader, 'w-[220px]')}>Audience</th>
                  <th className={cn(STYLES.tableHeader, 'w-[190px]')}>Status</th>
                  <th className={cn(STYLES.tableHeader, 'w-[110px]')}>Recipients</th>
                  <th className={cn(STYLES.tableHeader, 'w-[160px]')}>Created</th>
                  <th className={cn(STYLES.tableHeader, 'w-[160px]')}>Sent</th>
                  <th className={cn(STYLES.tableHeader, 'w-[96px]')}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBroadcasts.map((broadcast) => {
                  const audience = summarizeAudience(broadcast.targetRoles)
                  const isBusy = activeActionId === broadcast.id
                  const canDelete = broadcast.status !== 'SENT'
                  const isMenuOpen = actionMenu?.id === broadcast.id
                  const canEdit = broadcast.status === 'PENDING' || broadcast.status === 'PENDING_BOARD_APPROVAL'

                  return (
                    <tr key={broadcast.id} className={STYLES.tableRow}>
                      <td className={STYLES.tableCell}>
                        <p className="max-w-[200px] truncate whitespace-nowrap font-medium text-gray-900" title={broadcast.title}>
                          {broadcast.title}
                        </p>
                        <p className="mt-0.5 max-w-[220px] truncate whitespace-nowrap text-xs text-gray-500" title={broadcast.content}>
                          {broadcast.content}
                        </p>
                      </td>
                      <td className={STYLES.tableCell}>
                        <div className="group/audience relative inline-flex max-w-[220px] items-center gap-1">
                          <span className="truncate whitespace-nowrap text-xs text-gray-700">{audience.short}</span>
                          {audience.full !== '-' && audience.full !== audience.short ? (
                            <>
                              <button
                                type="button"
                                aria-label={`Audience roles: ${audience.full}`}
                                className="inline-flex h-4 w-4 items-center justify-center rounded text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-300"
                              >
                                <Info className="h-3.5 w-3.5" />
                              </button>
                              <div
                                role="tooltip"
                                className="pointer-events-none absolute bottom-full left-0 z-30 mb-1 hidden whitespace-nowrap rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 shadow-lg group-hover/audience:block group-focus-within/audience:block"
                              >
                                {audience.full}
                              </div>
                            </>
                          ) : null}
                        </div>
                      </td>
                      <td className={cn(STYLES.tableCell, 'whitespace-nowrap')}>
                        <span
                          title={broadcast.status}
                          className={cn(
                            'inline-flex max-w-[170px] items-center rounded px-2 py-0.5 text-xs font-medium truncate whitespace-nowrap',
                            getStatusBadgeClass(broadcast.status)
                          )}
                        >
                          {getStatusLabel(broadcast.status)}
                        </span>
                      </td>
                      <td className={STYLES.tableCell}>{broadcast._count?.recipients || 0}</td>
                      <td className={cn(STYLES.tableCell, 'whitespace-nowrap truncate')} title={formatDate(broadcast.createdAt)}>
                        {formatDate(broadcast.createdAt)}
                      </td>
                      <td className={cn(STYLES.tableCell, 'whitespace-nowrap truncate')} title={formatDate(broadcast.sentAt)}>
                        {formatDate(broadcast.sentAt)}
                      </td>
                      <td className={STYLES.tableCell}>
                        <div className="relative inline-flex items-center">
                          <button
                            type="button"
                            onClick={(event) => openActionMenu(event, broadcast.id)}
                            disabled={isBusy}
                            className="inline-flex h-8 w-8 items-center justify-center rounded border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-60"
                            aria-haspopup="menu"
                            aria-expanded={isMenuOpen}
                            aria-label="Broadcast actions"
                          >
                            {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreVertical className="h-4 w-4" />}
                          </button>

                          {isMenuOpen ? (
                            <>
                              <button
                                type="button"
                                className="fixed inset-0 z-10"
                                aria-label="Close actions menu"
                                onClick={() => setActionMenu(null)}
                              />
                              <div
                                role="menu"
                                aria-label="Broadcast actions"
                                className="fixed z-20 w-44 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg"
                                style={{ top: actionMenu?.top ?? 0, left: actionMenu?.left ?? 0 }}
                              >
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() => {
                                    setActionMenu(null)
                                    setQuickViewBroadcast(broadcast)
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                                >
                                  <Eye className="h-4 w-4" />
                                  Quick view
                                </button>

                                {canEdit ? (
                                  <button
                                    type="button"
                                    role="menuitem"
                                    onClick={() => {
                                      setActionMenu(null)
                                      setEditFormData({
                                        title: broadcast.title,
                                        content: broadcast.content,
                                        targetRoles: (broadcast.targetRoles || '').split(',').filter(Boolean),
                                      })
                                      setEditingBroadcast(broadcast)
                                    }}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                                  >
                                    <Pencil className="h-4 w-4" />
                                    Edit
                                  </button>
                                ) : null}

                                {broadcast.status === 'PENDING' ? (
                                  <button
                                    type="button"
                                    role="menuitem"
                                    onClick={() => {
                                      setActionMenu(null)
                                      setPendingAction({ type: 'send', broadcast })
                                    }}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-emerald-700 hover:bg-emerald-50"
                                  >
                                    <Send className="h-4 w-4" />
                                    Send now
                                  </button>
                                ) : null}

                                {broadcast.status === 'PENDING_BOARD_APPROVAL' ? (
                                  <button
                                    type="button"
                                    role="menuitem"
                                    onClick={() => {
                                      setActionMenu(null)
                                      setPendingAction({ type: 'approve', broadcast })
                                    }}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-amber-700 hover:bg-amber-50"
                                  >
                                    <ShieldCheck className="h-4 w-4" />
                                    Approve visibility
                                  </button>
                                ) : null}

                                {canDelete ? (
                                  <button
                                    type="button"
                                    role="menuitem"
                                    onClick={() => {
                                      setActionMenu(null)
                                      setPendingAction({ type: 'delete', broadcast })
                                    }}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    Delete
                                  </button>
                                ) : (
                                  <div className="px-3 py-2 text-xs text-gray-500">Retained for audit</div>
                                )}
                              </div>
                            </>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
        )}
      </DataTableShell>

      {showForm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={closeForm} />
          <div className="relative w-full max-w-xl rounded-lg border border-gray-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <h2 className="text-base font-semibold text-gray-900">Create Broadcast</h2>
              <button
                onClick={closeForm}
                className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded text-gray-500 hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 p-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(event) => setFormData((prev) => ({ ...prev, title: event.target.value }))}
                  className={STYLES.input}
                  placeholder="Important schedule update"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Message</label>
                <textarea
                  value={formData.content}
                  onChange={(event) => setFormData((prev) => ({ ...prev, content: event.target.value }))}
                  rows={6}
                  className={cn(STYLES.input, 'resize-none')}
                  placeholder="Write the in-app message users should receive"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Audience roles</label>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {ROLE_OPTIONS.map((role) => (
                    <label key={role} className="inline-flex items-center gap-2 rounded border border-gray-200 px-2 py-1.5">
                      <input
                        type="checkbox"
                        checked={formData.targetRoles.includes(role)}
                        onChange={() => toggleRole(role)}
                        className="rounded border-gray-300"
                      />
                      <span>{role.replace('_', ' ')}</span>
                    </label>
                  ))}
                </div>
                {formData.targetRoles.includes('BOARD') ? (
                  <p className="mt-2 rounded border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-700">
                    Board recipients require ED/Chair approval before sending.
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-4 py-3">
              <button
                onClick={closeForm}
                className="rounded px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className={cn(STYLES.btn, STYLES.btnPrimary, 'disabled:opacity-60')}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Create
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {editingBroadcast ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setEditingBroadcast(null)} />
          <div className="relative w-full max-w-xl rounded-lg border border-gray-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <h2 className="text-base font-semibold text-gray-900">Edit Broadcast</h2>
              <button
                onClick={() => setEditingBroadcast(null)}
                className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded text-gray-500 hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 p-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Title</label>
                <input
                  type="text"
                  value={editFormData.title}
                  onChange={(event) => setEditFormData((prev) => ({ ...prev, title: event.target.value }))}
                  className={STYLES.input}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Message</label>
                <textarea
                  value={editFormData.content}
                  onChange={(event) => setEditFormData((prev) => ({ ...prev, content: event.target.value }))}
                  rows={6}
                  className={cn(STYLES.input, 'resize-none')}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Audience roles</label>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {ROLE_OPTIONS.map((role) => (
                    <label key={role} className="inline-flex items-center gap-2 rounded border border-gray-200 px-2 py-1.5">
                      <input
                        type="checkbox"
                        checked={editFormData.targetRoles.includes(role)}
                        onChange={() => toggleEditRole(role)}
                        className="rounded border-gray-300"
                      />
                      <span>{role.replace('_', ' ')}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-4 py-3">
              <button
                onClick={() => setEditingBroadcast(null)}
                className="rounded px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdate}
                disabled={saving}
                className={cn(STYLES.btn, STYLES.btnPrimary, 'disabled:opacity-60')}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {quickViewBroadcast ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setQuickViewBroadcast(null)} />
          <div className="relative w-full max-w-2xl rounded-lg border border-gray-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <h2 className="text-base font-semibold text-gray-900">Broadcast quick view</h2>
              <button
                onClick={() => setQuickViewBroadcast(null)}
                className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded text-gray-500 hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3 p-4">
              <div className="flex flex-wrap gap-2 text-xs">
                <span className={cn('inline-flex rounded px-2 py-0.5 font-medium', getStatusBadgeClass(quickViewBroadcast.status))}>
                  {quickViewBroadcast.status}
                </span>
                <span className="rounded bg-gray-100 px-2 py-0.5 text-gray-600">
                  {quickViewBroadcast._count?.recipients || 0} recipients
                </span>
                <span className="rounded bg-gray-100 px-2 py-0.5 text-gray-600">
                  Created {formatDate(quickViewBroadcast.createdAt)}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">{quickViewBroadcast.title}</h3>
              <div className="max-h-[320px] overflow-y-auto rounded-md border border-gray-200 bg-gray-50 p-3 text-sm whitespace-pre-wrap text-gray-700">
                {quickViewBroadcast.content}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {pendingAction ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setPendingAction(null)} />
          <div className="relative w-full max-w-md rounded-lg border border-gray-200 bg-white p-4 shadow-xl">
            <h3 className="text-sm font-semibold text-gray-900">{actionLabel}</h3>
            <p className="mt-1 text-sm text-gray-600">
              {pendingAction.type === 'delete'
                ? `Delete "${pendingAction.broadcast.title}"? This cannot be undone.`
                : pendingAction.type === 'approve'
                  ? `Approve board visibility for "${pendingAction.broadcast.title}"?`
                  : `Send "${pendingAction.broadcast.title}" to all pending recipients now?`}
            </p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={() => setPendingAction(null)}
                className="rounded px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={runPendingAction}
                className={cn(
                  'rounded px-3 py-2 text-sm text-white',
                  pendingAction.type === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-primary-600 hover:bg-primary-700'
                )}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
