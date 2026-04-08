'use client'

import { useMemo, useState } from 'react'
import { CheckCircle, Clock, Star, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { STYLES } from '@/lib/styles'
import { LinedStatusTabs } from '@/components/ui/LinedStatusTabs'

export type TestimonialRow = {
  id: string
  authorName: string
  authorRole: string | null
  content: string
  rating: number | null
  status: string
  featured: boolean
  collectedAt: string
  event: { title: string } | null
  collector: { name: string | null } | null
}

type TabId = 'ALL' | 'APPROVED' | 'PENDING' | 'REJECTED' | 'FEATURED'

type Props = {
  testimonials: TestimonialRow[]
}

function excerpt(text: string, max = 120) {
  const t = text.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max).trim()}…`
}

function statusBadge(status: string) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded',
        status === 'APPROVED' && 'bg-green-100 text-green-700',
        status === 'PENDING' && 'bg-yellow-100 text-yellow-700',
        status === 'REJECTED' && 'bg-red-100 text-red-700',
        !['APPROVED', 'PENDING', 'REJECTED'].includes(status) && 'bg-gray-100 text-gray-700'
      )}
    >
      {status === 'APPROVED' && <CheckCircle className="w-3 h-3" />}
      {status === 'PENDING' && <Clock className="w-3 h-3" />}
      {status === 'REJECTED' && <XCircle className="w-3 h-3" />}
      {status}
    </span>
  )
}

export function TestimonialsHubClient({ testimonials }: Props) {
  const [tab, setTab] = useState<TabId>('ALL')

  const counts = useMemo(() => {
    return {
      ALL: testimonials.length,
      APPROVED: testimonials.filter((t) => t.status === 'APPROVED').length,
      PENDING: testimonials.filter((t) => t.status === 'PENDING').length,
      REJECTED: testimonials.filter((t) => t.status === 'REJECTED').length,
      FEATURED: testimonials.filter((t) => t.featured).length,
    }
  }, [testimonials])

  const filtered = useMemo(() => {
    if (tab === 'ALL') return testimonials
    if (tab === 'FEATURED') return testimonials.filter((t) => t.featured)
    return testimonials.filter((t) => t.status === tab)
  }, [testimonials, tab])

  const sorted = useMemo(
    () =>
      [...filtered].sort(
        (a, b) => new Date(b.collectedAt).getTime() - new Date(a.collectedAt).getTime()
      ),
    [filtered]
  )

  const stats = {
    total: testimonials.length,
    approved: counts.APPROVED,
    pending: counts.PENDING,
    featured: counts.FEATURED,
  }

  const linedTabs = [
    { id: 'ALL' as const, label: 'All', count: counts.ALL },
    { id: 'APPROVED' as const, label: 'Approved', count: counts.APPROVED },
    { id: 'PENDING' as const, label: 'Pending', count: counts.PENDING },
    { id: 'REJECTED' as const, label: 'Rejected', count: counts.REJECTED },
    { id: 'FEATURED' as const, label: 'Featured', count: counts.FEATURED },
  ]

  return (
    <div className="space-y-4 min-w-0">
      <div className="flex flex-wrap gap-3">
        <div className={cn(STYLES.statsCard, 'flex-1 min-w-[140px]')}>
          <p className="text-xs text-gray-500 uppercase">Total</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className={cn(STYLES.statsCard, 'flex-1 min-w-[140px] border-green-200')}>
          <p className="text-xs text-green-600 uppercase">Approved</p>
          <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
        </div>
        <div className={cn(STYLES.statsCard, 'flex-1 min-w-[140px] border-yellow-200')}>
          <p className="text-xs text-yellow-600 uppercase">Pending</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
        </div>
        <div className={cn(STYLES.statsCard, 'flex-1 min-w-[140px] border-blue-200')}>
          <p className="text-xs text-blue-600 uppercase">Featured</p>
          <p className="text-2xl font-bold text-blue-600">{stats.featured}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden min-w-0">
        <div className="px-4 pt-3">
          <LinedStatusTabs
            tabs={linedTabs}
            activeId={tab}
            onChange={setTab}
            aria-label="Filter testimonials"
          />
        </div>

        <div className="border-t border-gray-100">
          <div className="table-scroll-wrapper max-h-[calc(100vh-320px)]">
            <table className={STYLES.table}>
              <thead className="bg-gray-50">
                <tr className={STYLES.tableHeadRow}>
                  <th className={STYLES.tableHeader}>Author</th>
                  <th className={STYLES.tableHeader}>Excerpt</th>
                  <th className={STYLES.tableHeader}>Event</th>
                  <th className={cn(STYLES.tableHeader, 'text-center')}>Rating</th>
                  <th className={STYLES.tableHeader}>Status</th>
                  <th className={cn(STYLES.tableHeader, 'text-center')}>Featured</th>
                  <th className={STYLES.tableHeader}>Collected</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sorted.length === 0 ? (
                  <tr>
                    <td colSpan={7} className={cn(STYLES.tableCell, 'text-center py-12 text-gray-500')}>
                      No testimonials match this filter.
                    </td>
                  </tr>
                ) : (
                  sorted.map((t) => (
                    <tr key={t.id} className={STYLES.tableRow}>
                      <td className={STYLES.tableCell}>
                        <p className="font-medium text-gray-900">{t.authorName}</p>
                        {t.authorRole && (
                          <p className="text-xs text-gray-500">{t.authorRole}</p>
                        )}
                      </td>
                      <td className={cn(STYLES.tableCell, 'max-w-[280px]')}>
                        <p className="text-sm text-gray-700 line-clamp-3">{excerpt(t.content, 200)}</p>
                      </td>
                      <td className={STYLES.tableCell}>
                        <span className="text-sm text-gray-600">{t.event?.title ?? '—'}</span>
                      </td>
                      <td className={cn(STYLES.tableCell, 'text-center')}>
                        {t.rating ? (
                          <span className="inline-flex items-center gap-0.5 text-yellow-500">
                            <Star className="w-3.5 h-3.5 fill-current" aria-hidden />
                            <span className="text-sm text-gray-700">{t.rating}</span>
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className={STYLES.tableCell}>{statusBadge(t.status)}</td>
                      <td className={cn(STYLES.tableCell, 'text-center')}>
                        {t.featured ? (
                          <span className="text-xs font-medium text-blue-700 bg-blue-100 px-2 py-1 rounded">
                            Yes
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className={STYLES.tableCell}>
                        <span className="text-sm text-gray-600 whitespace-nowrap">
                          {new Date(t.collectedAt).toLocaleDateString('en-CA', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                        {t.collector?.name && (
                          <p className="text-xs text-gray-500 truncate max-w-[140px]">{t.collector.name}</p>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
