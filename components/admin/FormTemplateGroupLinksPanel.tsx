'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Users, Trash2 } from 'lucide-react'
import { attachFormToGroup, removeFormFromGroup } from '@/app/actions/messaging'
import { STYLES } from '@/lib/styles'
import { cn } from '@/lib/utils'

export type FormGroupAttachmentRow = {
  groupId: string
  group: {
    id: string
    name: string
    iconEmoji: string
    isActive: boolean
  }
}

export type MessageGroupOption = {
  id: string
  name: string
  iconEmoji: string
  isAttachableToForms: boolean
}

type Props = {
  formTemplateId: string
  attachments: FormGroupAttachmentRow[]
  groupOptions: MessageGroupOption[]
  /** When set (e.g. modal context), called after successful attach/remove so parent can refetch props. */
  onLinksChanged?: () => void | Promise<void>
}

export function FormTemplateGroupLinksPanel({
  formTemplateId,
  attachments,
  groupOptions,
  onLinksChanged,
}: Props) {
  const router = useRouter()
  const [selectedId, setSelectedId] = useState('')
  const [showAllGroups, setShowAllGroups] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectable = useMemo(() => {
    const attached = new Set(attachments.map((a) => a.groupId))
    const pool = showAllGroups
      ? groupOptions
      : groupOptions.filter((g) => g.isAttachableToForms)
    return pool.filter((g) => !attached.has(g.id))
  }, [groupOptions, showAllGroups, attachments])

  async function attach() {
    if (!selectedId) return
    setError(null)
    setBusy(true)
    const result = await attachFormToGroup({ groupId: selectedId, formTemplateId })
    setBusy(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setSelectedId('')
    router.refresh()
    await onLinksChanged?.()
  }

  async function remove(groupId: string) {
    if (!confirm('Remove this group from the form?')) return
    setError(null)
    setBusy(true)
    const result = await removeFormFromGroup(groupId, formTemplateId)
    setBusy(false)
    if (result.error) {
      setError(result.error)
      return
    }
    router.refresh()
    await onLinksChanged?.()
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className={STYLES.cardHeader}>
        <div className={STYLES.cardTitle}>
          <Users className="w-4 h-4 text-gray-500 shrink-0" />
          Linked messaging groups
        </div>
      </div>

      <div className="px-4 pb-3 sm:px-5 space-y-3">
        <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={showAllGroups}
            onChange={(e) => {
              setShowAllGroups(e.target.checked)
              setSelectedId('')
            }}
            className="mt-1 rounded border-gray-300"
          />
          <span>Show all active groups (not only “attachable to forms”)</span>
        </label>

        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-3">
          <div className="flex-1 min-w-[12rem] max-w-md">
            <label className="text-xs font-medium text-gray-600">Attach group</label>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              disabled={busy || selectable.length === 0}
              className={cn(STYLES.input, STYLES.select, 'mt-1')}
            >
              <option value="">
                {selectable.length === 0
                  ? 'No groups available to attach'
                  : 'Select a group…'}
              </option>
              {selectable.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.iconEmoji} {g.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => void attach()}
            disabled={!selectedId || busy}
            className={cn(STYLES.btn, STYLES.btnPrimary, 'w-full sm:w-auto shrink-0')}
          >
            Attach
          </button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 px-4 sm:px-5 pb-2" role="alert">
          {error}
        </p>
      )}

      <div className="overflow-x-auto border-t border-gray-100">
        <table className={STYLES.table}>
          <thead className="bg-gray-50">
            <tr className={STYLES.tableHeadRow}>
              <th className={STYLES.tableHeader}>Group</th>
              <th className={cn(STYLES.tableHeader, 'whitespace-nowrap')}>Status</th>
              <th className={cn(STYLES.tableHeader, 'text-right w-[100px]')}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {attachments.length === 0 ? (
              <tr>
                <td colSpan={3} className={cn(STYLES.tableCell, 'text-center py-8 text-gray-500')}>
                  No groups linked yet.
                </td>
              </tr>
            ) : (
              attachments.map((row) => (
                <tr key={row.groupId} className={STYLES.tableRow}>
                  <td className={STYLES.tableCell}>
                    <Link
                      href={`/admin/messaging/${row.group.id}`}
                      className="font-medium text-primary-700 hover:underline"
                    >
                      <span className="mr-1.5" aria-hidden>
                        {row.group.iconEmoji}
                      </span>
                      {row.group.name}
                    </Link>
                  </td>
                  <td className={STYLES.tableCell}>
                    {row.group.isActive ? (
                      <span className={cn(STYLES.badge, STYLES.badgeSuccess)}>Active</span>
                    ) : (
                      <span className={cn(STYLES.badge, STYLES.badgeNeutral)}>Inactive</span>
                    )}
                  </td>
                  <td className={cn(STYLES.tableCell, 'text-right')}>
                    <button
                      type="button"
                      onClick={() => void remove(row.groupId)}
                      disabled={busy}
                      className={cn(STYLES.btn, STYLES.btnSecondary, STYLES.btnToolbar, 'inline-flex')}
                      title="Remove link"
                    >
                      <Trash2 className={STYLES.btnToolbarIcon} />
                      Remove
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
