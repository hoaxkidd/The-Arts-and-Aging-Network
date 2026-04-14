'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { Calendar, List, Plus } from 'lucide-react'
import { HomeEventHistory } from '@/components/dashboard/HomeEventHistory'
import { HomeCalendarView } from '@/components/dashboard/HomeCalendarView'
import { RequestList } from '@/components/booking-requests/RequestList'
import { cn } from '@/lib/utils'
import { STYLES } from '@/lib/styles'

type Props = {
  events: any[]
  requests: any[]
}

export function MyBookingsClient({ events, requests }: Props) {
  const searchParams = useSearchParams()
  const rawSection = searchParams.get('section') || 'all'
  const rawView = searchParams.get('view') || 'list'
  const rawTab = searchParams.get('tab') || 'all'

  const allowedSections = new Set(['all', 'upcoming', 'past', 'requests'])
  const allowedViews = new Set(['list', 'calendar'])
  const allowedRequestTabs = new Set(['all', 'pending', 'approved', 'rejected'])

  const section = allowedSections.has(rawSection) ? rawSection : 'all'
  const view = allowedViews.has(rawView) ? rawView : 'list'
  const tab = allowedRequestTabs.has(rawTab.toLowerCase()) ? rawTab.toLowerCase() : 'all'

  const eventsFilter = useMemo<'ALL' | 'UPCOMING' | 'PAST'>(() => {
    if (section === 'upcoming') return 'UPCOMING'
    if (section === 'past') return 'PAST'
    return 'ALL'
  }, [section])

  const requestFilter = useMemo<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>(() => {
    const normalized = tab.toUpperCase()
    if (normalized === 'PENDING' || normalized === 'APPROVED' || normalized === 'REJECTED') return normalized
    return 'ALL'
  }, [tab])

  const sectionTabClass = (active: boolean) =>
    cn(
      'px-3 py-1.5 rounded-md text-sm font-medium border transition-colors',
      active ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-700 border-gray-200 hover:border-primary-300'
    )

  return (
    <div className="space-y-4">
      {section === 'requests' && (
        <div className="flex justify-end">
          <Link href="/dashboard/requests/new" className={cn(STYLES.btn, STYLES.btnPrimary)}>
            <Plus className="w-4 h-4" />
            New Booking Request
          </Link>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 pb-3">
        <Link href="/dashboard/my-bookings?section=all" className={sectionTabClass(section === 'all')}>
          All Bookings
        </Link>
        <Link href="/dashboard/my-bookings?section=upcoming" className={sectionTabClass(section === 'upcoming')}>
          Upcoming
        </Link>
        <Link href="/dashboard/my-bookings?section=past" className={sectionTabClass(section === 'past')}>
          Past
        </Link>
        <Link href="/dashboard/my-bookings?section=requests" className={sectionTabClass(section === 'requests')}>
          Requests
        </Link>
      </div>

      {section !== 'requests' && (
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/my-bookings?section=${section}&view=list`} className={cn(STYLES.btn, view === 'list' ? STYLES.btnPrimary : STYLES.btnSecondary)}>
            <List className="w-4 h-4" />
            List
          </Link>
          <Link href={`/dashboard/my-bookings?section=${section}&view=calendar`} className={cn(STYLES.btn, view === 'calendar' ? STYLES.btnPrimary : STYLES.btnSecondary)}>
            <Calendar className="w-4 h-4" />
            Calendar
          </Link>
        </div>
      )}

      {section === 'requests' ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/dashboard/my-bookings?section=requests&tab=all" className={sectionTabClass(requestFilter === 'ALL')}>
              All
            </Link>
            <Link href="/dashboard/my-bookings?section=requests&tab=pending" className={sectionTabClass(requestFilter === 'PENDING')}>
              Pending
            </Link>
            <Link href="/dashboard/my-bookings?section=requests&tab=approved" className={sectionTabClass(requestFilter === 'APPROVED')}>
              Approved
            </Link>
            <Link href="/dashboard/my-bookings?section=requests&tab=rejected" className={sectionTabClass(requestFilter === 'REJECTED')}>
              Declined
            </Link>
          </div>
          <RequestList requests={requests} userRole="HOME_ADMIN" activeFilter={requestFilter} />
        </div>
      ) : view === 'calendar' ? (
        <HomeCalendarView events={events} />
      ) : (
        <HomeEventHistory events={events} activeFilter={eventsFilter} />
      )}
    </div>
  )
}
