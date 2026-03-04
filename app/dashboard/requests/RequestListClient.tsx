'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Plus, ClipboardList } from "lucide-react"
import { TabNavigation } from "@/components/admin/shared/TabNavigation"
import { RequestList } from "@/components/event-requests/RequestList"
import { STYLES } from "@/lib/styles"
import { cn } from "@/lib/utils"

type Tab = {
  id: string
  label: string
  count: number
}

type RequestListClientProps = {
  requests: any[]
  tabs: Tab[]
  initialTab: string
}

export function RequestListClient({ requests, tabs, initialTab }: RequestListClientProps) {
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  
  const [activeTab, setActiveTab] = useState(tabParam || initialTab)

  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam)
    }
  }, [tabParam])

  // Determine filter from active tab
  const activeFilter = activeTab === 'all' ? 'ALL' : activeTab as 'PENDING' | 'APPROVED' | 'REJECTED'

  return (
    <div className="h-full flex flex-col px-4 sm:px-6 py-5">
      <div className="flex-shrink-0 sticky top-0 z-10 bg-white pb-3 mb-3 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Event Requests</h1>
            <p className="text-sm text-gray-500 mt-1">Track your event participation requests</p>
          </div>
        </div>
        <Link href="/dashboard/requests/new" className={cn(STYLES.btn, STYLES.btnPrimary, "self-start sm:self-auto")}>
          <Plus className="w-4 h-4" />
          New Request
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex-shrink-0 sticky top-[73px] z-9 bg-white border-b border-gray-200 -mb-px">
        <TabNavigation
          tabs={tabs}
          activeTab={activeTab}
          onChange={setActiveTab}
        />
      </div>

      {/* Request List */}
      <div className="flex-1 min-h-0 mt-5">
        <RequestList requests={requests} userRole="HOME_ADMIN" activeFilter={activeFilter} />
      </div>
    </div>
  )
}
