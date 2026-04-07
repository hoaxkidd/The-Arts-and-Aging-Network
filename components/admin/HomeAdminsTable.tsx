'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Search, X, Power, PowerOff, Building2, UserRound, Mail, Phone, Clipboard } from 'lucide-react'
import type { GeriatricHome, User } from '@prisma/client'
import { useRouter } from 'next/navigation'
import { toggleUserStatus } from '@/app/actions/user-management'
import { STYLES } from '@/lib/styles'
import { cn } from '@/lib/utils'

type HomeAdminUser = User & {
  geriatricHome?: GeriatricHome | null
}

function getDisplayHomeAdminName(user: HomeAdminUser): string {
  if (user.geriatricHome?.contactName?.trim()) return user.geriatricHome.contactName.trim()
  const raw = (user.name || 'Unnamed Home Admin').trim()
  return raw.replace(/\s+Home Admin$/i, '')
}

export default function HomeAdminsTable({ users }: { users: HomeAdminUser[] }) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [togglingStatus, setTogglingStatus] = useState<string | null>(null)
  const [contactUser, setContactUser] = useState<HomeAdminUser | null>(null)
  const [copiedField, setCopiedField] = useState<'email' | 'phone' | null>(null)

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        searchQuery === '' ||
        user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
        (user.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
        (user.userCode?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
        (user.geriatricHome?.name.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
        (user.geriatricHome?.contactEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
        (user.geriatricHome?.contactPhone?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)

      const matchesStatus = statusFilter === 'ALL' || user.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [users, searchQuery, statusFilter])

  const clearFilters = () => {
    setSearchQuery('')
    setStatusFilter('ALL')
  }

  const hasActiveFilters = searchQuery !== '' || statusFilter !== 'ALL'

  const handleToggleStatus = async (userId: string) => {
    setTogglingStatus(userId)
    const result = await toggleUserStatus(userId)
    if (result.success) {
      router.refresh()
    }
    setTogglingStatus(null)
  }

  const copyText = async (value: string | null | undefined, field: 'email' | 'phone') => {
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
      setCopiedField(field)
      setTimeout(() => setCopiedField((prev) => (prev === field ? null : prev)), 1500)
    } catch {
      setCopiedField(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="search"
            placeholder="Search by name, email, phone, ID, or facility..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(STYLES.input, 'pl-10')}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={cn(STYLES.input, STYLES.select, 'w-full sm:w-48')}
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
            className="inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
            Clear
          </button>
        )}
      </div>

      <div className="text-sm text-gray-600">
        Showing {filteredUsers.length} of {users.length} home admins
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="table-scroll-wrapper max-h-[calc(100vh-320px)]">
          <table className={STYLES.table}>
            <thead className="bg-gray-50">
              <tr className={STYLES.tableHeadRow}>
                <th className={STYLES.tableHeader}>Home Admin</th>
                <th className={STYLES.tableHeader}>Facility</th>
                <th className={STYLES.tableHeader}>Contact</th>
                <th className={STYLES.tableHeader}>Status</th>
                <th className={cn(STYLES.tableHeader, 'text-right')}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredUsers.map((user) => (
                <tr key={user.id} className={STYLES.tableRow}>
                  <td className={STYLES.tableCell}>
                    <div className="space-y-0.5">
                      <div className="font-medium text-gray-900">{getDisplayHomeAdminName(user)}</div>
                      <div className="text-xs text-gray-500 font-mono">{user.userCode || user.id}</div>
                    </div>
                  </td>
                  <td className={STYLES.tableCell}>
                    {user.geriatricHome ? (
                      <Link
                        href={`/admin/homes/${user.geriatricHome.id}`}
                        className="inline-flex items-center gap-1.5 text-primary-700 hover:text-primary-900 hover:underline"
                      >
                        <Building2 className="w-4 h-4" />
                        <span className="truncate max-w-[220px]">{user.geriatricHome.name}</span>
                      </Link>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded bg-amber-50 text-amber-700 border border-amber-200">
                        <UserRound className="w-3.5 h-3.5" />
                        No linked home
                      </span>
                    )}
                  </td>
                  <td className={STYLES.tableCell}>
                    <button
                      type="button"
                      onClick={() => {
                        setContactUser(user)
                        setCopiedField(null)
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      View Contact
                    </button>
                  </td>
                  <td className={STYLES.tableCell}>
                    <span className={`px-2 py-0.5 inline-flex text-xs font-semibold rounded ${
                      user.status === 'ACTIVE'
                        ? 'bg-green-100 text-green-700'
                        : user.status === 'PENDING'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                    }`}>
                      {user.status}
                    </span>
                  </td>
                  <td className={cn(STYLES.tableCell, 'text-right whitespace-nowrap')}>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleToggleStatus(user.id)}
                        disabled={togglingStatus === user.id || user.status === 'PENDING'}
                        className={cn(
                          'inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 transition-colors',
                          togglingStatus === user.id ? 'opacity-50 cursor-not-allowed' : '',
                          user.status === 'PENDING' ? 'opacity-50 cursor-not-allowed' : '',
                          user.status === 'ACTIVE' ? 'text-orange-600 hover:bg-orange-50' : 'text-green-600 hover:bg-green-50'
                        )}
                        title={user.status === 'PENDING' ? 'Send invitation to activate' : user.status === 'ACTIVE' ? 'Deactivate user' : 'Activate user'}
                      >
                        {user.status === 'ACTIVE' ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                      </button>
                      <Link
                        href={`/admin/users/${user.userCode || user.id}`}
                        className="text-primary-600 hover:text-primary-900 inline-flex items-center gap-1 hover:bg-primary-50 px-2 py-1 rounded"
                      >
                        Manage
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className={cn(STYLES.tableCell, 'text-center py-12')}>
                    No home admin accounts found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {contactUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setContactUser(null)} />
          <div className="relative w-full max-w-md rounded-xl border border-gray-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <h3 className="text-sm font-semibold text-gray-900">Contact Details</h3>
              <button
                type="button"
                onClick={() => setContactUser(null)}
                className="rounded p-1 text-gray-500 hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div className="grid grid-cols-1 gap-2">
                <div className="rounded-lg border border-gray-200 px-3 py-2">
                  <p className="text-xs text-gray-500">Home Admin Name</p>
                  <p className="text-sm font-medium text-gray-900">{getDisplayHomeAdminName(contactUser)}</p>
                </div>
                <div className="rounded-lg border border-gray-200 px-3 py-2">
                  <p className="text-xs text-gray-500">Facility Name</p>
                  <p className="text-sm font-medium text-gray-900">{contactUser.geriatricHome?.name || 'No linked facility'}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500">Admin Phone</p>
                    <p className="text-sm text-gray-800 truncate">{contactUser.phone || 'No admin phone'}</p>
                  </div>
                  <button
                    type="button"
                    disabled={!contactUser.phone}
                    onClick={() => copyText(contactUser.phone, 'phone')}
                    className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <Clipboard className="w-3.5 h-3.5" />
                    {copiedField === 'phone' ? 'Copied' : 'Copy'}
                  </button>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500">Admin Email</p>
                    <p className="text-sm text-gray-800 truncate">{contactUser.email || 'No admin email'}</p>
                  </div>
                  <button
                    type="button"
                    disabled={!contactUser.email}
                    onClick={() => copyText(contactUser.email, 'email')}
                    className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    {copiedField === 'email' ? 'Copied' : 'Copy'}
                  </button>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500">Facility Phone</p>
                    <p className="text-sm text-gray-800 truncate">{contactUser.geriatricHome?.contactPhone || 'No facility phone'}</p>
                  </div>
                  <button
                    type="button"
                    disabled={!contactUser.geriatricHome?.contactPhone}
                    onClick={() => copyText(contactUser.geriatricHome?.contactPhone || '', 'phone')}
                    className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    {copiedField === 'phone' ? 'Copied' : 'Copy'}
                  </button>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500">Facility Email</p>
                    <p className="text-sm text-gray-800 truncate">{contactUser.geriatricHome?.contactEmail || 'No facility email'}</p>
                  </div>
                  <button
                    type="button"
                    disabled={!contactUser.geriatricHome?.contactEmail}
                    onClick={() => copyText(contactUser.geriatricHome?.contactEmail || '', 'email')}
                    className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    {copiedField === 'email' ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  )
}
