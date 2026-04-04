'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Search, Filter, MessageSquare, Users, Paperclip, Loader2, X } from 'lucide-react'
import { searchMessages, SearchFilters } from '@/app/actions/message-search'
import { cn } from '@/lib/utils'
import { getStaffBasePathFromPathname } from '@/lib/role-routes'

type SearchResult = {
  id: string
  type: 'DIRECT' | 'GROUP'
  content: string
  createdAt: Date
  sender: {
    name: string | null
    preferredName: string | null
  }
  conversationName?: string
  groupName?: string
  hasAttachments: boolean
}

export default function MessageSearchPage() {
  const pathname = usePathname()
  const basePath = getStaffBasePathFromPathname(pathname)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [filters, setFilters] = useState<SearchFilters>({ type: 'ALL' })
  const [showFilters, setShowFilters] = useState(false)

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return

    setLoading(true)
    setSearched(true)
    const result = await searchMessages(query, filters)
    if (result.success && result.data) {
      setResults(result.data as SearchResult[])
    } else {
      setResults([])
    }
    setLoading(false)
  }, [query, filters])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim().length >= 2) {
        handleSearch()
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query, handleSearch])

  function formatDate(date: Date): string {
    const d = new Date(date)
    return d.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  function clearSearch() {
    setQuery('')
    setResults([])
    setSearched(false)
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0 overflow-auto">
        <Link href={`${basePath}/inbox`} className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 mb-3">
          <ArrowLeft className="w-4 h-4" /> Back to Inbox
        </Link>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search messages..."
            className="w-full pl-10 pr-10 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            autoFocus
          />
          {query && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border transition-colors",
              showFilters 
                ? "bg-primary-50 border-primary-300 text-primary-700" 
                : "bg-white border-gray-300 text-gray-600 hover:bg-gray-50"
            )}
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
          
          <div className="flex items-center gap-1 text-xs text-gray-500">
            {filters.type === 'ALL' && <span>All messages</span>}
            {filters.type === 'DIRECT' && <span>Direct only</span>}
            {filters.type === 'GROUP' && <span>Groups only</span>}
            {filters.hasAttachments && <span className="ml-2 px-2 py-0.5 bg-gray-100 rounded">With attachments</span>}
          </div>
        </div>

        {showFilters && (
          <div className="mt-3 p-3 bg-white border border-gray-200 rounded-lg space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Message type</label>
              <div className="flex gap-2">
                {(['ALL', 'DIRECT', 'GROUP'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setFilters(f => ({ ...f, type }))}
                    className={cn(
                      "px-3 py-1.5 text-sm rounded-lg border transition-colors",
                      filters.type === type
                        ? "bg-primary-600 text-white border-primary-600"
                        : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                    )}
                  >
                    {type === 'ALL' ? 'All' : type === 'DIRECT' ? 'Direct' : 'Groups'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={filters.hasAttachments || false}
                  onChange={(e) => setFilters(f => ({ ...f, hasAttachments: e.target.checked || undefined }))}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                Has attachments only
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="max-w-2xl mx-auto p-4 pt-0">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : searched && results.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-sm font-medium text-gray-900 mb-1">No messages found</h3>
            <p className="text-xs text-gray-500">Try different keywords or adjust your filters</p>
          </div>
        ) : results.length > 0 ? (
          <div className="space-y-2">
            {results.map((result) => (
              <div
                key={`${result.type}-${result.id}`}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                    result.type === 'DIRECT' ? "bg-primary-100 text-primary-600" : "bg-blue-100 text-blue-600"
                  )}>
                    {result.type === 'DIRECT' ? (
                      <MessageSquare className="w-4 h-4" />
                    ) : (
                      <Users className="w-4 h-4" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                      <span>{result.type === 'DIRECT' ? result.conversationName : result.groupName}</span>
                      <span className="text-gray-300">•</span>
                      <span>{formatDate(result.createdAt)}</span>
                      {result.hasAttachments && (
                        <>
                          <span className="text-gray-300">•</span>
                          <span className="flex items-center gap-1">
                            <Paperclip className="w-3 h-3" />
                            Attachment
                          </span>
                        </>
                      )}
                    </div>
                    
                    <p 
                      className="text-sm text-gray-900"
                      dangerouslySetInnerHTML={{ __html: result.content }}
                    />
                    
                    <p className="text-xs text-gray-500 mt-1">
                      From: {result.sender.preferredName || result.sender.name || 'Unknown'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : query.length < 2 ? (
          <div className="text-center py-12">
            <p className="text-xs text-gray-500">Enter at least 2 characters to search</p>
          </div>
        ) : null}
      </div>
    </div>
  )
}
