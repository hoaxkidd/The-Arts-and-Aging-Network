'use client'

import { FormEvent, useEffect, useState, useTransition } from 'react'
import { Bell, CheckCircle2, Loader2, Lock, Palette, Save, Send, UserCircle } from 'lucide-react'
import { updateStaffProfile } from '@/app/actions/staff'
import {
  changePassword,
  sendTestEmail,
  updateEmailDigestTime,
  updateNotificationPreferences,
} from '@/app/actions/user'
import { notify } from '@/lib/notify'
import { STYLES } from '@/lib/styles'
import { cn } from '@/lib/utils'

type NotificationPrefs = {
  email: boolean
  sms: boolean
  inApp: boolean
  emailFrequency?: 'immediate' | 'daily' | 'weekly'
  emailDigestTime?: string
}

type AdminPersonalPreferencesPanelProps = {
  user: {
    id: string
    email: string
    name: string | null
    preferredName: string | null
    phone: string | null
    image: string | null
    bio: string | null
    status: string
    role: string
    lastLoginAt: string | null
  }
  notificationPreferences: NotificationPrefs
}

type PreferenceSection = 'profile' | 'notifications' | 'security' | 'appearance'

const SECTION_OPTIONS: Array<{ id: PreferenceSection; label: string; icon: typeof UserCircle }> = [
  { id: 'profile', label: 'Profile', icon: UserCircle },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Lock },
  { id: 'appearance', label: 'Appearance', icon: Palette },
]

const THEME_KEY = 'app-theme'
const COMPACT_KEY = 'app-compact'

