'use client'

import { Search, Grid, List, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'
import { STYLES } from '@/lib/styles'
import { cn } from '@/lib/utils'

type Category = {
  value: string
  label: string
  color: string
}

type FormTemplateFiltersProps = {
  categories: Category[]
  currentCategory?: string
  currentStatus?: string
  currentView?: string
  currentSort?: string
  currentSearch?: string
  mode?: 'admin' | 'staff'
  preserveParams?: Record<string, string>
}

export function FormTemplateFilters({
  categories,
  currentCategory = 'ALL',
  currentStatus = 'ALL',
  currentView = 'cards',
  currentSort = 'title',
  currentSearch = '',
  mode = 'admin',
  preserveParams = {}
}: FormTemplateFiltersProps) {
  const getLink = (updates: Record<string, string>) => {
    const params = new URLSearchParams()
    Object.entries(preserveParams).forEach(([key, value]) => {
      if (value) params.set(key, value)
    })
    if (updates.view) params.set('view', updates.view)
    if (updates.sort) params.set('sort', updates.sort)
    if (updates.category && updates.category !== 'ALL') params.set('category', updates.category)
    if (updates.status && updates.status !== 'ALL') params.set('status', updates.status)
    if (updates.search && updates.search !== '') params.set('search', updates.search)
    return `?${params.toString()}`
  }

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
      {/* Search */}
      <form className="relative flex-1 min-w-0">
        {Object.entries(preserveParams).map(([key, value]) => (
          <input key={key} type="hidden" name={key} value={value} />
        ))}
        <input type="hidden" name="view" value={currentView} />
        <input type="hidden" name="sort" value={currentSort} />
        {currentCategory !== 'ALL' && <input type="hidden" name="category" value={currentCategory} />}
        {currentStatus !== 'ALL' && <input type="hidden" name="status" value={currentStatus} />}
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          name="search"
          defaultValue={currentSearch}
          placeholder="Search forms..."
          className={cn(STYLES.input, "pl-9 h-10")}
        />
      </form>

      {/* Filters */}
      <div className="flex items-center gap-2">
        {/* Sort Dropdown */}
        <select
          value={currentSort}
          onChange={(e) => window.location.href = getLink({ sort: e.target.value })}
          className={cn(STYLES.input, STYLES.select, "h-10")}
        >
          <option value="title">Title A-Z</option>
          {mode === 'admin' && <option value="date_desc">Newest</option>}
          {mode === 'admin' && <option value="date_asc">Oldest</option>}
          <option value="category">Category</option>
          {mode === 'admin' && <option value="role">Role</option>}
        </select>

        {/* Category Dropdown */}
        <select
          value={currentCategory}
          onChange={(e) => window.location.href = getLink({ category: e.target.value })}
          className={cn(STYLES.input, STYLES.select, "h-10")}
        >
          <option value="ALL">All Categories</option>
          {categories.map(cat => (
            <option key={cat.value} value={cat.value}>{cat.label}</option>
          ))}
        </select>

        {/* Status Dropdown */}
        <select
          value={currentStatus}
          onChange={(e) => window.location.href = getLink({ status: e.target.value })}
          className={cn(STYLES.input, STYLES.select, "h-10")}
        >
          {mode === 'staff' ? (
            <>
              <option value="active">Active</option>
              <option value="all">All Forms</option>
            </>
          ) : (
            <>
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="ARCHIVED">Archived</option>
            </>
          )}
        </select>

        {/* View Toggle */}
        <div className="flex items-center bg-gray-100 rounded-lg p-1 h-10">
          <Link
            href={getLink({ view: 'cards' })}
            className={`p-1.5 rounded-md transition-colors ${
              currentView === 'cards' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-500 hover:text-gray-700'
            }`}
            title="Card view"
          >
            <Grid className="w-4 h-4" />
          </Link>
          <Link
            href={getLink({ view: 'table' })}
            className={`p-1.5 rounded-md transition-colors ${
              currentView === 'table' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-500 hover:text-gray-700'
            }`}
            title="Table view"
          >
            <List className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
