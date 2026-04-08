'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FileText, Trash2 } from 'lucide-react'
import { attachFormToGroup, removeFormFromGroup } from '@/app/actions/messaging'
import { STYLES } from '@/lib/styles'
import { cn } from '@/lib/utils'

export type GroupFormAttachmentRow = {
  formTemplateId: string
  formTemplate: {
    id: string
    title: string
    category: string
    isActive: boolean
  }
}

export type FormTemplateOption = {
  id: string
  title: string
  category: string
}

type Props = {
  groupId: string
  attachments: GroupFormAttachmentRow[]
  templateOptions: FormTemplateOption[]
}

export function GroupFormAttachmentsPanel({ groupId, attachments, templateOptions }: Props) {
  const router = useRouter()
  const [selectedId, setSelectedId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const attachedIds = new Set(attachments.map((a) => a.formTemplateId))
  const selectable = templateOptions.filter((t) => !attachedIds.has(t.id))

  async function attach() {
    if (!selectedId) return
    setError(null)
    setBusy(true)
    const result = await attachFormToGroup({ groupId, formTemplateId: selectedId })
    setBusy(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setSelectedId('')
    router.refresh()
  }

  async function remove(formTemplateId: string) {
    if (!confirm('Remove this form from the group?')) return
    setError(null)
    setBusy(true)
    const result = await removeFormFromGroup(groupId, formTemplateId)
    setBusy(false)
    if (result.error) {
      setError(result.error)
      return
    }
    router.refresh()
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className={STYLES.cardHeader}>
        <div className={STYLES.cardTitle}>
          <FileText className="w-4 h-4 text-gray-500 shrink-0" />
          Linked forms
        </div>
      </div>

      <div className="px-4 pb-3 sm:px-5 flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-3">
        <div className="flex-1 min-w-[12rem] max-w-md">
          <label className="text-xs font-medium text-gray-600">Attach form</label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            disabled={busy || selectable.length === 0}
            className={cn(STYLES.input, STYLES.select, 'mt-1')}
          >
            <option value="">
              {selectable.length === 0 ? 'All active forms are linked' : 'Select a form…'}
            </option>
            {selectable.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title} ({t.category})
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

      {error && (
        <p className="text-sm text-red-600 px-4 sm:px-5 pb-2" role="alert">
          {error}
        </p>
      )}

      <div className="overflow-x-auto border-t border-gray-100">
        <table className={STYLES.table}>
          <thead className="bg-gray-50">
            <tr className={STYLES.tableHeadRow}>
              <th className={STYLES.tableHeader}>Form</th>
              <th className={cn(STYLES.tableHeader, 'whitespace-nowrap')}>Category</th>
              <th className={cn(STYLES.tableHeader, 'whitespace-nowrap')}>Status</th>
              <th className={cn(STYLES.tableHeader, 'text-right w-[100px]')}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {attachments.length === 0 ? (
              <tr>
                <td colSpan={4} className={cn(STYLES.tableCell, 'text-center py-8 text-gray-500')}>
                  No forms linked yet.
                </td>
              </tr>
            ) : (
              attachments.map((row) => (
                <tr key={row.formTemplateId} className={STYLES.tableRow}>
                  <td className={STYLES.tableCell}>
                    <Link
                      href={`/admin/form-templates/${row.formTemplate.id}/edit`}
                      className="font-medium text-primary-700 hover:underline"
                    >
                      {row.formTemplate.title}
                    </Link>
                  </td>
                  <td className={STYLES.tableCell}>{row.formTemplate.category}</td>
                  <td className={STYLES.tableCell}>
                    {row.formTemplate.isActive ? (
                      <span className={cn(STYLES.badge, STYLES.badgeSuccess)}>Active</span>
                    ) : (
                      <span className={cn(STYLES.badge, STYLES.badgeNeutral)}>Inactive</span>
                    )}
                  </td>
                  <td className={cn(STYLES.tableCell, 'text-right')}>
                    <button
                      type="button"
                      onClick={() => void remove(row.formTemplateId)}
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
