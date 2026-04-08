'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Mail, UserPlus, Users, UserRound } from 'lucide-react'
import type { GeriatricHome, User, UserRoleAssignment } from '@prisma/client'
import { cn } from '@/lib/utils'
import { STYLES } from '@/lib/styles'
import UsersTable from '@/components/admin/UsersTable'
import HomeAdminsTable from '@/components/admin/HomeAdminsTable'

type UserWithCounts = User & {
  _count?: {
    sentMessages: number
    notifications: number
  }
  geriatricHome?: GeriatricHome | null
  roleAssignments?: UserRoleAssignment[]
}

type TabKey = 'team' | 'home-admins'

export default function AdminPeopleHomesTabs({
  teamUsers,
  homeAdminUsers,
  initialTab,
}: {
  teamUsers: UserWithCounts[]
  homeAdminUsers: UserWithCounts[]
  initialTab: TabKey
}) {
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab)

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <div className="border-b border-gray-200 bg-white px-3 sm:px-5">
          <div className="flex gap-6 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('team')}
              className={cn(
                "shrink-0 py-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap",
                activeTab === 'team'
                  ? "border-primary-600 text-primary-700"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              )}
            >
              <Users className="w-4 h-4" />
              Team
              <span className={cn(STYLES.badge, STYLES.badgeNeutral, "py-0.5 px-2")}>{teamUsers.length}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('home-admins')}
              className={cn(
                "shrink-0 py-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap",
                activeTab === 'home-admins'
                  ? "border-primary-600 text-primary-700"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              )}
            >
              <UserRound className="w-4 h-4" />
              Home Admins
              <span className={cn(STYLES.badge, STYLES.badgeNeutral, "py-0.5 px-2")}>{homeAdminUsers.length}</span>
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          {activeTab === 'team' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <Link href="/admin/invitations" className={cn(STYLES.btn, STYLES.btnPrimary, STYLES.btnToolbar)}>
                  <Mail className={STYLES.btnToolbarIcon} />
                  Invite New User
                </Link>
                <Link href="/admin/users/new" className={cn(STYLES.btn, STYLES.btnSecondary, STYLES.btnToolbar)}>
                  <UserPlus className={STYLES.btnToolbarIcon} />
                  Create Staff Profile
                </Link>
              </div>
              <UsersTable users={teamUsers} />
            </div>
          )}

          {activeTab === 'home-admins' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="bg-white px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700">
                  Home Admin Accounts: <span className="text-primary-600 font-bold ml-1">{homeAdminUsers.length}</span>
                </div>
                <Link href="/admin/invitations" className={cn(STYLES.btn, STYLES.btnSecondary, STYLES.btnToolbar)}>
                  <Mail className={STYLES.btnToolbarIcon} />
                  Invite Home Admin
                </Link>
              </div>
              <HomeAdminsTable users={homeAdminUsers} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
