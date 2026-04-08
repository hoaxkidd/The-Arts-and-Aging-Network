'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import type { AdminNavChild, AdminNavGroup } from '@/lib/menu'
import {
  adminNavGroups,
  adminNavHrefIsActive,
  getAdminNavGroupIdForPath,
} from '@/lib/menu'
import { cn } from '@/lib/utils'
import { ChevronDown, ChevronRight, Search, X } from 'lucide-react'

type AdminSidebarGroupedNavProps = {
  pathname: string
  /** Called when a nav link is activated (e.g. close mobile drawer). */
  onNavigate?: () => void
}

function matchesNavSearch(query: string, child: AdminNavChild, groupLabel: string): boolean {
  if (!query) return true
  if (groupLabel.toLowerCase().includes(query)) return true
  const l = child.label.toLowerCase()
  const h = child.href.toLowerCase()
  const parts = child.href.split('/').filter(Boolean)
  const last = parts[parts.length - 1] ?? ''
  return l.includes(query) || h.includes(query) || last.toLowerCase().includes(query)
}

type VisibleGroup = {
  group: AdminNavGroup
  children: AdminNavChild[]
}

function buildVisibleGroups(searchQuery: string): VisibleGroup[] {
  const q = searchQuery.trim().toLowerCase()
  if (!q) {
    return adminNavGroups.map((g) => ({ group: g, children: g.children }))
  }
  const out: VisibleGroup[] = []
  for (const g of adminNavGroups) {
    const groupLabelMatch = g.label.toLowerCase().includes(q)
    if (g.children.length === 1) {
      const c = g.children[0]
      if (groupLabelMatch || matchesNavSearch(q, c, g.label)) {
        out.push({ group: g, children: [c] })
      }
      continue
    }
    const children = groupLabelMatch
      ? g.children
      : g.children.filter((c) => matchesNavSearch(q, c, g.label))
    if (children.length > 0) {
      out.push({ group: g, children })
    }
  }
  return out
}

export function AdminSidebarGroupedNav({ pathname, onNavigate }: AdminSidebarGroupedNavProps) {
  const pathOnly = pathname.split('?')[0] || pathname
  const activeGroupId = useMemo(() => getAdminNavGroupIdForPath(pathOnly), [pathOnly])

  const [searchQuery, setSearchQuery] = useState('')
  const searchActive = searchQuery.trim().length > 0

  const [expanded, setExpanded] = useState<Set<string>>(() =>
    new Set(activeGroupId ? [activeGroupId] : [])
  )

  const visibleGroups = useMemo(() => buildVisibleGroups(searchQuery), [searchQuery])

  useEffect(() => {
    setExpanded(new Set(activeGroupId ? [activeGroupId] : []))
  }, [activeGroupId])

  const toggle = (id: string) => {
    if (searchActive) return
    setExpanded((prev) => {
      if (prev.has(id)) return new Set()
      return new Set([id])
    })
  }

  const isMultiGroupOpen = (groupId: string) => {
    if (searchActive) return true
    return expanded.has(groupId)
  }

  return (
    <div className="space-y-3">
      <div className="relative px-1">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary-300"
          aria-hidden
        />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search navigation..."
          aria-label="Search admin navigation"
          className={cn(
            'w-full rounded-lg border border-white/20 bg-white/5 py-2 pl-9 pr-8 text-sm text-white',
            'placeholder:text-primary-200/70',
            'focus:border-secondary-400 focus:outline-none focus:ring-1 focus:ring-secondary-400/50'
          )}
        />
        {searchQuery ? (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-primary-200 hover:bg-white/10 hover:text-white"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div className="space-y-1">
        {visibleGroups.length === 0 ? (
          <p className="px-2 py-3 text-center text-sm text-primary-200/90">No navigation items match.</p>
        ) : (
          visibleGroups.map(({ group, children }) => {
            const GroupIcon = group.icon

            if (children.length === 1) {
              const child = children[0]
              const ChildIcon = child.icon
              const active = adminNavHrefIsActive(pathOnly, child.href)
              return (
                <Link
                  key={group.id}
                  href={child.href}
                  onClick={onNavigate}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'group flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200',
                    active
                      ? 'bg-white/10 text-white shadow-inner ring-1 ring-white/20'
                      : 'hover:bg-white/5 text-primary-100'
                  )}
                >
                  <div
                    className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
                      active
                        ? 'bg-secondary-400 text-primary-900'
                        : 'bg-white/10 group-hover:bg-secondary-400/80 group-hover:text-primary-900'
                    )}
                  >
                    <ChildIcon className="w-4 h-4" />
                  </div>
                  <span className="flex-1 font-medium">{child.label}</span>
                  {active && <ChevronRight className="w-4 h-4 text-secondary-400 shrink-0" />}
                </Link>
              )
            }

            const isOpen = isMultiGroupOpen(group.id)
            const groupHasActive = children.some((c) => adminNavHrefIsActive(pathOnly, c.href))

            return (
              <div key={group.id} className="space-y-0.5">
                <button
                  type="button"
                  onClick={() => toggle(group.id)}
                  aria-expanded={isOpen}
                  aria-disabled={searchActive}
                  aria-controls={`admin-nav-${group.id}`}
                  className={cn(
                    'flex w-full items-center gap-2 px-3 py-2.5 rounded-lg text-left text-sm font-semibold transition-colors min-h-[44px]',
                    searchActive && 'cursor-default',
                    groupHasActive ? 'bg-white/10 text-white' : 'text-primary-100 hover:bg-white/5',
                    searchActive && 'hover:bg-white/10'
                  )}
                >
                  <div
                    className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                      groupHasActive ? 'bg-secondary-400 text-primary-900' : 'bg-white/10'
                    )}
                  >
                    <GroupIcon className="w-4 h-4" />
                  </div>
                  <span className="flex-1 min-w-0 truncate">{group.label}</span>
                  {isOpen ? (
                    <ChevronDown className="w-4 h-4 shrink-0" aria-hidden />
                  ) : (
                    <ChevronRight className="w-4 h-4 shrink-0" aria-hidden />
                  )}
                </button>
                {isOpen && (
                  <ul
                    id={`admin-nav-${group.id}`}
                    role="list"
                    className="ml-2 space-y-0.5 border-l border-white/15 pl-2 pb-1"
                  >
                    {children.map((child) => {
                      const ChildIcon = child.icon
                      const active = adminNavHrefIsActive(pathOnly, child.href)
                      return (
                        <li key={child.href + child.label}>
                          <Link
                            href={child.href}
                            onClick={onNavigate}
                            aria-current={active ? 'page' : undefined}
                            className={cn(
                              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors min-h-[40px]',
                              active
                                ? 'bg-white/10 text-white font-medium ring-1 ring-white/15'
                                : 'text-primary-100/90 hover:bg-white/5'
                            )}
                          >
                            <ChildIcon className="w-3.5 h-3.5 shrink-0 opacity-90" aria-hidden />
                            <span className="truncate">{child.label}</span>
                            {active && (
                              <ChevronRight
                                className="w-3.5 h-3.5 ml-auto text-secondary-400 shrink-0"
                                aria-hidden
                              />
                            )}
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
