'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Calendar, List, ClipboardList, Plus } from "lucide-react"
import { TabNavigation } from "@/components/admin/shared/TabNavigation"
import { EventListTable } from "@/components/admin/events/EventListTable"
import { AdminRequestList } from "@/components/event-requests/AdminRequestList"
import Link from "next/link"
import { STYLES } from "@/lib/styles"
import { cn } from "@/lib/utils"

import { AdminCalendarView } from "@/components/admin/events/AdminCalendarView"

type EventManagementHubClientProps = {
  events: any[]
  requests: any[]
}

export function EventManagementHubClient({ events, requests }: EventManagementHubClientProps) {
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const initialTab = tabParam === 'requests' || tabParam === 'list' || tabParam === 'calendar'
    ? tabParam
    : 'list'

  const [activeTab, setActiveTab] = useState(initialTab)

  useEffect(() => {
    if (tabParam === 'requests' || tabParam === 'list' || tabParam === 'calendar') {
      setActiveTab(tabParam)
    }
  }, [tabParam])

  const tabs = [
    { id: 'list', label: 'All Events', icon: List },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    {
      id: 'requests',
      label: 'Event Requests',
      icon: ClipboardList,
      count: requests.filter((r: any) => r.status === 'PENDING').length
    }
  ]

  return (
    <div className="h-full flex flex-col p-4 md:p-6">
      <div className="flex-shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Event Management</h1>
          <p className="text-sm text-gray-500">Events, calendar, and request approvals</p>
        </div>
        {activeTab === 'list' && (
          <Link href="/admin/events/new" className={cn(STYLES.btn, STYLES.btnPrimary, "self-start sm:self-auto")}>
            <Plus className="w-4 h-4" />
            Create Event
          </Link>
        )}
      </div>

      <TabNavigation
        tabs={tabs}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      <div className="flex-1 min-h-0 overflow-auto mt-4">
        {activeTab === 'list' && <EventListTable events={events} />}
        {activeTab === 'calendar' && <AdminCalendarView events={events} />}
        {activeTab === 'requests' && <AdminRequestList requests={requests} />}
      </div>
    </div>
  )
}
