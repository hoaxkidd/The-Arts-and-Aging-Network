'use client'

/**
 * StickyTable - Canonical Reusable Table Component
 * 
 * This component implements the TABLE STANDARDS defined in lib/styles.ts.
 * Use this component as the primary way to create tables throughout the app.
 * 
 * @example
 * ```tsx
 * <StickyTable headers={['Name', 'Status', 'Actions']}>
 *   {items.map(item => (
 *     <TableRow key={item.id}>
 *       <td className={STYLES.tableCell}>{item.name}</td>
 *       <td className={STYLES.tableCell}><StatusBadge status={item.status} /></td>
 *       <td className={cn(STYLES.tableCell, "text-right")}>
 *         <ActionMenu itemId={item.id} />
 *       </td>
 *     </TableRow>
 *   ))}
 * </StickyTable>
 * ```
 * 
 * For pages requiring custom headers (with sort buttons, etc.),
 * use the manual table structure from the EventListTable template:
 * - Card wrapper: bg-white rounded-lg border border-gray-200 overflow-hidden
 * - Table wrapper: table-scroll-wrapper max-h-[calc(100vh-320px)]
 * - Table: STYLES.table
 * - Header row: bg-gray-50 with STYLES.tableHeader cells
 * - Body: divide-y divide-gray-100
 * - Rows: STYLES.tableRow
 * - Cells: STYLES.tableCell
 */

import { STYLES } from "@/lib/styles"
import { cn } from "@/lib/utils"

type StickyTableProps = {
  headers: string[]
  children: React.ReactNode
  className?: string
  maxHeight?: string
}

export function StickyTable({ 
  headers, 
  children, 
  className,
  maxHeight = "max-h-[calc(100vh-320px)]"
}: StickyTableProps) {
  return (
    <div className={cn("bg-white rounded-lg border border-gray-200 overflow-hidden", className)}>
      <div className={cn("table-scroll-wrapper", maxHeight)}>
        <table className={STYLES.table}>
          <thead className="bg-gray-50">
            <tr>
              {headers.map((header) => (
                <th key={header} className={STYLES.tableHeader}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {children}
          </tbody>
        </table>
      </div>
    </div>
  )
}

type TableRowProps = {
  children: React.ReactNode
  className?: string
}

export function TableRow({ children, className }: TableRowProps) {
  return (
    <tr className={cn(STYLES.tableRow, className)}>
      {children}
    </tr>
  )
}

type TableCellProps = {
  children: React.ReactNode
  className?: string
}

export function TableCell({ children, className }: TableCellProps) {
  return (
    <td className={cn(STYLES.tableCell, className)}>
      {children}
    </td>
  )
}

type StickyTableHeadProps = {
  children: React.ReactNode
  className?: string
}

export function StickyTableHead({ children, className }: StickyTableHeadProps) {
  return (
    <div className={cn("table-scroll-wrapper", className)}>
      <table className={STYLES.table}>
        <thead className="bg-gray-50">
          {children}
        </thead>
      </table>
    </div>
  )
}

type StickyTableBodyProps = {
  children: React.ReactNode
  className?: string
}

export function StickyTableBody({ children, className }: StickyTableBodyProps) {
  return (
    <tbody className={className}>
      {children}
    </tbody>
  )
}
