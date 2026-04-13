'use client'

import { useState, useEffect } from 'react'
import { useFormState } from 'react-dom'
import {
  Bell,
  User,
  Shield,
  Palette,
  Save,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Smartphone,
  Sun,
  Moon,
  Monitor,
  Mail,
  FileSearch,
  Clock,
  Home,
  Users,
  XCircle,
  ExternalLink,
} from 'lucide-react'
import Link from 'next/link'
import { NotificationPreferences } from '@/components/notifications/NotificationPreferences'
import { cn } from '@/lib/utils'
import { STYLES } from '@/lib/styles'
import { updateStaffProfile } from '@/app/actions/staff'
import { changePassword } from '@/app/actions/user'

type SettingsTab = 'notifications' | 'profile' | 'security' | 'appearance'

type SettingsPageProps = {
  userEmail: string
  initialPhone?: string | null
  notificationPreferences: {
    email: boolean
    sms: boolean
    inApp: boolean
  }
  adminNotificationData?: {
    auditLogs: {
      id: string
      action: string
      userName: string
      details: string | null
      createdAt: string
    }[]
    emailReminders: {
      id: string
      eventTitle: string
      homeName: string | null
      recipientName: string
      recipientType: string
      reminderType: string
      status: string
      scheduledFor: string
      sentAt: string | null
      error: string | null
    }[]
  }
}

function profileReducer(
  _prev: { success?: boolean; error?: string },
  formData: FormData
): Promise<{ success?: boolean; error?: string }> {
  return updateStaffProfile(formData).then((r) =>
    r?.error ? { error: r.error } : { success: true }
  )
}

function passwordReducer(
  _prev: { success?: boolean; error?: string },
  formData: FormData
): Promise<{ success?: boolean; error?: string }> {
  return changePassword(formData).then((r) =>
    r?.error ? { error: r.error } : { success: true }
  )
}

const THEME_KEY = 'app-theme'
const COMPACT_KEY = 'app-compact'

