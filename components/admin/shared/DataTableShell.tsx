import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type DataTableShellProps = {
  /** Optional toolbar row inside the card (e.g. search), below any external filters. */
  toolbar?: ReactNode
  /** Table element (or fragment wrapping `table`). */
  children: ReactNode
  className?: string
}

/**
 * Card + scroll wrapper for admin data tables (Financials / TABLE_STANDARDS).
 */
export function DataTableShell({ toolbar, children, className }: DataTableShellProps) {
  return (
    <div className={cn('bg-white rounded-lg border border-gray-200 overflow-hidden', className)}>
      {toolbar ? (
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50/50">
          {toolbar}
        </div>
      ) : null}
      <div className="table-scroll-wrapper max-h-[calc(100vh-320px)]">{children}</div>
    </div>
  )
}
