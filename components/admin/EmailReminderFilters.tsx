'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { LinedStatusTabs, type LinedStatusTab } from '@/components/ui/LinedStatusTabs'
import { STYLES } from '@/lib/styles'
import { cn } from '@/lib/utils'

type EmailReminderFiltersProps = {
  currentStatus?: string
  currentType?: string
  compact?: boolean
}

type StatusTabId = 'ALL' | 'PENDING' | 'SENT' | 'FAILED' | 'CANCELLED'

const STATUS_TABS: LinedStatusTab<StatusTabId>[] = [
  { id: 'ALL', label: 'All' },
  { id: 'PENDING', label: 'Pending' },
  { id: 'SENT', label: 'Sent' },
  { id: 'FAILED', label: 'Failed' },
  { id: 'CANCELLED', label: 'Cancelled' },
]

export function EmailReminderFilters({
  currentStatus = 'ALL',
  currentType = 'ALL',
  compact = false,
}: EmailReminderFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleStatusChange = (value: StatusTabId) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('status', value)
    router.push(`?${params.toString()}`)
  }

  const handleTypeChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('type', value)
    router.push(`?${params.toString()}`)
  }

  const statusId: StatusTabId = STATUS_TABS.some((t) => t.id === currentStatus)
    ? (currentStatus as StatusTabId)
    : 'ALL'

  if (compact) {
    return (
      <div className="flex flex-wrap md:flex-nowrap items-center gap-2">
        <label htmlFor="email-reminder-status" className="sr-only">Status</label>
        <select
          id="email-reminder-status"
          value={statusId}
          onChange={(e) => handleStatusChange(e.target.value as StatusTabId)}
          className={cn(
            STYLES.input,
            STYLES.select,
            'h-9 w-[160px] min-w-[160px] rounded-md border border-gray-300 py-0 pr-10 text-sm leading-normal'
          )}
        >
          {STATUS_TABS.map((tab) => (
            <option key={tab.id} value={tab.id}>{tab.label}</option>
          ))}
        </select>

        <label htmlFor="email-reminder-type" className="sr-only">Recipient type</label>
        <select
          id="email-reminder-type"
          value={currentType}
          onChange={(e) => handleTypeChange(e.target.value)}
          className={cn(
            STYLES.input,
            STYLES.select,
            'h-9 w-[200px] min-w-[200px] rounded-md border border-gray-300 py-0 pr-10 text-sm leading-normal'
          )}
        >
          <option value="ALL">All recipients</option>
          <option value="HOME_ADMIN">Program Coordinators</option>
          <option value="STAFF">Staff</option>
        </select>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden min-w-0">
      <div className="px-4 pt-3">
        <LinedStatusTabs
          tabs={STATUS_TABS}
          activeId={statusId}
          onChange={handleStatusChange}
          aria-label="Filter reminders by status"
        />
      </div>
      <div className="px-4 py-3 border-t border-gray-100 flex flex-wrap items-center gap-2">
        <label htmlFor="email-reminder-type" className="text-sm font-medium text-gray-700 shrink-0">
          Recipient type
        </label>
        <select
          id="email-reminder-type"
          value={currentType}
          onChange={(e) => handleTypeChange(e.target.value)}
          className={cn(STYLES.select, 'text-sm max-w-xs')}
        >
          <option value="ALL">All</option>
          <option value="HOME_ADMIN">Program Coordinators</option>
          <option value="STAFF">Staff</option>
        </select>
      </div>
    </div>
  )
}