function formatLastLogin(raw: string | null): string {
  if (!raw) return 'No login activity recorded'
  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return 'No login activity recorded'
  return parsed.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function AdminPersonalPreferencesPanel({ user, notificationPreferences }: AdminPersonalPreferencesPanelProps) {
  const [activeSection, setActiveSection] = useState<PreferenceSection>('profile')
  const [isPending, startTransition] = useTransition()
  const [isSendingTest, startSendingTest] = useTransition()
  const [profileState, setProfileState] = useState({
    name: user.name ?? '',
    preferredName: user.preferredName ?? '',
    phone: user.phone ?? '',
    image: user.image ?? '',
    bio: user.bio ?? '',
  })
  const [notificationState, setNotificationState] = useState({
    email: notificationPreferences.email,
    sms: notificationPreferences.sms,
    inApp: notificationPreferences.inApp,
    emailFrequency: notificationPreferences.emailFrequency ?? 'immediate',
    emailDigestTime: notificationPreferences.emailDigestTime ?? '08:00',
  })
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system')
  const [compactMode, setCompactMode] = useState(false)
  const [passwordState, setPasswordState] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    const savedTheme = (window.localStorage.getItem(THEME_KEY) as 'light' | 'dark' | 'system') || 'system'
    const savedCompact = window.localStorage.getItem(COMPACT_KEY) === 'true'
    setTheme(savedTheme)
    setCompactMode(savedCompact)
    document.body.classList.toggle('compact-mode', savedCompact)
    const root = document.documentElement
    root.classList.remove('light', 'dark')
    if (savedTheme !== 'system') root.classList.add(savedTheme)
  }, [])

  const accountStatusLabel = `${user.role} · ${user.status}`

  const saveProfile = (event: FormEvent) => {
    event.preventDefault()
    startTransition(async () => {
      const formData = new FormData()
      formData.set('userId', user.id)
      formData.set('name', profileState.name)
      formData.set('preferredName', profileState.preferredName)
      formData.set('phone', profileState.phone)
      formData.set('image', profileState.image)
      formData.set('bio', profileState.bio)

      const result = await updateStaffProfile(formData)
      if (result?.error) {
        notify.error({ title: 'Profile update failed', description: result.error })
        return
      }
      notify.success({ title: 'Profile updated' })
    })
  }

  const saveNotifications = (event: FormEvent) => {
    event.preventDefault()
    startTransition(async () => {
      const preferenceResult = await updateNotificationPreferences({
        email: notificationState.email,
        sms: notificationState.sms,
        inApp: notificationState.inApp,
        emailFrequency: notificationState.emailFrequency,
      })
      if (preferenceResult?.error) {
        notify.error({ title: 'Notification update failed', description: preferenceResult.error })
        return
      }

      if (notificationState.emailFrequency !== 'immediate') {
        const digestResult = await updateEmailDigestTime(notificationState.emailDigestTime)
        if (digestResult?.error) {
          notify.error({ title: 'Digest schedule update failed', description: digestResult.error })
          return
        }
      }

      notify.success({ title: 'Notification preferences saved' })
    })
  }

  const submitPassword = (event: FormEvent) => {
    event.preventDefault()
    startTransition(async () => {
      const formData = new FormData()
      formData.set('currentPassword', passwordState.currentPassword)
      formData.set('newPassword', passwordState.newPassword)
      formData.set('confirmPassword', passwordState.confirmPassword)
      const result = await changePassword(formData)
      if (result?.error) {
        notify.error({ title: 'Password update failed', description: result.error })
        return
      }

      setPasswordState({ currentPassword: '', newPassword: '', confirmPassword: '' })
      notify.success({ title: 'Password changed successfully' })
    })
  }

  const sendTestNotification = () => {
    startSendingTest(async () => {
      const result = await sendTestEmail()
      if (result?.error) {
        notify.error({ title: 'Test email failed', description: result.error })
        return
      }
      notify.success({ title: 'Test email sent' })
    })
  }

  const applyTheme = (nextTheme: 'light' | 'dark' | 'system') => {
    setTheme(nextTheme)
    if (typeof window === 'undefined') return
    window.localStorage.setItem(THEME_KEY, nextTheme)
    const root = document.documentElement
    root.classList.remove('light', 'dark')
    if (nextTheme !== 'system') root.classList.add(nextTheme)
  }

  const applyCompactMode = (value: boolean) => {
    setCompactMode(value)
    if (typeof window === 'undefined') return
    window.localStorage.setItem(COMPACT_KEY, value ? 'true' : 'false')
    document.body.classList.toggle('compact-mode', value)
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Personal Admin Preferences</h2>
          <p className="mt-1 text-xs text-gray-600">
            Manage your account profile, notification delivery, password, and workspace appearance from one place.
          </p>
        </div>
        <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700">
          <p className="font-medium text-gray-900">{accountStatusLabel}</p>
          <p>Last login: {formatLastLogin(user.lastLoginAt)}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="rounded-lg border border-gray-200 bg-gray-50 p-2">
          {SECTION_OPTIONS.map((section) => {
            const Icon = section.icon
            const selected = section.id === activeSection
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  'mb-1 flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-left',
                  selected
                    ? 'bg-white text-primary-800 shadow-sm border border-primary-200'
                    : 'text-gray-700 hover:bg-white'
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="font-medium">{section.label}</span>
              </button>
            )
          })}
        </aside>

        <div className="rounded-lg border border-gray-200 p-4">
          {activeSection === 'profile' ? (
            <form onSubmit={saveProfile} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600">Full Name</label>
                  <input
                    value={profileState.name}
                    onChange={(event) => setProfileState((prev) => ({ ...prev, name: event.target.value }))}
                    className={STYLES.input}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600">Preferred Name</label>
                  <input
                    value={profileState.preferredName}
                    onChange={(event) => setProfileState((prev) => ({ ...prev, preferredName: event.target.value }))}
                    className={STYLES.input}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600">Phone</label>
                  <input
                    value={profileState.phone}
                    onChange={(event) => setProfileState((prev) => ({ ...prev, phone: event.target.value }))}
                    className={STYLES.input}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600">Email</label>
                  <input value={user.email} className={cn(STYLES.input, 'bg-gray-50 text-gray-500')} disabled />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600">Profile Image URL</label>
                <input
                  value={profileState.image}
                  onChange={(event) => setProfileState((prev) => ({ ...prev, image: event.target.value }))}
                  className={STYLES.input}
                  placeholder="https://"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600">Bio</label>
                <textarea
                  value={profileState.bio}
                  onChange={(event) => setProfileState((prev) => ({ ...prev, bio: event.target.value }))}
                  className={cn(STYLES.input, 'min-h-[120px]')}
                />
              </div>
              <div className="flex justify-end">
                <button type="submit" disabled={isPending} className={cn(STYLES.btn, STYLES.btnPrimary, 'inline-flex items-center gap-2')}>
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save profile
                </button>
              </div>
            </form>
          ) : null}

          {activeSection === 'notifications' ? (
            <form onSubmit={saveNotifications} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { key: 'email', label: 'Email Alerts' },
                  { key: 'sms', label: 'SMS Alerts' },
                  { key: 'inApp', label: 'In-App Alerts' },
                ].map((item) => (
                  <label key={item.key} className="rounded-md border border-gray-200 p-3 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={Boolean(notificationState[item.key as keyof typeof notificationState])}
                      onChange={(event) =>
                        setNotificationState((prev) => ({
                          ...prev,
                          [item.key]: event.target.checked,
                        }))
                      }
                      className="mr-2 h-4 w-4 rounded border-gray-300 text-primary-600"
                    />
                    {item.label}
                  </label>
                ))}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600">Email Frequency</label>
                  <select
                    value={notificationState.emailFrequency}
                    onChange={(event) =>
                      setNotificationState((prev) => ({
                        ...prev,
                        emailFrequency: event.target.value as 'immediate' | 'daily' | 'weekly',
                      }))
                    }
                    className={cn(STYLES.input, STYLES.select)}
                  >
                    <option value="immediate">Immediate</option>
                    <option value="daily">Daily Digest</option>
                    <option value="weekly">Weekly Digest</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600">Digest Time</label>
                  <input
                    type="time"
                    value={notificationState.emailDigestTime}
                    onChange={(event) =>
                      setNotificationState((prev) => ({
                        ...prev,
                        emailDigestTime: event.target.value,
                      }))
                    }
                    disabled={notificationState.emailFrequency === 'immediate'}
                    className={cn(STYLES.input, notificationState.emailFrequency === 'immediate' && 'bg-gray-50 text-gray-500')}
                  />
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={sendTestNotification}
                  disabled={isSendingTest}
                  className={cn(STYLES.btn, STYLES.btnSecondary, 'inline-flex items-center gap-2')}
                >
                  {isSendingTest ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Send test email
                </button>
                <button type="submit" disabled={isPending} className={cn(STYLES.btn, STYLES.btnPrimary, 'inline-flex items-center gap-2')}>
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save notifications
                </button>
              </div>
            </form>
          ) : null}

          {activeSection === 'security' ? (
            <form onSubmit={submitPassword} className="space-y-4">
              <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
                Password updates require your current password and take effect immediately for future logins.
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600">Current Password</label>
                  <input
                    type="password"
                    value={passwordState.currentPassword}
                    onChange={(event) => setPasswordState((prev) => ({ ...prev, currentPassword: event.target.value }))}
                    className={STYLES.input}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600">New Password</label>
                  <input
                    type="password"
                    value={passwordState.newPassword}
                    onChange={(event) => setPasswordState((prev) => ({ ...prev, newPassword: event.target.value }))}
                    className={STYLES.input}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600">Confirm Password</label>
                  <input
                    type="password"
                    value={passwordState.confirmPassword}
                    onChange={(event) => setPasswordState((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                    className={STYLES.input}
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button type="submit" disabled={isPending} className={cn(STYLES.btn, STYLES.btnPrimary, 'inline-flex items-center gap-2')}>
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                  Update password
                </button>
              </div>
            </form>
          ) : null}

          {activeSection === 'appearance' ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Theme</h3>
                <p className="mt-1 text-xs text-gray-600">Choose how the workspace appears for your account on this device.</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                {(['light', 'dark', 'system'] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => applyTheme(option)}
                    className={cn(
                      'rounded-md border px-3 py-2 text-sm font-medium capitalize',
                      theme === option
                        ? 'border-primary-300 bg-primary-50 text-primary-800'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    )}
                  >
                    {option}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between rounded-md border border-gray-200 p-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">Compact mode</p>
                  <p className="text-xs text-gray-600">Reduce spacing density for data-heavy admin workflows.</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={compactMode}
                  onClick={() => applyCompactMode(!compactMode)}
                  className={cn(
                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                    compactMode ? 'bg-primary-500' : 'bg-gray-300'
                  )}
                >
                  <span
                    className={cn(
                      'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform',
                      compactMode ? 'translate-x-5' : 'translate-x-0.5'
                    )}
                  />
                </button>
              </div>

              <div className="rounded-md border border-green-200 bg-green-50 p-3 text-xs text-green-900 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Appearance preferences are applied instantly and saved for this browser.
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}