export function SettingsPage({
  userEmail,
  initialPhone = '',
  notificationPreferences,
  adminNotificationData,
}: SettingsPageProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('notifications')
  const [notificationTab, setNotificationTab] = useState<'preferences' | 'reminders' | 'audit'>('preferences')
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system')
  const [compact, setCompact] = useState(false)

  const [profileState, profileAction] = useFormState(profileReducer, {})
  const [passwordState, passwordAction] = useFormState(passwordReducer, {})

  const [reminderStatusFilter, setReminderStatusFilter] = useState('ALL')
  const [reminderTypeFilter, setReminderTypeFilter] = useState('ALL')

  useEffect(() => {
    if (typeof window === 'undefined') return
    const t = (localStorage.getItem(THEME_KEY) as 'light' | 'dark' | 'system') || 'system'
    const c = localStorage.getItem(COMPACT_KEY) === 'true'
    setTheme(t)
    setCompact(c)
    document.body.classList.toggle('compact-mode', c)
  }, [])

  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('light', 'dark')
    if (theme === 'system') {
      const q = window.matchMedia('(prefers-color-scheme: dark)')
      root.classList.add(q.matches ? 'dark' : 'light')
    } else {
      root.classList.add(theme)
    }
  }, [theme])

  const handleThemeChange = (value: 'light' | 'dark' | 'system') => {
    setTheme(value)
    localStorage.setItem(THEME_KEY, value)
  }

  const handleCompactChange = (value: boolean) => {
    setCompact(value)
    localStorage.setItem(COMPACT_KEY, value ? 'true' : 'false')
    document.body.classList.toggle('compact-mode', value)
  }

  const tabs: { id: SettingsTab; label: string; icon: typeof Bell }[] = [
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'profile', label: 'Contact', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'appearance', label: 'Appearance', icon: Palette },
  ]

  const reminderStats = adminNotificationData
    ? {
        total: adminNotificationData.emailReminders.length,
        pending: adminNotificationData.emailReminders.filter((r) => r.status === 'PENDING').length,
        sent: adminNotificationData.emailReminders.filter((r) => r.status === 'SENT').length,
        failed: adminNotificationData.emailReminders.filter((r) => r.status === 'FAILED').length,
      }
    : null

  const formatAction = (action: string) =>
    action
      .split('_')
      .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
      .join(' ')

  const formatAuditDetails = (details: string | null): string => {
    if (!details) return '-'
    try {
      const parsed = JSON.parse(details)
      const { name, title, email, eventId, updates } = parsed as Record<string, unknown>
      if (updates && typeof updates === 'object') {
        const keys = Object.keys(updates)
        if (keys.length === 1) return `Changed ${keys[0]}`
        if (keys.length === 2) return `Changed ${keys[0]} and ${keys[1]}`
        return `Changed ${keys.slice(0, 2).join(', ')} and ${keys.length - 2} more`
      }
      if (typeof name === 'string') return name
      if (typeof title === 'string') return title
      if (typeof email === 'string') return email
      if (typeof eventId === 'string') return 'Booking action'
      return '-'
    } catch {
      return details.length > 50 ? details.slice(0, 50) + '...' : details
    }
  }

  const filteredReminders = adminNotificationData
    ? adminNotificationData.emailReminders
        .filter(r => reminderStatusFilter === 'ALL' || r.status === reminderStatusFilter)
        .filter(r => reminderTypeFilter === 'ALL' || r.recipientType === reminderTypeFilter)
    : []

  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 border-b border-gray-200 -mb-px">
        <nav className="flex gap-1" aria-label="Settings sections">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                aria-selected={activeTab === tab.id}
                aria-controls={`panel-${tab.id}`}
                id={`tab-${tab.id}`}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      <div className="flex-1 min-h-0 overflow-auto pt-4">
        {activeTab === 'notifications' && (
          <section
            id="panel-notifications"
            aria-labelledby="tab-notifications"
            className="space-y-4"
          >
            {/* Sub-tab navigation */}
            <div className="border-b border-gray-200">
              <div className="flex items-center gap-4 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setNotificationTab('preferences')}
                  className={cn(
                    'py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
                    notificationTab === 'preferences'
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  )}
                >
                  Preferences
                </button>
                {adminNotificationData && (
                  <>
                    <button
                      type="button"
                      onClick={() => setNotificationTab('reminders')}
                      className={cn(
                        'py-2 text-sm font-medium border-b-2 -mb-px transition-colors inline-flex items-center gap-2 whitespace-nowrap',
                        notificationTab === 'reminders'
                          ? 'border-primary-500 text-primary-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      )}
                    >
                      <Mail className="w-4 h-4" /> Email Reminders
                    </button>
                    <button
                      type="button"
                      onClick={() => setNotificationTab('audit')}
                      className={cn(
                        'py-2 text-sm font-medium border-b-2 -mb-px transition-colors inline-flex items-center gap-2 whitespace-nowrap',
                        notificationTab === 'audit'
                          ? 'border-primary-500 text-primary-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      )}
                    >
                      <FileSearch className="w-4 h-4" /> Audit Log
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Preferences Tab */}
            {notificationTab === 'preferences' && (
              <div className="max-w-2xl">
                <NotificationPreferences initialPreferences={notificationPreferences} />
              </div>
            )}

            {/* Email Reminders Tab */}
            {notificationTab === 'reminders' && adminNotificationData && reminderStats && (
              <div className="space-y-4">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-white rounded-lg border border-gray-200 p-3">
                    <p className="text-xs text-gray-500">Total</p>
                    <p className="text-lg font-bold text-gray-900">{reminderStats.total}</p>
                  </div>
                  <div className="bg-white rounded-lg border border-yellow-200 p-3">
                    <p className="text-xs text-yellow-700">Pending</p>
                    <p className="text-lg font-bold text-yellow-700">{reminderStats.pending}</p>
                  </div>
                  <div className="bg-white rounded-lg border border-green-200 p-3">
                    <p className="text-xs text-green-700">Sent</p>
                    <p className="text-lg font-bold text-green-700">{reminderStats.sent}</p>
                  </div>
                  <div className="bg-white rounded-lg border border-red-200 p-3">
                    <p className="text-xs text-red-700">Failed</p>
                    <p className="text-lg font-bold text-red-700">{reminderStats.failed}</p>
                  </div>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-lg border border-gray-200 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={reminderStatusFilter}
                      onChange={(e) => setReminderStatusFilter(e.target.value)}
                      className="text-sm border border-gray-300 rounded-md px-2 py-1.5"
                    >
                      <option value="ALL">All Status</option>
                      <option value="PENDING">Pending</option>
                      <option value="SENT">Sent</option>
                      <option value="FAILED">Failed</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                    <select
                      value={reminderTypeFilter}
                      onChange={(e) => setReminderTypeFilter(e.target.value)}
                      className="text-sm border border-gray-300 rounded-md px-2 py-1.5"
                    >
                      <option value="ALL">All Types</option>
                      <option value="HOME_ADMIN">Home Admin</option>
                      <option value="STAFF">Staff</option>
                    </select>
                  </div>
                  <Link href="/admin/email-reminders" className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700">
                    <ExternalLink className="w-3.5 h-3.5" /> Open Full Page
                  </Link>
                </div>

                {/* Table */}
                <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                  <div className="table-scroll-wrapper max-h-[calc(100vh-400px)]">
                    <table className={STYLES.table}>
                      <thead className="bg-gray-50">
                        <tr className={STYLES.tableHeadRow}>
                          <th className={STYLES.tableHeader}>Booking</th>
                          <th className={STYLES.tableHeader}>Recipient</th>
                          <th className={STYLES.tableHeader}>Type</th>
                          <th className={STYLES.tableHeader}>Timing</th>
                          <th className={STYLES.tableHeader}>Scheduled</th>
                          <th className={STYLES.tableHeader}>Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredReminders.map((row) => (
                          <tr key={row.id} className={STYLES.tableRow}>
                            <td className={STYLES.tableCell}>
                              <p className="font-medium text-gray-900">{row.eventTitle}</p>
                              {row.homeName && <p className="text-xs text-gray-500 flex items-center gap-1"><Home className="w-3 h-3" />{row.homeName}</p>}
                            </td>
                            <td className={STYLES.tableCell}>
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-medium shrink-0">
                                  {row.recipientName.charAt(0) || '?'}
                                </div>
                                <span className="text-sm text-gray-900 truncate max-w-[100px]">{row.recipientName}</span>
                              </div>
                            </td>
                            <td className={STYLES.tableCell}>
                              <span className={cn(
                                "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium",
                                row.recipientType === 'HOME_ADMIN' ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                              )}>
                                {row.recipientType === 'HOME_ADMIN' ? <><Home className="w-3 h-3" />Home Admin</> : <><Users className="w-3 h-3" />Staff</>}
                              </span>
                            </td>
                            <td className={STYLES.tableCell}>
                              <span className="text-sm text-gray-600">{row.reminderType.replaceAll('_', ' ')}</span>
                            </td>
                            <td className={STYLES.tableCell}>
                              <span className="text-sm text-gray-900">{new Date(row.scheduledFor).toLocaleDateString()}</span>
                              <span className="text-xs text-gray-500 block">{new Date(row.scheduledFor).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                            </td>
                            <td className={STYLES.tableCell}>
                              <span className={cn(
                                "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium",
                                row.status === 'SENT' && "bg-green-100 text-green-700",
                                row.status === 'PENDING' && "bg-yellow-100 text-yellow-700",
                                row.status === 'FAILED' && "bg-red-100 text-red-700",
                                row.status === 'CANCELLED' && "bg-gray-100 text-gray-700"
                              )}>
                                {row.status === 'SENT' && <CheckCircle2 className="w-3 h-3" />}
                                {row.status === 'PENDING' && <Clock className="w-3 h-3" />}
                                {row.status === 'FAILED' && <XCircle className="w-3 h-3" />}
                                {row.status}
                              </span>
                              {row.error && <p className="text-xs text-red-500 mt-1 max-w-[150px] truncate" title={row.error}>{row.error}</p>}
                            </td>
                          </tr>
                        ))}
                        {filteredReminders.length === 0 && (
                          <tr>
                            <td colSpan={6} className={cn(STYLES.tableCell, "text-center py-12")}>No reminders match your filters</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Audit Log Tab */}
            {notificationTab === 'audit' && adminNotificationData && (
              <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                <div className="flex items-center justify-between p-3 bg-gray-50 border-b border-gray-200">
                  <p className="text-sm font-medium text-gray-700">Recent Activity</p>
                  <Link href="/admin/audit-log" className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700">
                    <ExternalLink className="w-3.5 h-3.5" /> Open Full Page
                  </Link>
                </div>
                <div className="table-scroll-wrapper max-h-[calc(100vh-340px)]">
                  <table className={STYLES.table}>
                    <thead className="bg-gray-50">
                      <tr className={STYLES.tableHeadRow}>
                        <th className={STYLES.tableHeader}>Action</th>
                        <th className={STYLES.tableHeader}>User</th>
                        <th className={STYLES.tableHeader}>Details</th>
                        <th className={STYLES.tableHeader}>Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {adminNotificationData.auditLogs.map((row) => (
                        <tr key={row.id} className={STYLES.tableRow}>
                          <td className={cn(STYLES.tableCell, 'font-medium text-gray-900')}>{formatAction(row.action)}</td>
                          <td className={STYLES.tableCell}>{row.userName}</td>
                          <td className={cn(STYLES.tableCell, 'max-w-[300px] truncate')} title={formatAuditDetails(row.details)}>{formatAuditDetails(row.details)}</td>
                          <td className={STYLES.tableCell}>
                            <span className="inline-flex items-center gap-1 text-gray-600">
                              <Clock className="w-3 h-3 shrink-0" /> {new Date(row.createdAt).toLocaleString()}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        )}

        {activeTab === 'profile' && (
          <section
            id="panel-profile"
            aria-labelledby="tab-profile"
            className="max-w-2xl"
          >
            <form action={profileAction} className="border border-gray-200 rounded-lg p-6 space-y-5">
              <h2 className="text-sm font-semibold text-gray-900">Contact information</h2>
              <p className="text-xs text-gray-500">
                Update your phone. Name and role are managed in your profile.
              </p>
              <div>
                <label htmlFor="profile-email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  id="profile-email"
                  type="email"
                  defaultValue={userEmail}
                  disabled
                  className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-600"
                />
                <p className="text-xs text-gray-500 mt-1">Contact an administrator to change your email.</p>
              </div>
              <div>
                <label htmlFor="profile-phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  id="profile-phone"
                  name="phone"
                  type="tel"
                  defaultValue={initialPhone ?? ''}
                  placeholder="+1 (555) 000-0000"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              {profileState?.success && (
                <p className="text-sm text-green-600 flex items-center gap-2" role="status">
                  <CheckCircle2 className="w-4 h-4" /> Saved.
                </p>
              )}
              {profileState?.error && (
                <p className="text-sm text-red-600 flex items-center gap-2" role="alert">
                  <AlertCircle className="w-4 h-4" /> {profileState.error}
                </p>
              )}
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-primary-500 text-white hover:bg-primary-600 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              >
                <Save className="w-4 h-4" /> Save
              </button>
            </form>
          </section>
        )}

        {activeTab === 'security' && (
          <section
            id="panel-security"
            aria-labelledby="tab-security"
            className="max-w-2xl space-y-6"
          >
            <div className="border border-gray-200 rounded-lg p-6 space-y-5">
              <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <KeyRound className="w-4 h-4" /> Change password
              </h2>
              <form action={passwordAction} className="space-y-4">
                <div>
                  <label htmlFor="current-password" className="block text-sm font-medium text-gray-700 mb-1">
                    Current password
                  </label>
                  <input
                    id="current-password"
                    name="currentPassword"
                    type="password"
                    autoComplete="current-password"
                    required
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-1">
                    New password
                  </label>
                  <input
                    id="new-password"
                    name="newPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">At least 8 characters.</p>
                </div>
                <div>
                  <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm new password
                  </label>
                  <input
                    id="confirm-password"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                {passwordState?.success && (
                  <p className="text-sm text-green-600 flex items-center gap-2" role="status">
                    <CheckCircle2 className="w-4 h-4" /> Password updated.
                  </p>
                )}
                {passwordState?.error && (
                  <p className="text-sm text-red-600 flex items-center gap-2" role="alert">
                    <AlertCircle className="w-4 h-4" /> {passwordState.error}
                  </p>
                )}
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-primary-500 text-white hover:bg-primary-600 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                >
                  Update password
                </button>
              </form>
            </div>

            <div className="border border-gray-200 rounded-lg p-6">
              <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-2">
                <Smartphone className="w-4 h-4" /> Two-factor authentication
              </h2>
              <p className="text-sm text-gray-500 mb-3">
                Add an extra layer of security to your account.
              </p>
              <span className="inline-flex items-center text-xs font-medium text-amber-700">
                Not enabled
              </span>
            </div>
          </section>
        )}

        {activeTab === 'appearance' && (
          <section
            id="panel-appearance"
            aria-labelledby="tab-appearance"
            className="max-w-2xl"
          >
            <div className="border border-gray-200 rounded-lg p-6 space-y-6">
              <h2 className="text-sm font-semibold text-gray-900">Display preferences</h2>

              <div className="flex flex-wrap items-center justify-between gap-4 py-3 border-b border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-900">Theme</p>
                  <p className="text-xs text-gray-500">Light, dark, or follow system</p>
                </div>
                <div className="flex rounded-lg border border-gray-200 p-1 bg-gray-50">
                  {[
                    { value: 'light' as const, label: 'Light', icon: Sun },
                    { value: 'dark' as const, label: 'Dark', icon: Moon },
                    { value: 'system' as const, label: 'System', icon: Monitor },
                  ].map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => handleThemeChange(value)}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                        theme === value
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">Compact mode</p>
                  <p className="text-xs text-gray-500">Tighter spacing in the app</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={compact}
                  onClick={() => handleCompactChange(!compact)}
                  className={cn(
                    'relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
                    compact ? 'bg-primary-500' : 'bg-gray-200'
                  )}
                >
                  <span
                    className={cn(
                      'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition',
                      compact ? 'translate-x-5' : 'translate-x-0.5'
                    )}
                  />
                </button>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
