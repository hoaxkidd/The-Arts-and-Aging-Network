'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MessageCircle } from 'lucide-react'
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

const roleLabels: Record<string, string> = {
  ADMIN: 'Administrator',
  BOARD: 'Board Member',
  PAYROLL: 'Payroll Staff',
  HOME_ADMIN: 'Home Administrator',
  FACILITATOR: 'Facilitator',
  CONTRACTOR: 'Contractor',
  VOLUNTEER: 'Volunteer',
  PARTNER: 'Community Partner',
}

const avatarColors: Record<string, string> = {
  ADMIN: 'bg-red-500',
  BOARD: 'bg-purple-500',
  PAYROLL: 'bg-amber-500',
  HOME_ADMIN: 'bg-emerald-500',
  FACILITATOR: 'bg-blue-500',
  CONTRACTOR: 'bg-sky-500',
  VOLUNTEER: 'bg-teal-500',
  PARTNER: 'bg-indigo-500',
}

export function StaffDirectoryCard({ staff }: { staff: StaffMember }) {
  const router = useRouter()
  const displayName = staff.preferredName || staff.name || 'Unknown'
  const initials = displayName.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2)

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-gray-50 transition-colors group">
      <Link href={`/staff/directory/${staff.id}`} className="flex items-center gap-3 flex-1 min-w-0">
        {staff.image ? (
          <img src={staff.image} alt={displayName} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
        ) : (
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0",
            avatarColors[staff.role] || 'bg-gray-400'
          )}>
            {initials}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium text-gray-900 truncate group-hover:text-primary-600">
              {displayName}
            </span>
            {staff.pronouns && (
              <span className="text-xs text-gray-400">({staff.pronouns})</span>
            )}
          </div>
          <p className="text-xs text-gray-500 truncate">
            {[staff.position || roleLabels[staff.role], staff.region].filter(Boolean).join(' · ')}
          </p>
        </div>
      </Link>

      <button
        onClick={() => router.push(`/staff/inbox/${staff.id}`)}
        className="text-gray-300 hover:text-primary-500 transition-colors flex-shrink-0"
      >
        <MessageCircle className="w-4 h-4" />
      </button>
    </div>
  )
}
