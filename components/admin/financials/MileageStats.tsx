'use client'

import { Car, AlertCircle, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

type MileageStatsProps = {
  entries: { status: string; kilometers: number; date: Date }[]
}

export function MileageStats({ entries }: MileageStatsProps) {
  const pendingCount = entries.filter((e) => e.status === 'PENDING').length
  const approvedCount = entries.filter((e) => e.status === 'APPROVED').length
  const totalKm = entries.reduce((sum, e) => sum + e.kilometers, 0)

  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  const monthLabel = new Date(y, m, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

  const thisMonthKm = entries
    .filter((e) => {
      const d = new Date(e.date)
      return d.getFullYear() === y && d.getMonth() === m
    })
    .reduce((sum, e) => sum + e.kilometers, 0)

  const statClass =
    'rounded-md border border-gray-200 bg-white px-3 py-2 min-w-[11rem] max-w-full flex-1 basis-full sm:basis-[calc(50%-0.375rem)] lg:basis-[calc(25%-0.75rem)]'

  return (
    <div className="flex w-full flex-wrap gap-2 sm:gap-3">
      <div className={cn(statClass, 'flex items-center justify-between gap-2')}>
        <span className="text-[11px] font-medium uppercase tracking-wide text-gray-500 truncate shrink min-w-0">
          Total distance
        </span>
        <div className="flex min-w-0 items-center gap-2 text-right">
          <span className="text-lg font-semibold tabular-nums text-gray-900">
            {totalKm.toFixed(1)}
            <span className="ml-0.5 text-xs font-normal text-gray-500">km</span>
          </span>
          <span className="inline-flex items-center gap-0.5 text-[11px] text-gray-400">
            <Car className="h-3 w-3 shrink-0" aria-hidden />
            All time
          </span>
        </div>
      </div>

      <div className={cn(statClass, 'flex items-center justify-between gap-2')}>
        <span className="min-w-0 truncate text-[11px] font-medium uppercase tracking-wide text-gray-500" title={monthLabel}>
          {monthLabel}
        </span>
        <span className="shrink-0 text-lg font-semibold tabular-nums text-gray-900">
          {thisMonthKm.toFixed(1)}
          <span className="ml-0.5 text-xs font-normal text-gray-500">km</span>
        </span>
      </div>

      <div className={cn(statClass, 'flex items-center justify-between gap-2')}>
        <span className="text-[11px] font-medium uppercase tracking-wide text-gray-500 truncate">Pending</span>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-lg font-semibold tabular-nums text-amber-700">{pendingCount}</span>
          <span className="flex items-center gap-0.5 text-[11px] text-amber-600/90">
            <AlertCircle className="h-3 w-3 shrink-0" aria-hidden />
            Review
          </span>
        </div>
      </div>

      <div className={cn(statClass, 'flex items-center justify-between gap-2')}>
        <span className="text-[11px] font-medium uppercase tracking-wide text-gray-500 truncate">Approved</span>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-lg font-semibold tabular-nums text-emerald-700">{approvedCount}</span>
          <span className="flex items-center gap-0.5 text-[11px] text-emerald-600/90">
            <CheckCircle className="h-3 w-3 shrink-0" aria-hidden />
            Done
          </span>
        </div>
      </div>
    </div>
  )
}
