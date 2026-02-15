'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Filter } from 'lucide-react'
import { STYLES } from "@/lib/styles"
import { cn } from "@/lib/utils"

export function RequestFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams)
    if (value === 'ALL') {
      params.delete(key)
    } else {
      params.set(key, value)
    }
    router.replace(`?${params.toString()}`)
  }

  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-6 p-4 bg-white rounded-lg border border-gray-100 shadow-sm">
      <div className="flex items-center gap-2 text-gray-500 min-w-fit">
        <Filter className="w-4 h-4" />
        <span className="text-sm font-medium">Filter By:</span>
      </div>
      
      <div className="grid grid-cols-2 gap-4 flex-1">
        <select 
          className={cn(STYLES.input, STYLES.select, "py-1.5 text-sm")}
          onChange={(e) => handleFilterChange('category', e.target.value)}
          defaultValue={searchParams.get('category') || 'ALL'}
        >
          <option value="ALL">All Categories</option>
          <option value="EXPENSE">Expense</option>
          <option value="SICK_DAY">Sick Day</option>
          <option value="OFF_DAY">Time Off</option>
        </select>

        <select 
          className={cn(STYLES.input, STYLES.select, "py-1.5 text-sm")}
          onChange={(e) => handleFilterChange('status', e.target.value)}
          defaultValue={searchParams.get('status') || 'ALL'}
        >
          <option value="ALL">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>
    </div>
  )
}
