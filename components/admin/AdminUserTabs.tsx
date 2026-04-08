'use client'

import { useState, ReactNode } from 'react'
import { Users, Building2, User, Briefcase, FileText, Shield, IdCard } from 'lucide-react'
import { cn } from '@/lib/utils'

const iconMap = {
  users: Users,
  building: Building2,
  user: User,
  briefcase: Briefcase,
  fileText: FileText,
  shield: Shield,
  idCard: IdCard,
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
    <div className="space-y-3 min-w-0">
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = iconMap[tab.icon]
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "shrink-0 px-3 sm:px-4 py-2.5 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors min-w-0",
                activeTab === tab.id
                  ? "border-primary-600 text-primary-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate max-w-[10rem] sm:max-w-none">{tab.label}</span>
            </button>
          )
        })}
      </div>
      {/* Tab Content — min-w-0 avoids flex/grid children clipping overflow */}
      {tabs.map((tab) => (
        <div key={tab.id} className={activeTab === tab.id ? 'block min-w-0' : 'hidden'}>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="p-4 sm:p-5 min-w-0">{tab.content}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
