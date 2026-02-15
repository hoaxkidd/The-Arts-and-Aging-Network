'use client'

import { useRouter, useSearchParams } from 'next/navigation'

type Category = {
  value: string
  label: string
  color: string
}

type FormTemplateFiltersProps = {
  categories: Category[]
  currentCategory?: string
  currentStatus?: string
}

export function FormTemplateFilters({
  categories,
  currentCategory = 'ALL',
  currentStatus = 'ALL'
}: FormTemplateFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleCategoryChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('category', value)
    router.push(`?${params.toString()}`)
  }

  const handleStatusChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('status', value)
    router.push(`?${params.toString()}`)
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-gray-700">Category:</label>
        <select
          value={currentCategory}
          onChange={(e) => handleCategoryChange(e.target.value)}
          className="text-xs border border-gray-200 rounded px-2 py-1"
        >
          <option value="ALL">All Categories</option>
          {categories.map(cat => (
            <option key={cat.value} value={cat.value}>{cat.label}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-gray-700">Status:</label>
        <select
          value={currentStatus}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="text-xs border border-gray-200 rounded px-2 py-1"
        >
          <option value="ALL">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </div>
    </div>
  )
}
