'use client'

import { useState } from 'react'
import { StaffDirectoryCard } from '@/components/staff/StaffDirectoryCard'
import { Users } from 'lucide-react'
import { cn } from '@/lib/utils'

type StaffMember = {
  id: string
  name: string | null
  preferredName: string | null
  pronouns: string | null
  image: string | null
  role: string
  position: string | null
  region: string | null
  bio: string | null
}

type RoleGroup = {
  role: string
  label: string
  members: StaffMember[]
}

export function DirectoryTabs({ groups }: { groups: RoleGroup[] }) {
  const [activeRole, setActiveRole] = useState(groups[0]?.role || '')

  const activeGroup = groups.find(g => g.role === activeRole)

  return (
    <div className="space-y-3">
      {/* Tab Bar */}
      <div className="flex gap-1 overflow-x-auto border-b border-gray-200">
        {groups.map(group => (
          <button
            key={group.role}
            type="button"
            onClick={() => setActiveRole(group.role)}
            className={cn(
              "px-3 py-2 text-sm font-medium whitespace-nowrap flex items-center gap-1.5 border-b-2 transition-colors",
              activeRole === group.role
                ? "border-primary-600 text-primary-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            )}
          >
            {group.label}
            <span className={cn(
              "text-xs px-1.5 py-0.5 rounded-full",
              activeRole === group.role
                ? "bg-primary-50 text-primary-600"
                : "bg-gray-100 text-gray-500"
            )}>
              {group.members.length}
            </span>
          </button>
        ))}
      </div>

      {/* Active Tab Content */}
      {activeGroup ? (
        <div className="divide-y divide-gray-100">
          {activeGroup.members.map((member) => (
            <StaffDirectoryCard key={member.id} staff={member} />
          ))}
        </div>
      ) : (
        <div className="text-center py-10">
          <Users className="w-8 h-8 mx-auto text-gray-300 mb-2" />
          <p className="text-sm text-gray-500">No members in this group</p>
        </div>
      )}
    </div>
  )
}
