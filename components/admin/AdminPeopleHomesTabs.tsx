'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Building2, Mail, UserPlus, Users, UserRound } from 'lucide-react'
import type { GeriatricHome, User } from '@prisma/client'
import { cn } from '@/lib/utils'
import { STYLES } from '@/lib/styles'
import UsersTable from '@/components/admin/UsersTable'
import HomeAdminsTable from '@/components/admin/HomeAdminsTable'
import { HomeList } from '@/components/admin/HomeList'
import { AddHomeButton } from '@/components/admin/AddHomeButton'

type UserWithCounts = User & {
  _count?: {
    sentMessages: number
    notifications: number
  }
  geriatricHome?: GeriatricHome | null
}

type Home = {
  id: string
  name: string
  address: string
  residentCount: number
  maxCapacity: number
  contactName: string
  contactPhone: string
  user: {
    email: string | null
    status: string
  }
}

type TabKey = 'team' | 'home-admins' | 'homes'

export default function AdminPeopleHomesTabs({
  teamUsers,
  homeAdminUsers,
  homes,
  initialTab,
}: {
  teamUsers: UserWithCounts[]
  homeAdminUsers: UserWithCounts[]
  homes: Home[]
  initialTab: TabKey
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab)

  useEffect(() => {
    setActiveTab(initialTab)
  }, [initialTab])

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab)
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tab)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <div className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white p-2 sm:p-3 flex gap-2">
          <button
            type="button"
            onClick={() => handleTabChange('team')}
            className={cn(
              "inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg transition-colors",
              activeTab === 'team'
                ? "bg-primary-100 text-primary-700 border border-primary-200"
                : "text-gray-600 hover:bg-gray-100"
            )}
          >
            <Users className="w-4 h-4" />
            Team
            <span className="text-xs bg-white/80 border border-gray-200 text-gray-600 rounded-full px-1.5 py-0.5">{teamUsers.length}</span>
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('home-admins')}
            className={cn(
              "inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg transition-colors",
              activeTab === 'home-admins'
                ? "bg-primary-100 text-primary-700 border border-primary-200"
                : "text-gray-600 hover:bg-gray-100"
            )}
          >
            <UserRound className="w-4 h-4" />
            Home Admins
            <span className="text-xs bg-white/80 border border-gray-200 text-gray-600 rounded-full px-1.5 py-0.5">{homeAdminUsers.length}</span>
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('homes')}
            className={cn(
              "inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg transition-colors",
              activeTab === 'homes'
                ? "bg-primary-100 text-primary-700 border border-primary-200"
                : "text-gray-600 hover:bg-gray-100"
            )}
          >
            <Building2 className="w-4 h-4" />
            Homes
            <span className="text-xs bg-white/80 border border-gray-200 text-gray-600 rounded-full px-1.5 py-0.5">{homes.length}</span>
          </button>
        </div>

        <div className="p-4 sm:p-5">
          {activeTab === 'team' ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <Link href="/admin/invitations" className={cn(STYLES.btn, STYLES.btnPrimary)}>
                  <Mail className="w-4 h-4" />
                  Invite New User
                </Link>
                <Link href="/admin/users/new" className={cn(STYLES.btn, STYLES.btnSecondary)}>
                  <UserPlus className="w-4 h-4" />
                  Create Staff Profile
                </Link>
              </div>
              <UsersTable users={teamUsers} />
            </div>
          ) : activeTab === 'home-admins' ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="bg-white px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700">
                  Home Admin Accounts: <span className="text-primary-600 font-bold ml-1">{homeAdminUsers.length}</span>
                </div>
                <Link href="/admin/invitations" className={cn(STYLES.btn, STYLES.btnSecondary)}>
                  <Mail className="w-4 h-4" />
                  Invite Home Admin
                </Link>
              </div>
              <HomeAdminsTable users={homeAdminUsers} />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="bg-white px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700">
                  Total Homes: <span className="text-primary-600 font-bold ml-1">{homes.length}</span>
                </div>
                <AddHomeButton />
              </div>
              <HomeList initialHomes={homes} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
