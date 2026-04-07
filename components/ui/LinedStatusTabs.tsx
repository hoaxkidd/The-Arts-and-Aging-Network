'use client'

import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

export type LinedStatusTab<T extends string = string> = {
  id: T
  label: string
  icon?: LucideIcon
  count?: number
}

type LinedStatusTabsProps<T extends string> = {
  tabs: LinedStatusTab<T>[]
  activeId: T
  onChange: (id: T) => void
  /** Accessible label for the tablist */
  'aria-label'?: string
}

/**
 * Lined tab strip (Financials timesheets reference): bottom border on container,
 * active tab uses border-b-2 border-primary-500.
 */
export function LinedStatusTabs<T extends string>({
  tabs,
  activeId,
  onChange,
  'aria-label': ariaLabel = 'Filter by status',
}: LinedStatusTabsProps<T>) {
  return (
    <div
      className="flex gap-2 border-b border-gray-200 pb-1 overflow-x-auto"
      role="tablist"
      aria-label={ariaLabel}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon
        const selected = activeId === tab.id
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            id={`lined-tab-${tab.id}`}
            onClick={() => onChange(tab.id)}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2 shrink-0',
              selected
                ? 'border-primary-500 text-primary-700 bg-primary-50/50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            )}
          >
            <div className="flex items-center gap-2">
              {Icon && <Icon className="w-4 h-4" aria-hidden />}
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span
                  className={cn(
                    'px-1.5 py-0.5 rounded-full text-xs',
                    selected ? 'bg-white text-primary-700 shadow-sm' : 'bg-gray-200 text-gray-600'
                  )}
                >
                  {tab.count}
                </span>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}
