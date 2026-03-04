'use client'

import { STYLES } from "@/lib/styles"
import { cn } from "@/lib/utils"

type StickyTableProps = {
  headers: string[]
  children: React.ReactNode
  className?: string
}

export function StickyTable({ headers, children, className }: StickyTableProps) {
  return (
    <div className={cn("overflow-x-auto", className)}>
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
        <tbody>
          {children}
        </tbody>
      </table>
    </div>
  )
}

type StickyTableHeadProps = {
  children: React.ReactNode
  className?: string
}

export function StickyTableHead({ children, className }: StickyTableHeadProps) {
  return (
    <div className={cn("overflow-x-auto", className)}>
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
