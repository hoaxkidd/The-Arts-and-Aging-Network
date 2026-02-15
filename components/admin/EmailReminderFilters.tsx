'use client'

import { useRouter, useSearchParams } from 'next/navigation'

type EmailReminderFiltersProps = {
  currentStatus?: string
  currentType?: string
}

export function EmailReminderFilters({
  currentStatus = 'ALL',
  currentType = 'ALL'
}: EmailReminderFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleStatusChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('status', value)
    router.push(`?${params.toString()}`)
  }

  const handleTypeChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('type', value)
    router.push(`?${params.toString()}`)
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-gray-700">Status:</label>
        <select
          value={currentStatus}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="text-xs border border-gray-200 rounded px-2 py-1"
        >
          <option value="ALL">All</option>
          <option value="PENDING">Pending</option>
          <option value="SENT">Sent</option>
          <option value="FAILED">Failed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-gray-700">Type:</label>
        <select
          value={currentType}
          onChange={(e) => handleTypeChange(e.target.value)}
          className="text-xs border border-gray-200 rounded px-2 py-1"
        >
          <option value="ALL">All</option>
          <option value="HOME_ADMIN">Home Admins</option>
          <option value="STAFF">Staff</option>
        </select>
      </div>
    </div>
  )
}
