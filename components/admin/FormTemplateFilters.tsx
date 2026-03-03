'use client'

import { Search, Grid, List, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'

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
}

export function FormTemplateFilters({
  categories,
  currentCategory = 'ALL',
  currentStatus = 'ALL',
  currentView = 'cards',
  currentSort = 'title',
  currentSearch = '',
  mode = 'admin'
}: FormTemplateFiltersProps) {
  const getLink = (updates: Record<string, string>) => {
    const params = new URLSearchParams()
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
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          name="search"
          defaultValue={currentSearch}
          placeholder="Search forms..."
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500 bg-white"
        />
      </form>

      {/* Filters */}
      <div className="flex items-center gap-2">
        {/* Sort Dropdown */}
        <select
          value={currentSort}
          onChange={(e) => window.location.href = getLink({ sort: e.target.value })}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:ring-1 focus:ring-primary-500"
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
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:ring-1 focus:ring-primary-500"
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
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:ring-1 focus:ring-primary-500"
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
        <div className="flex items-center bg-gray-100 rounded-lg p-1">
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
