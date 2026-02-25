'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Edit2, Search, Filter, X, Power, PowerOff, Eye, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { STYLES } from '@/lib/styles'
import { cn } from '@/lib/utils'
import { toggleUserStatus } from '@/app/actions/user-management'
import { useRouter } from 'next/navigation'
import type { User, GeriatricHome } from '@prisma/client'
import { UserDetailModal } from './UserDetailModal'

function formatDateTime(dateValue: string | Date): string {
  const date = new Date(dateValue)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const month = months[date.getUTCMonth()]
  const day = date.getUTCDate()
  const year = date.getUTCFullYear()
  const hours = date.getUTCHours()
  const minutes = date.getUTCMinutes()
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const hour12 = hours % 12 || 12
  const paddedMinutes = minutes.toString().padStart(2, '0')
  return `${month} ${day}, ${year} at ${hour12}:${paddedMinutes} ${ampm}`
}

type UserWithCounts = User & {
  _count?: {
    sentMessages: number
    notifications: number
  }
  geriatricHome?: GeriatricHome | null
}

type SortField = 'name' | 'role' | 'status' | 'lastLoginAt'
type SortDirection = 'asc' | 'desc'

export default function UsersTable({ users: initialUsers }: { users: UserWithCounts[] }) {
  const [users, setUsers] = useState(initialUsers)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('ALL')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [togglingStatus, setTogglingStatus] = useState<string | null>(null)
  const [viewUser, setViewUser] = useState<UserWithCounts | null>(null)
  const router = useRouter()

  // Filter and search users
  const filteredUsers = useMemo(() => {
    let result = users.filter(user => {
      const matchesSearch = searchQuery === '' ||
        user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)

      const matchesRole = roleFilter === 'ALL' || user.role === roleFilter
      const matchesStatus = statusFilter === 'ALL' || user.status === statusFilter

      return matchesSearch && matchesRole && matchesStatus
    })

    // Sort users
    result.sort((a, b) => {
      let comparison = 0
      
      switch (sortField) {
        case 'name':
          comparison = (a.name || '').localeCompare(b.name || '')
          break
        case 'role':
          comparison = a.role.localeCompare(b.role)
          break
        case 'status':
          comparison = a.status.localeCompare(b.status)
          break
        case 'lastLoginAt':
          const dateA = a.lastLoginAt ? new Date(a.lastLoginAt).getTime() : 0
          const dateB = b.lastLoginAt ? new Date(b.lastLoginAt).getTime() : 0
          comparison = dateA - dateB
          break
      }
      
      return sortDirection === 'asc' ? comparison : -comparison
    })

    return result
  }, [users, searchQuery, roleFilter, statusFilter, sortField, sortDirection])

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

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-4 h-4 ml-1 text-gray-400" />
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-4 h-4 ml-1 text-primary-600" />
      : <ArrowDown className="w-4 h-4 ml-1 text-primary-600" />
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            id="search-users"
            name="searchUsers"
            type="search"
            placeholder="Search by name or email..."
            aria-label="Search users by name or email"
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
          <option value="PENDING">Pending signup</option>
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
        <div className={cn("table-scroll-wrapper", "max-h-[calc(100vh-320px)]")}>
          <table className={STYLES.table}>
            <thead className="bg-gray-50">
              <tr>
                <th className={STYLES.tableHeader}>
                  <button 
                    onClick={() => handleSort('name')}
                    className="flex items-center hover:text-primary-600"
                  >
                    User
                    <SortIcon field="name" />
                  </button>
                </th>
                <th className={STYLES.tableHeader}>
                  <button 
                    onClick={() => handleSort('role')}
                    className="flex items-center hover:text-primary-600"
                  >
                    Role
                    <SortIcon field="role" />
                  </button>
                </th>
                <th className={STYLES.tableHeader}>
                  <button 
                    onClick={() => handleSort('status')}
                    className="flex items-center hover:text-primary-600"
                  >
                    Status
                    <SortIcon field="status" />
                  </button>
                </th>
                <th className={STYLES.tableHeader}>
                  <button 
                    onClick={() => handleSort('lastLoginAt')}
                    className="flex items-center hover:text-primary-600"
                  >
                    Last Login
                    <SortIcon field="lastLoginAt" />
                  </button>
                </th>
                <th className={cn(STYLES.tableHeader, "text-right")}>Actions</th>
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
                        <div className="text-sm font-medium text-gray-900">{user.name || '—'}</div>
                        <div className="text-sm text-gray-500">{user.email || 'No email'}</div>
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
                        : user.status === 'PENDING'
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-red-100 text-red-800 border border-red-200'
                    }`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.lastLoginAt ? (
                      formatDateTime(user.lastLoginAt)
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
                        disabled={togglingStatus === user.id || user.status === 'PENDING'}
                        className={cn(
                          "inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 transition-colors",
                          togglingStatus === user.id ? "opacity-50 cursor-not-allowed" : "",
                          user.status === 'PENDING' ? "opacity-50 cursor-not-allowed" : "",
                          user.status === 'ACTIVE' ? "text-orange-600 hover:bg-orange-50" : "text-green-600 hover:bg-green-50"
                        )}
                        title={user.status === 'PENDING' ? 'Send invitation to activate' : user.status === 'ACTIVE' ? 'Deactivate user' : 'Activate user'}
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
