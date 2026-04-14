'use client'

import { Search, Grid, List } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent as ReactKeyboardEvent } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { STYLES } from '@/lib/styles'
import { cn } from '@/lib/utils'
import { FormTemplateView } from '@/components/forms/FormTemplateView'
import { parseFormFields } from '@/lib/form-template-types'
import { FormTemplatePreviewAdminControls } from '@/components/admin/FormTemplatePreviewAdminControls'
import { deleteFormTemplate } from '@/app/actions/form-templates'

type SearchResultItem = {
  id: string
  title: string
  isActive?: boolean
  categoryLabel?: string
  description?: string | null
  descriptionHtml?: string | null
  formFields?: string | null
}

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
  searchResults?: SearchResultItem[]
  showSearchResults?: boolean
}

export function FormTemplateFilters({
  categories,
  currentCategory = 'ALL',
  currentStatus = 'ALL',
  currentView = 'cards',
  currentSort = 'title',
  currentSearch = '',
  mode = 'admin',
  preserveParams = {},
  searchResults = [],
  showSearchResults = false,
}: FormTemplateFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [searchValue, setSearchValue] = useState(currentSearch)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [previewTemplateId, setPreviewTemplateId] = useState<string | null>(null)

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

  const pushSearch = (value: string) => {
    const params = new URLSearchParams()
    const normalized = value.trim()

    Object.entries(preserveParams).forEach(([key, paramValue]) => {
      if (paramValue) params.set(key, paramValue)
    })
    if (currentView) params.set('view', currentView)
    if (currentSort) params.set('sort', currentSort)
    if (currentCategory !== 'ALL') params.set('category', currentCategory)
    if (currentStatus !== 'ALL') params.set('status', currentStatus)
    if (normalized) params.set('search', normalized)

    router.push(params.toString() ? `${pathname}?${params.toString()}` : pathname)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    pushSearch(searchValue)
  }

  const handleClearSearch = () => {
    setSearchValue('')
    setDropdownOpen(false)
    setActiveIndex(0)
    setPreviewTemplateId(null)
    pushSearch('')
    inputRef.current?.focus()
  }

  useEffect(() => {
    setSearchValue(currentSearch)
    const hasSearch = currentSearch.trim().length > 0
    setDropdownOpen(showSearchResults && hasSearch)
    setActiveIndex(0)
  }, [currentSearch, showSearchResults])

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current) return
      if (!containerRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [])

  const handleSearchKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (!dropdownOpen || searchResults.length === 0) {
      if (event.key === 'Escape') setDropdownOpen(false)
      return
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      setDropdownOpen(false)
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((prev) => Math.min(prev + 1, searchResults.length - 1))
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((prev) => Math.max(prev - 1, 0))
      return
    }

    if (event.key === 'Enter' && dropdownOpen && searchResults[activeIndex]) {
      event.preventDefault()
      setPreviewTemplateId(searchResults[activeIndex].id)
      setDropdownOpen(false)
    }
  }

  const normalizedSearch = searchValue.trim()
  const shouldShowDropdown = dropdownOpen && showSearchResults && normalizedSearch.length > 0
  const activeResult = useMemo(
    () => searchResults.find((item) => item.id === previewTemplateId) || null,
    [previewTemplateId, searchResults]
  )

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
      {/* Search */}
      <div ref={containerRef} className="relative flex-1 min-w-0">
        <form className="relative" onSubmit={handleSubmit}>
          {Object.entries(preserveParams).map(([key, value]) => (
            <input key={key} type="hidden" name={key} value={value} />
          ))}
          <input type="hidden" name="view" value={currentView} />
          <input type="hidden" name="sort" value={currentSort} />
          {currentCategory !== 'ALL' && <input type="hidden" name="category" value={currentCategory} />}
          {currentStatus !== 'ALL' && <input type="hidden" name="status" value={currentStatus} />}
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            name="search"
            value={searchValue}
            onFocus={() => setDropdownOpen(showSearchResults && normalizedSearch.length > 0)}
            onKeyDown={handleSearchKeyDown}
            onChange={(event) => {
              const next = event.target.value
              setSearchValue(next)
              const hasValue = next.trim().length > 0
              setDropdownOpen(showSearchResults && hasValue)
              setActiveIndex(0)
              if (!hasValue) {
                setPreviewTemplateId(null)
                pushSearch('')
              }
            }}
            placeholder="Search forms..."
            className={cn(STYLES.input, "pl-9 pr-16 h-10")}
          />
          {searchValue.trim().length > 0 && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setDropdownOpen((open) => !open)}
                className="px-2 py-1 text-[11px] text-gray-500 bg-gray-100 rounded hover:bg-gray-200"
              >
                {dropdownOpen ? 'Hide' : 'Show'}
              </button>
              <button
                type="button"
                onClick={handleClearSearch}
                className="px-2 py-1 text-[11px] text-gray-500 bg-gray-100 rounded hover:bg-gray-200"
              >
                Clear
              </button>
            </div>
          )}
        </form>

        {shouldShowDropdown && (
          <div className="absolute z-40 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
            {searchResults.length > 0 ? (
              <>
                <div className="px-3 py-2 text-xs font-medium text-gray-500 border-b border-gray-100">
                  {searchResults.length} match{searchResults.length === 1 ? '' : 'es'}
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {searchResults.map((result, index) => (
                    <button
                      key={result.id}
                      type="button"
                      onClick={() => {
                        setPreviewTemplateId(result.id)
                        setDropdownOpen(false)
                      }}
                      className={cn(
                        'w-full text-left px-3 py-2 border-b border-gray-100 last:border-b-0',
                        index === activeIndex ? 'bg-primary-50' : 'hover:bg-gray-50'
                      )}
                    >
                      <p className="text-sm font-medium text-gray-900 truncate">{result.title}</p>
                      {result.categoryLabel && (
                        <p className="text-xs text-gray-500 mt-0.5">{result.categoryLabel}</p>
                      )}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="px-3 py-3 text-sm text-gray-500">No matches</div>
            )}
          </div>
        )}
      </div>

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

      {previewTemplateId && (
        <SearchResultPreviewModal
          result={activeResult}
          onClose={() => setPreviewTemplateId(null)}
        />
      )}
    </div>
  )
}

function SearchResultPreviewModal({ result, onClose }: { result: SearchResultItem | null; onClose: () => void }) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  if (!result) return null

  const fields = parseFormFields(result.formFields ?? null)

  const handleDelete = async () => {
    setIsDeleting(true)
    setDeleteError(null)
    const response = await deleteFormTemplate(result.id)
    if (response.error) {
      setDeleteError(response.error)
      setIsDeleting(false)
      return
    }

    onClose()
    router.refresh()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{result.title}</h3>
            {result.categoryLabel && <p className="text-xs text-gray-500 mt-0.5">{result.categoryLabel}</p>}
          </div>
          <FormTemplatePreviewAdminControls
            templateId={result.id}
            isActive={result.isActive}
            onAccess={() => router.push(`/admin/forms/${result.id}/edit`)}
            onDelete={handleDelete}
            onClose={onClose}
          />
        </div>
        <div className="flex-1 overflow-auto p-4 bg-gray-50">
          {deleteError && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
              {deleteError}
            </p>
          )}
          {isDeleting && (
            <p className="text-xs text-gray-500 mb-3">Deleting form template...</p>
          )}
          <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
            <FormTemplateView
              title={result.title}
              description={result.description}
              descriptionHtml={result.descriptionHtml}
              fields={fields}
              preview={true}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
