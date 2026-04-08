'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { MoreVertical, Search, X, Eye, ArrowUpDown, ArrowUp, ArrowDown, ShieldAlert, Trash2, Pencil, Power, PowerOff } from 'lucide-react'
import { STYLES } from '@/lib/styles'
import { cn } from '@/lib/utils'
import { deleteUser, kickUser, setUserStatus, toggleUserStatus } from '@/app/actions/user-management'
import { useRouter } from 'next/navigation'
import type { User, GeriatricHome, UserRoleAssignment } from '@prisma/client'
import { UserDetailModal } from './UserDetailModal'
import { ROLE_LABELS } from '@/lib/roles'

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
  roleAssignments?: UserRoleAssignment[]
}

function getUserRoles(user: UserWithCounts): string[] {
  if (user.roleAssignments && user.roleAssignments.length > 0) {
    return user.roleAssignments.map((assignment) => assignment.role)
  }
  return [user.role]
}

type SortField = 'name' | 'userCode' | 'role' | 'status' | 'lastLoginAt'
type SortDirection = 'asc' | 'desc'

type ConfirmModalState =
  | { kind: 'delete'; user: UserWithCounts }
  | { kind: 'kick'; user: UserWithCounts }
  | null

export default function UsersTable({ users: initialUsers }: { users: UserWithCounts[] }) {
  const [users, setUsers] = useState(initialUsers)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('ALL')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [togglingStatus, setTogglingStatus] = useState<string | null>(null)
  const [viewUser, setViewUser] = useState<UserWithCounts | null>(null)
  const [viewUserInitialTab, setViewUserInitialTab] = useState<string | undefined>(undefined)
  const [openMenuUserId, setOpenMenuUserId] = useState<string | null>(null)
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>(null)
  const [confirmText, setConfirmText] = useState('')
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const [isConfirmSubmitting, setIsConfirmSubmitting] = useState(false)
  const router = useRouter()
  const menuContainerRef = useRef<HTMLDivElement | null>(null)

  const filteredUsers = useMemo(() => {
    const result = users.filter(user => {
      const matchesSearch = searchQuery === '' ||
        user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
        (user.userCode?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)

      const matchesRole = roleFilter === 'ALL' || getUserRoles(user).includes(roleFilter)
      const matchesStatus = statusFilter === 'ALL' || user.status === statusFilter

      return matchesSearch && matchesRole && matchesStatus
    })

    result.sort((a, b) => {
      let comparison = 0
      
      switch (sortField) {
        case 'name':
          comparison = (a.name || '').localeCompare(b.name || '')
          break
        case 'role':
          comparison = (getUserRoles(a)[0] || '').localeCompare(getUserRoles(b)[0] || '')
          break
        case 'userCode':
          comparison = (a.userCode || '').localeCompare(b.userCode || '')
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

  const roles = useMemo(() => {
    const uniqueRoles = Array.from(new Set(users.flatMap((user) => getUserRoles(user))))
    return uniqueRoles.sort()
  }, [users])

  const handleToggleStatus = async (userId: string) => {
    setTogglingStatus(userId)
    const result = await toggleUserStatus(userId)

    if (result.success && result.user) {
      setUsers(prev => prev.map(u => u.id === userId ? result.user! : u))
      router.refresh()
    }

    setTogglingStatus(null)
  }

  useEffect(() => {
    if (!openMenuUserId) return

    const onPointerDown = (event: MouseEvent | PointerEvent) => {
      const el = menuContainerRef.current
      if (!el) return
      if (event.target instanceof Node && el.contains(event.target)) return
      setOpenMenuUserId(null)
    }

    window.addEventListener('pointerdown', onPointerDown, { capture: true })
    return () => window.removeEventListener('pointerdown', onPointerDown, { capture: true } as any)
  }, [openMenuUserId])

  const openUserModal = (user: UserWithCounts, initialTab?: string) => {
    setViewUserInitialTab(initialTab)
    setViewUser(user)
    setOpenMenuUserId(null)
  }

  const StatusBadge = ({ status }: { status: string }) => {
    const badgeClass =
      status === 'ACTIVE'
        ? STYLES.badgeSuccess
        : status === 'PENDING'
          ? STYLES.badgeWarning
          : status === 'SUSPENDED'
            ? STYLES.badgeDanger
            : STYLES.badgeNeutral
    return <span className={cn(STYLES.badge, badgeClass)}>{status}</span>
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
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            id="search-users"
            name="searchUsers"
            type="search"
            placeholder="Search by name, email, or user ID..."
            aria-label="Search users by name, email, or user ID"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(STYLES.input, "pl-10")}
          />
        </div>

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

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className={cn(STYLES.btn, STYLES.btnSecondary, STYLES.btnToolbar)}
          >
            <X className="w-4 h-4" />
            Clear
          </button>
        )}
      </div>

      <div className="text-sm text-gray-600">
        Showing {filteredUsers.length} of {users.length} users
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="table-scroll-wrapper max-h-[calc(100vh-320px)]">
          <table className={STYLES.table}>
            <thead className="bg-gray-50">
              <tr className={STYLES.tableHeadRow}>
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
                    onClick={() => handleSort('userCode')}
                    className="flex items-center hover:text-primary-600"
                  >
                    User ID
                    <SortIcon field="userCode" />
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
            <tbody className="divide-y divide-gray-100">
              {filteredUsers.map((user) => (
                <tr key={user.id} className={STYLES.tableRow}>
                  <td className={cn(STYLES.tableCell, "whitespace-nowrap")}>
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
                  <td className={cn(STYLES.tableCell, "whitespace-nowrap")}>
                    {user.userCode ? (
                      <span className="font-mono text-xs font-semibold text-primary-700 bg-primary-50 border border-primary-100 rounded px-2 py-1">
                        {user.userCode}
                      </span>
                    ) : (
                      <span className="font-mono text-xs font-semibold text-red-700 bg-red-50 border border-red-100 rounded px-2 py-1">
                        MISSING-ID
                      </span>
                    )}
                  </td>
                  <td className={cn(STYLES.tableCell, "whitespace-nowrap")}>
                    <div className="flex flex-wrap gap-1">
                      {getUserRoles(user).map((role) => (
                        <span key={`${user.id}-${role}`} className={cn(STYLES.badge, STYLES.badgeNeutral, "py-0.5 px-2")}>
                          {ROLE_LABELS[role as keyof typeof ROLE_LABELS] || role}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className={cn(STYLES.tableCell, "whitespace-nowrap")}>
                    <StatusBadge status={user.status} />
                  </td>
                  <td className={cn(STYLES.tableCell, "whitespace-nowrap")}>
                    {user.lastLoginAt ? (
                      <span className="text-sm text-gray-500">{formatDateTime(user.lastLoginAt)}</span>
                    ) : (
                      <span className="text-sm text-gray-400">Never</span>
                    )}
                  </td>
                  <td className={cn(STYLES.tableCell, "text-right whitespace-nowrap")}>
                    <div className="flex items-center justify-end gap-2" ref={openMenuUserId === user.id ? menuContainerRef : undefined}>
                      <button
                        type="button"
                        onClick={() => openUserModal(user, 'overview')}
                        className={cn(STYLES.btnIcon, "h-9 w-9 inline-flex items-center justify-center")}
                        title="Quick view"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setOpenMenuUserId((prev) => (prev === user.id ? null : user.id))}
                          className={cn(STYLES.btnIcon, "h-9 w-9 inline-flex items-center justify-center")}
                          aria-haspopup="menu"
                          aria-expanded={openMenuUserId === user.id}
                          title="Actions"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {openMenuUserId === user.id && (
                          <div
                            role="menu"
                            aria-label="User actions"
                            className="absolute right-0 mt-2 w-56 rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden z-20"
                          >
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => openUserModal(user, 'overview')}
                              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                              <Eye className="w-4 h-4 text-gray-500" />
                              Quick view
                            </button>

                            <Link
                              href={`/admin/users/${user.userCode || user.id}`}
                              role="menuitem"
                              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                              onClick={() => setOpenMenuUserId(null)}
                            >
                              <Pencil className="w-4 h-4 text-gray-500" />
                              Edit details
                            </Link>

                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => openUserModal(user, 'roles')}
                              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                              <Pencil className="w-4 h-4 text-gray-500" />
                              Edit roles
                            </button>

                            <div className="h-px bg-gray-100" />

                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => handleToggleStatus(user.id)}
                              disabled={togglingStatus === user.id || user.status === 'PENDING'}
                              className={cn(
                                "w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2",
                                (togglingStatus === user.id || user.status === 'PENDING') ? "opacity-50 cursor-not-allowed text-gray-500" : "text-gray-700"
                              )}
                            >
                              {user.status === 'ACTIVE' ? (
                                <>
                                  <PowerOff className="w-4 h-4 text-orange-600" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <Power className="w-4 h-4 text-green-600" />
                                  Activate
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => {
                                setConfirmError(null)
                                setConfirmText('')
                                setConfirmModal({ kind: 'kick', user })
                                setOpenMenuUserId(null)
                              }}
                              disabled={togglingStatus === user.id || user.status === 'PENDING'}
                              className={cn(
                                "w-full text-left px-3 py-2 text-sm hover:bg-red-50 flex items-center gap-2",
                                (togglingStatus === user.id || user.status === 'PENDING') ? "opacity-50 cursor-not-allowed text-gray-500" : "text-red-700"
                              )}
                            >
                              <ShieldAlert className="w-4 h-4" />
                              Kick (suspend)
                            </button>

                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => {
                                setConfirmError(null)
                                setConfirmText('')
                                setConfirmModal({ kind: 'delete', user })
                                setOpenMenuUserId(null)
                              }}
                              className="w-full text-left px-3 py-2 text-sm text-red-700 hover:bg-red-50 flex items-center gap-2"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete permanently
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className={cn(STYLES.tableCell, "text-center py-12")}>
                    No users found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <UserDetailModal 
        user={viewUser}
        initialTab={viewUserInitialTab}
        isOpen={!!viewUser}
        onClose={() => {
          setViewUser(null)
          setViewUserInitialTab(undefined)
        }}
        onUserUpdated={(updated) => {
          setUsers(prev => prev.map(u => u.id === updated.id ? ({ ...u, ...updated } as any) : u))
          router.refresh()
        }}
        onUserDeleted={(userId) => {
          setUsers(prev => prev.filter(u => u.id !== userId))
          router.refresh()
        }}
      />

      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">
                    {confirmModal.kind === 'delete' ? 'Delete user' : 'Kick user'}
                  </h3>
                  <p className="text-sm text-gray-600 mt-0.5">
                    {confirmModal.user.name || confirmModal.user.email || 'Unknown user'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (isConfirmSubmitting) return
                    setConfirmModal(null)
                  }}
                  className={cn(STYLES.btnIcon, "h-9 w-9")}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {confirmModal.kind === 'kick' ? (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-sm text-amber-900 font-semibold">This will suspend the account.</p>
                  <p className="text-xs text-amber-800 mt-1">
                    New sign-ins will be blocked immediately. Because sessions are JWT-based, existing sessions may persist until the user refreshes or re-authenticates.
                  </p>
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-900 font-semibold">This action cannot be undone.</p>
                  <p className="text-xs text-red-800 mt-1">Type <span className="font-mono font-bold">DELETE</span> to confirm permanent deletion.</p>
                </div>
              )}

              {confirmModal.kind === 'delete' && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Confirmation</label>
                  <input
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    className={cn(STYLES.input, "font-mono")}
                    placeholder="DELETE"
                    disabled={isConfirmSubmitting}
                    autoFocus
                  />
                </div>
              )}

              {confirmError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
                  {confirmError}
                </div>
              )}
            </div>

            <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 flex gap-3 justify-end">
              <button
                type="button"
                className={cn(STYLES.btn, STYLES.btnSecondary)}
                onClick={() => setConfirmModal(null)}
                disabled={isConfirmSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className={cn(STYLES.btn, confirmModal.kind === 'delete' ? STYLES.btnDanger : STYLES.btnPrimary)}
                disabled={isConfirmSubmitting || (confirmModal.kind === 'delete' && confirmText !== 'DELETE')}
                onClick={async () => {
                  setConfirmError(null)
                  if (confirmModal.kind === 'delete' && confirmText !== 'DELETE') {
                    setConfirmError('Please type DELETE to confirm')
                    return
                  }

                  setIsConfirmSubmitting(true)
                  try {
                    if (confirmModal.kind === 'kick') {
                      const result = await kickUser(confirmModal.user.id)
                      if (result.error || !result.user) {
                        setConfirmError(result.error || 'Failed to kick user')
                        return
                      }
                      setUsers(prev => prev.map(u => u.id === confirmModal.user.id ? ({ ...u, ...result.user! } as any) : u))
                      router.refresh()
                      setConfirmModal(null)
                    } else {
                      const result = await deleteUser(confirmModal.user.id)
                      if (result.error) {
                        setConfirmError(result.error)
                        return
                      }
                      setUsers(prev => prev.filter(u => u.id !== confirmModal.user.id))
                      router.refresh()
                      setConfirmModal(null)
                    }
                  } finally {
                    setIsConfirmSubmitting(false)
                  }
                }}
              >
                {confirmModal.kind === 'delete' ? 'Delete' : 'Kick (suspend)'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
