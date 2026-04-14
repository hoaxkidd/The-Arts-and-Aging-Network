'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { adminContextualRoutes, adminNavGroups } from '@/lib/menu'
import { cn } from '@/lib/utils'

type RouteEntry = {
  label: string
  href: string
  group: string
  kind: 'Primary' | 'Contextual'
}

function normalizeForMatch(value: string): string {
  return value.toLowerCase().trim()
}

function resolveNavigableHref(href: string): string {
  const dynamicIndex = href.indexOf('/[')
  if (dynamicIndex === -1) return href
  const fallback = href.slice(0, dynamicIndex)
  return fallback || '/admin'
}

export function AdminToolsIndexPanel() {
  const [query, setQuery] = useState('')

  const entries = useMemo<RouteEntry[]>(() => {
    const primary = adminNavGroups.flatMap((group) =>
      group.children.map((child) => ({
        label: child.label,
        href: child.href,
        group: group.label,
        kind: 'Primary' as const,
      }))
    )
    const contextual = adminContextualRoutes.map((route) => ({
      label: route.label,
      href: route.href,
      group: 'Contextual Routes',
      kind: 'Contextual' as const,
    }))
    return [...primary, ...contextual]
  }, [])

  const filteredEntries = useMemo(() => {
    const normalized = normalizeForMatch(query)
    if (!normalized) return entries

    return entries.filter((entry) => {
      const haystack = `${entry.label} ${entry.href} ${entry.group} ${entry.kind}`
      return normalizeForMatch(haystack).includes(normalized)
    })
  }, [entries, query])

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-gray-900">Admin Tools Index</h2>
        <p className="mt-1 text-xs text-gray-600">
          Search every admin route, including contextual create/edit/detail pages, from one directory.
        </p>
      </div>

      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className={cn('w-full rounded-md border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900', 'focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400/40')}
          placeholder="Search routes, pages, or route groups"
        />
      </label>

      <div className="mt-4 max-h-[380px] overflow-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-3 py-2 text-left">Tool</th>
              <th className="px-3 py-2 text-left">Group</th>
              <th className="px-3 py-2 text-left">Route</th>
              <th className="px-3 py-2 text-left">Type</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {filteredEntries.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-sm text-gray-500">
                  No admin tools match your search.
                </td>
              </tr>
            ) : (
              filteredEntries.map((entry) => (
                <tr key={`${entry.kind}:${entry.href}:${entry.label}`}>
                  <td className="px-3 py-2.5 font-medium text-gray-900">{entry.label}</td>
                  <td className="px-3 py-2.5 text-gray-600">{entry.group}</td>
                  <td className="px-3 py-2.5">
                    <Link href={resolveNavigableHref(entry.href)} className="text-primary-700 hover:underline">
                      <code>{entry.href}</code>
                    </Link>
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={cn(
                        'inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold',
                        entry.kind === 'Primary'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-amber-100 text-amber-800'
                      )}
                    >
                      {entry.kind}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
