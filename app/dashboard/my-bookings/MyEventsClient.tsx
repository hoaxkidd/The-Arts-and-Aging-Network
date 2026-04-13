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
    <div className="h-full flex flex-col">
      {/* Tabs */}
      <div className="flex-shrink-0 border-b border-gray-200 -mb-px">
        <TabNavigation
          tabs={tabs}
          activeTab={activeTab}
          onChange={setActiveTab}
        />
      </div>

      {/* Event List */}
      <div className="flex-1 min-h-0 mt-4">
        <HomeEventHistory events={events} activeFilter={activeFilter} />
      </div>
    </div>
  )
}
