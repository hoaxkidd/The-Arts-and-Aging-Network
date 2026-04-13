'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Plus, ClipboardList } from "lucide-react"
import { TabNavigation } from "@/components/admin/shared/TabNavigation"
import { RequestList } from "@/components/booking-requests/RequestList"
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
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <TabNavigation
          tabs={tabs}
          activeTab={activeTab}
          onChange={setActiveTab}
        />
        <Link href="/dashboard/requests/new" className={cn(STYLES.btn, STYLES.btnPrimary)}>
          <Plus className="w-4 h-4" />
          New Request
        </Link>
      </div>

      {/* Request List */}
      <div className="flex-1 min-h-0">
        <RequestList requests={requests} userRole="HOME_ADMIN" activeFilter={activeFilter} />
      </div>
    </div>
  )
}
