'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Calendar, List, ClipboardList, Plus } from "lucide-react"
import { TabNavigation } from "@/components/admin/shared/TabNavigation"
import { EventListTable } from "@/components/admin/events/EventListTable"
import { AdminRequestList } from "@/components/event-requests/AdminRequestList"
import Link from "next/link"
import { STYLES } from "@/lib/styles"
import { cn } from "@/lib/utils"
import { notify } from '@/lib/notify'

import { PublicCalendarView } from '@/components/events/PublicCalendarView'

type EventManagementHubClientProps = {
  events: Record<string, unknown>[]
  requests: Record<string, unknown>[]
}

export function EventManagementHubClient({ events, requests }: EventManagementHubClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const createdParam = searchParams.get('created')
  const conflictParam = searchParams.get('conflicts')
  const initialTab = tabParam === 'requests' || tabParam === 'list' || tabParam === 'calendar'
    ? tabParam
    : 'calendar'

  const [activeTab, setActiveTab] = useState(initialTab)
  const hasNotifiedRef = useRef(false)

  useEffect(() => {
    if (hasNotifiedRef.current) return
    if (createdParam !== '1') return

    hasNotifiedRef.current = true
    notify.success({ title: 'Event created successfully' })

    const conflictCount = Number.parseInt(conflictParam || '0', 10)
    if (Number.isFinite(conflictCount) && conflictCount > 0) {
      notify.warning({
        title: 'Potential schedule conflict',
        description: `${conflictCount} event(s) start within 1 hour.`,
      })
    }

    const keepTab = tabParam && ['list', 'calendar', 'requests'].includes(tabParam)
      ? `?tab=${tabParam}`
      : '?tab=calendar'
    router.replace(`/admin/events${keepTab}`)
  }, [createdParam, conflictParam, tabParam, router])

  const tabs = [
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'list', label: 'All Events', icon: List },
    {
      id: 'requests',
      label: 'Event Requests',
      icon: ClipboardList,
      count: requests.filter((r) => r.status === 'PENDING').length
    }
  ]

  return (
    <div className="h-full flex flex-col">
      {/* Tabs with action button - header moved to layout */}
      <div className="flex items-center justify-between mb-4">
        <TabNavigation
          tabs={tabs}
          activeTab={activeTab}
          onChange={setActiveTab}
        />
        {activeTab === 'list' && (
          <Link href="/admin/events/new" className={cn(STYLES.btn, STYLES.btnPrimary)}>
            <Plus className="w-4 h-4" />
            Create Event
          </Link>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-hidden pb-2">
        {activeTab === 'list' && <EventListTable events={events as never[]} />}
        {activeTab === 'calendar' && (
          <PublicCalendarView
            events={events as never[]}
            userRole="ADMIN"
            canCreateEvents
          />
        )}
        {activeTab === 'requests' && <AdminRequestList requests={requests as never[]} />}
      </div>
    </div>
  )
}
