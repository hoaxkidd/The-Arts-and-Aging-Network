'use client'

import { useState, useEffect } from 'react'
import { useFormState } from 'react-dom'
import {
  Settings,
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
} from 'lucide-react'
import { NotificationPreferences } from '@/components/notifications/NotificationPreferences'
import { cn } from '@/lib/utils'
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
}: SettingsPageProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('notifications')
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system')
  const [compact, setCompact] = useState(false)

  const [profileState, profileAction] = useFormState(profileReducer, {})
  const [passwordState, passwordAction] = useFormState(passwordReducer, {})

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

  return (
    <div className="h-full flex flex-col">
      <header className="flex-shrink-0 pb-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-primary-100 text-primary-600 flex items-center justify-center">
            <Settings className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-gray-900">Settings</h1>
            <p className="text-xs text-gray-500">
              Notifications, contact info, password, and display preferences
            </p>
          </div>
        </div>
      </header>

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

      <div className="flex-1 min-h-0 overflow-auto pt-6">
        {activeTab === 'notifications' && (
          <section
            id="panel-notifications"
            aria-labelledby="tab-notifications"
            className="max-w-2xl"
          >
            <NotificationPreferences initialPreferences={notificationPreferences} />
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
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
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
