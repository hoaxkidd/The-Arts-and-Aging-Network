'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  adminNavGroups,
  adminNavHrefIsActive,
  getAdminNavGroupIdForPath,
} from '@/lib/menu'
import { cn } from '@/lib/utils'
import { ChevronDown, ChevronRight } from 'lucide-react'

type AdminSidebarGroupedNavProps = {
  pathname: string
  /** Called when a nav link is activated (e.g. close mobile drawer). */
  onNavigate?: () => void
}

export function AdminSidebarGroupedNav({ pathname, onNavigate }: AdminSidebarGroupedNavProps) {
  const pathOnly = pathname.split('?')[0] || pathname
  const activeGroupId = useMemo(() => getAdminNavGroupIdForPath(pathOnly), [pathOnly])

  const [expanded, setExpanded] = useState<Set<string>>(() =>
    new Set(activeGroupId ? [activeGroupId] : [])
  )

  useEffect(() => {
    if (activeGroupId) {
      setExpanded((prev) => {
        const next = new Set(prev)
        next.add(activeGroupId)
        return next
      })
    }
  }, [activeGroupId])

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-1">
      {adminNavGroups.map((group) => {
        const GroupIcon = group.icon

        if (group.children.length === 1) {
          const child = group.children[0]
          const ChildIcon = child.icon
          const active = adminNavHrefIsActive(pathOnly, child.href)
          return (
            <Link
              key={group.id}
              href={child.href}
              onClick={onNavigate}
              className={cn(
                'group flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200',
                active
                  ? 'bg-white/10 text-white shadow-inner'
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

        const isOpen = expanded.has(group.id)
        const groupHasActive = group.children.some((c) =>
          adminNavHrefIsActive(pathOnly, c.href)
        )

        return (
          <div key={group.id} className="space-y-0.5">
            <button
              type="button"
              onClick={() => toggle(group.id)}
              aria-expanded={isOpen}
              aria-controls={`admin-nav-${group.id}`}
              className={cn(
                'flex w-full items-center gap-2 px-3 py-2.5 rounded-lg text-left text-sm font-semibold transition-colors min-h-[44px]',
                groupHasActive ? 'bg-white/10 text-white' : 'text-primary-100 hover:bg-white/5'
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
                {group.children.map((child) => {
                  const ChildIcon = child.icon
                  const active = adminNavHrefIsActive(pathOnly, child.href)
                  return (
                    <li key={child.href + child.label}>
                      <Link
                        href={child.href}
                        onClick={onNavigate}
                        className={cn(
                          'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors min-h-[40px]',
                          active
                            ? 'bg-white/10 text-white font-medium'
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
      })}
    </div>
  )
}
