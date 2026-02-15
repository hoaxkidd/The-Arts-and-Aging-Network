'use client'

import { useState } from 'react'
import { Settings, Bell, User, Shield, Palette, Save, CheckCircle2, AlertCircle } from 'lucide-react'
import { NotificationPreferences } from '@/components/notifications/NotificationPreferences'
import { cn } from '@/lib/utils'
import { STYLES } from '@/lib/styles'

type SettingsTab = 'notifications' | 'profile' | 'security' | 'appearance'

type SettingsPageProps = {
  userRole: string
  userName: string
  userEmail: string
  notificationPreferences: {
    email: boolean
    sms: boolean
    inApp: boolean
  }
}

export function SettingsPage({
  userRole,
  userName,
  userEmail,
  notificationPreferences
}: SettingsPageProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('notifications')

  const tabs = [
    { id: 'notifications' as const, label: 'Notifications', icon: Bell },
    { id: 'profile' as const, label: 'Profile', icon: User },
    { id: 'security' as const, label: 'Security', icon: Shield },
    { id: 'appearance' as const, label: 'Appearance', icon: Palette },
  ]

  return (
    <div className="h-full flex flex-col">
      {/* Fixed Header */}
      <div className="flex-shrink-0 pb-6">
        <div className="flex items-start gap-4">
          <div className={cn(STYLES.pageIcon, "bg-primary-100 text-primary-500")}>
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h1 className={STYLES.pageTitle}>Settings</h1>
            <p className={STYLES.pageDescription}>
              Manage your account preferences and configurations
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1">
          <div className={cn(STYLES.card, "p-2")}>
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all",
                      activeTab === tab.id
                        ? "bg-primary-50 text-primary-700 font-medium"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    {tab.label}
                  </button>
                )
              })}
            </nav>
          </div>

          {/* User Info Card */}
          <div className={cn(STYLES.card, "mt-6")}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-lg">
                {userName?.charAt(0) || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{userName}</p>
                <p className="text-sm text-gray-500 truncate">{userEmail}</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <span className={cn(STYLES.badge, STYLES.badgeInfo)}>
                {userRole === 'ADMIN' ? 'Administrator' :
                 userRole === 'HOME_ADMIN' ? 'Home Admin' :
                 userRole === 'PAYROLL' ? 'Payroll' :
                 userRole === 'FACILITATOR' ? 'Facilitator' :
                 userRole === 'CONTRACTOR' ? 'Contractor' : userRole}
              </span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <NotificationPreferences initialPreferences={notificationPreferences} />

              {/* Additional Notification Settings */}
              <div className={STYLES.card}>
                <div className={STYLES.cardHeader}>
                  <h3 className={STYLES.cardTitle}>Notification Frequency</h3>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">Email Digest</p>
                      <p className="text-sm text-gray-500">Receive a summary of activities</p>
                    </div>
                    <select className={cn(STYLES.input, "w-auto")}>
                      <option value="instant">Instant</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="never">Never</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">Event Reminders</p>
                      <p className="text-sm text-gray-500">Get reminded before events</p>
                    </div>
                    <select className={cn(STYLES.input, "w-auto")}>
                      <option value="1hour">1 hour before</option>
                      <option value="1day">1 day before</option>
                      <option value="1week">1 week before</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className={STYLES.card}>
              <div className={STYLES.cardHeader}>
                <h3 className={STYLES.cardTitle}>Profile Information</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input type="text" defaultValue={userName} className={STYLES.input} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                  <input type="email" defaultValue={userEmail} className={STYLES.input} disabled />
                  <p className="text-xs text-gray-500 mt-1">Contact admin to change email</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input type="tel" placeholder="+1 (555) 000-0000" className={STYLES.input} />
                </div>
                <div className="pt-4">
                  <button className={cn(STYLES.btn, STYLES.btnPrimary)}>
                    <Save className="w-4 h-4" />
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className={STYLES.card}>
                <div className={STYLES.cardHeader}>
                  <h3 className={STYLES.cardTitle}>Change Password</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                    <input type="password" className={STYLES.input} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                    <input type="password" className={STYLES.input} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                    <input type="password" className={STYLES.input} />
                  </div>
                  <div className="pt-4">
                    <button className={cn(STYLES.btn, STYLES.btnPrimary)}>
                      Update Password
                    </button>
                  </div>
                </div>
              </div>

              <div className={STYLES.card}>
                <div className={STYLES.cardHeader}>
                  <h3 className={STYLES.cardTitle}>Two-Factor Authentication</h3>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">2FA Status</p>
                    <p className="text-sm text-gray-500">Add an extra layer of security</p>
                  </div>
                  <span className={cn(STYLES.badge, STYLES.badgeWarning)}>Not Enabled</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className={STYLES.card}>
              <div className={STYLES.cardHeader}>
                <h3 className={STYLES.cardTitle}>Display Preferences</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">Theme</p>
                    <p className="text-sm text-gray-500">Choose your preferred theme</p>
                  </div>
                  <select className={cn(STYLES.input, "w-auto")}>
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="system">System</option>
                  </select>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">Compact Mode</p>
                    <p className="text-sm text-gray-500">Show more content on screen</p>
                  </div>
                  <button className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-gray-200 transition-colors">
                    <span className="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition translate-x-0" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
