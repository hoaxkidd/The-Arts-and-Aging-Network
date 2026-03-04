'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle } from "lucide-react"
import { TabNavigation } from "@/components/admin/shared/TabNavigation"
import { HomeEventHistory } from "@/components/dashboard/HomeEventHistory"

type Tab = {
  id: string
  label: string
  count: number
}

type MyEventsClientProps = {
  events: any[]
  tabs: Tab[]
  initialTab: string
}

export function MyEventsClient({ events, tabs, initialTab }: MyEventsClientProps) {
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  
  const [activeTab, setActiveTab] = useState(tabParam || initialTab)

  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam)
    }
  }, [tabParam])

  // Determine filter from active tab
  const activeFilter = activeTab === 'all' ? 'ALL' : activeTab as 'UPCOMING' | 'PAST'

  return (
    <div className="h-full flex flex-col px-4 sm:px-6 py-5">
      <div className="flex-shrink-0 sticky top-0 z-10 bg-white pb-3 mb-3 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Events</h1>
            <p className="text-sm text-gray-500 mt-1">View all events your facility has participated in</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-shrink-0 sticky top-[73px] z-9 bg-white border-b border-gray-200 -mb-px">
        <TabNavigation
          tabs={tabs}
          activeTab={activeTab}
          onChange={setActiveTab}
        />
      </div>

      {/* Event List */}
      <div className="flex-1 min-h-0 mt-5">
        <HomeEventHistory events={events} activeFilter={activeFilter} />
      </div>
    </div>
  )
}
