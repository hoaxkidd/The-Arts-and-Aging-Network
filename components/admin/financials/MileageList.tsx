'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ArrowRight, Search, List, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { STYLES } from '@/lib/styles'
import { cn } from '@/lib/utils'
import { MileageApprovalActions } from '@/app/admin/mileage/MileageApprovalActions'
import { MileageStats } from './MileageStats'
import { LinedStatusTabs } from '@/components/ui/LinedStatusTabs'
import { DataTableShell } from '@/components/admin/shared/DataTableShell'

type MileageEntry = {
  id: string
  date: Date
  kilometers: number
  startLocation: string
  endLocation: string
  purpose: string | null
  fundingClass: string | null
  status: string
  user: {
    id: string
    name: string | null
    preferredName: string | null
    image: string | null
  }
}

export function MileageList({ entries }: { entries: MileageEntry[] }) {
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING')
  const [search, setSearch] = useState('')

  const filtered = entries.filter((e) => {
    const matchesStatus = filter === 'ALL' || e.status === filter
    const matchesSearch =
      !search ||
      e.user.name?.toLowerCase().includes(search.toLowerCase()) ||
      e.purpose?.toLowerCase().includes(search.toLowerCase())
    return matchesStatus && matchesSearch
  })

  const counts = {
    ALL: entries.length,
    PENDING: entries.filter((e) => e.status === 'PENDING').length,
    APPROVED: entries.filter((e) => e.status === 'APPROVED').length,
    REJECTED: entries.filter((e) => e.status === 'REJECTED').length,
  }

  const statusTabs = [
    { id: 'ALL' as const, label: 'All', icon: List, count: counts.ALL },
    { id: 'PENDING' as const, label: 'Pending', icon: AlertCircle, count: counts.PENDING },
    { id: 'APPROVED' as const, label: 'Approved', icon: CheckCircle, count: counts.APPROVED },
    { id: 'REJECTED' as const, label: 'Rejected', icon: XCircle, count: counts.REJECTED },
  ]

  return (
    <div className="space-y-4">
      <MileageStats entries={entries} />

      <div className="flex flex-col gap-3 border-b border-gray-200 pb-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <LinedStatusTabs
          aria-label="Mileage entry status"
          tabs={statusTabs}
          activeId={filter}
          onChange={setFilter}
          className="min-w-0 flex-1 border-b-0 pb-0"
        />
        <div className="relative w-full shrink-0 sm:max-w-xs sm:pb-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            placeholder="Search staff or purpose…"
            className={cn(STYLES.input, 'h-9 py-1.5 pl-8 text-sm')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search mileage entries"
          />
        </div>
      </div>

      <DataTableShell>
        <table className={STYLES.table}>
          <thead className="bg-gray-50">
            <tr className={STYLES.tableHeadRow}>
              <th className={STYLES.tableHeader}>Staff Member</th>
              <th className={STYLES.tableHeader}>Date</th>
              <th className={STYLES.tableHeader}>Route</th>
              <th className={STYLES.tableHeader}>Distance</th>
              <th className={STYLES.tableHeader}>Status</th>
              <th className={cn(STYLES.tableHeader, 'text-right')}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((entry) => {
              const displayName = entry.user.preferredName || entry.user.name || 'Unknown'

              return (
                <tr key={entry.id} className={STYLES.tableRow}>
                  <td className={cn(STYLES.tableCell, 'whitespace-nowrap')}>
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-xs mr-3">
                        {entry.user.image ? (
                          <Image
                            src={entry.user.image}
                            alt=""
                            width={32}
                            height={32}
                            className="h-8 w-8 rounded-full object-cover"
                            unoptimized
                          />
                        ) : (
                          displayName.charAt(0)
                        )}
                      </div>
                      <div className="text-sm font-medium text-gray-900">{displayName}</div>
                    </div>
                  </td>
                  <td className={cn(STYLES.tableCell, 'whitespace-nowrap')}>
                    {new Date(entry.date).toLocaleDateString()}
                  </td>
                  <td className={STYLES.tableCell}>
                    <div className="flex items-center gap-2 text-sm text-gray-900">
                      <span className="truncate max-w-[100px]" title={entry.startLocation}>
                        {entry.startLocation}
                      </span>
                      <ArrowRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                      <span className="truncate max-w-[100px]" title={entry.endLocation}>
                        {entry.endLocation}
                      </span>
                    </div>
                    {entry.purpose && (
                      <div className="text-xs text-gray-500 mt-1 truncate max-w-[200px]">{entry.purpose}</div>
                    )}
                  </td>
                  <td className={cn(STYLES.tableCell, 'whitespace-nowrap')}>
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm font-bold text-gray-900">{entry.kilometers}</span>
                      <span className="text-xs text-gray-500">km</span>
                    </div>
                    {entry.fundingClass && (
                      <span className="inline-block mt-1 px-1.5 py-0.5 bg-gray-100 text-gray-600 text-[10px] rounded">
                        {entry.fundingClass}
                      </span>
                    )}
                  </td>
                  <td className={cn(STYLES.tableCell, 'whitespace-nowrap')}>
                    <span
                      className={cn(
                        'px-2 py-0.5 text-xs font-semibold rounded',
                        entry.status === 'APPROVED'
                          ? 'bg-green-100 text-green-700'
                          : entry.status === 'REJECTED'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                      )}
                    >
                      {entry.status}
                    </span>
                  </td>
                  <td className={cn(STYLES.tableCell, 'text-right whitespace-nowrap')}>
                    {entry.status === 'PENDING' && (
                      <div className="flex justify-end">
                        <MileageApprovalActions entryId={entry.id} />
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className={cn(STYLES.tableCell, 'text-center py-12')}>
                  No entries found matching your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </DataTableShell>
    </div>
  )
}
