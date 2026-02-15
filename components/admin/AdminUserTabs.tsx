'use client'

import { useState, ReactNode } from 'react'
import { Users, Building2, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const iconMap = {
  users: Users,
  building: Building2,
  user: User,
} as const

type TabDef = {
  id: string
  label: string
  icon: keyof typeof iconMap
  content: ReactNode
}

export function AdminUserTabs({ tabs }: { tabs: TabDef[] }) {
  const [activeTab, setActiveTab] = useState(tabs[0]?.id || '')

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200">
        {tabs.map((tab) => {
          const Icon = iconMap[tab.icon]
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-6 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors",
                activeTab === tab.id
                  ? "border-primary-600 text-primary-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>
      {/* Tab Content */}
      {tabs.map((tab) => (
        <div key={tab.id} className={activeTab === tab.id ? 'block' : 'hidden'}>
          {tab.content}
        </div>
      ))}
    </div>
  )
}
