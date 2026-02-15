'use client'

import { useState } from 'react'
import { Building2, User } from 'lucide-react'
import { cn } from '@/lib/utils'

interface HomeProfileTabsProps {
  facilityContent: React.ReactNode
  accountContent: React.ReactNode
}

export function HomeProfileTabs({ facilityContent, accountContent }: HomeProfileTabsProps) {
  const [activeTab, setActiveTab] = useState<'facility' | 'account'>('facility')

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('facility')}
          className={cn(
            "px-6 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors",
            activeTab === 'facility'
              ? "border-primary-600 text-primary-600"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          )}
        >
          <Building2 className="w-4 h-4" />
          Facility Profile
        </button>
        <button
          onClick={() => setActiveTab('account')}
          className={cn(
            "px-6 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors",
            activeTab === 'account'
              ? "border-primary-600 text-primary-600"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          )}
        >
          <User className="w-4 h-4" />
          My Account
        </button>
      </div>

      {/* Tab Content */}
      <div className={cn(activeTab === 'facility' ? 'block' : 'hidden')}>
        {facilityContent}
      </div>
      <div className={cn(activeTab === 'account' ? 'block' : 'hidden')}>
        {accountContent}
      </div>
    </div>
  )
}