'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Edit2, Search, Filter, X, Power, PowerOff, Eye } from 'lucide-react'
import { STYLES } from '@/lib/styles'
import { cn } from '@/lib/utils'
import { toggleUserStatus } from '@/app/actions/user-management'
import { useRouter } from 'next/navigation'
import type { User, GeriatricHome } from '@prisma/client'
import { UserDetailModal } from './UserDetailModal'

type UserWithCounts = User & {
  _count?: {
    sentMessages: number
    notifications: number
  }
  geriatricHome?: GeriatricHome | null
}

export default function UsersTable({ users: initialUsers }: { users: UserWithCounts[] }) {
  const [users, setUsers] = useState(initialUsers)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('ALL')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [togglingStatus, setTogglingStatus] = useState<string | null>(null)
  const [viewUser, setViewUser] = useState<UserWithCounts | null>(null)
  const router = useRouter()

  // Filter and search users
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = searchQuery === '' ||
        user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesRole = roleFilter === 'ALL' || user.role === roleFilter
      const matchesStatus = statusFilter === 'ALL' || user.status === statusFilter

      return matchesSearch && matchesRole && matchesStatus
    })
  }, [users, searchQuery, roleFilter, statusFilter])

  // Get unique roles for filter
  const roles = useMemo(() => {
    const uniqueRoles = Array.from(new Set(users.map(u => u.role)))
    return uniqueRoles.sort()
  }, [users])

  const handleToggleStatus = async (userId: string) => {
    setTogglingStatus(userId)
    const result = await toggleUserStatus(userId)

    if (result.success && result.user) {
      // Update local state
      setUsers(prev => prev.map(u => u.id === userId ? result.user! : u))
      router.refresh()
    }

    setTogglingStatus(null)
  }

  const clearFilters = () => {
    setSearchQuery('')
    setRoleFilter('ALL')
    setStatusFilter('ALL')
  }

  const hasActiveFilters = searchQuery !== '' || roleFilter !== 'ALL' || statusFilter !== 'ALL'

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(STYLES.input, "pl-10")}
          />
        </div>

        {/* Role Filter */}
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className={cn(STYLES.input, STYLES.select, "w-full sm:w-48")}
        >
          <option value="ALL">All Roles</option>
          {roles.map(role => (
            <option key={role} value={role}>{role}</option>
          ))}
        </select>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={cn(STYLES.input, STYLES.select, "w-full sm:w-48")}
        >
          <option value="ALL">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="SUSPENDED">Suspended</option>
        </select>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
            Clear
          </button>
        )}
      </div>

      {/* Results count */}
      <div className="text-sm text-gray-600">
        Showing {filteredUsers.length} of {users.length} users
      </div>

      {/* Table */}
      <div className={cn(STYLES.card, "overflow-hidden p-0")}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Login</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 relative">
                        {user.image ? (
                          <Image
                            className="rounded-full object-cover"
                            src={user.image}
                            alt={user.name || 'User'}
                            fill
                            sizes="40px"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600">
                            <span className="font-bold">{user.name?.[0] || 'U'}</span>
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800 border border-gray-200">
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.status === 'ACTIVE'
                        ? 'bg-green-100 text-green-800 border border-green-200'
                        : 'bg-red-100 text-red-800 border border-red-200'
                    }`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.lastLoginAt ? (
                      new Date(user.lastLoginAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    ) : (
                      <span className="text-gray-400">Never</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setViewUser(user)}
                        className="text-gray-500 hover:text-gray-900 inline-flex items-center gap-1 hover:bg-gray-100 px-2 py-1 rounded"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(user.id)}
                        disabled={togglingStatus === user.id}
                        className={cn(
                          "inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 transition-colors",
                          togglingStatus === user.id ? "opacity-50 cursor-not-allowed" : "",
                          user.status === 'ACTIVE' ? "text-orange-600 hover:bg-orange-50" : "text-green-600 hover:bg-green-50"
                        )}
                        title={user.status === 'ACTIVE' ? 'Deactivate user' : 'Activate user'}
                      >
                        {user.status === 'ACTIVE' ? (
                          <PowerOff className="w-4 h-4" />
                        ) : (
                          <Power className="w-4 h-4" />
                        )}
                      </button>
                      <Link
                        href={`/admin/users/${user.id}`}
                        className="text-primary-600 hover:text-primary-900 inline-flex items-center gap-1 hover:bg-primary-50 px-2 py-1 rounded"
                      >
                        <Edit2 className="w-4 h-4" /> Edit
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No users found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* View User Modal */}
      <UserDetailModal 
        user={viewUser} 
        isOpen={!!viewUser} 
        onClose={() => setViewUser(null)} 
      />
    </div>
  )
}
