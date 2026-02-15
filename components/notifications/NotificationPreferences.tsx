'use client'

import { useState } from 'react'
import { Mail, MessageSquare, Bell, Save, CheckCircle2, AlertCircle, Settings } from 'lucide-react'
import { updateNotificationPreferences } from '@/app/actions/user'
import { cn } from '@/lib/utils'
import { STYLES } from '@/lib/styles'

type Preferences = {
  email: boolean
  sms: boolean
  inApp: boolean
}

export function NotificationPreferences({ initialPreferences }: { initialPreferences: Preferences }) {
  const [prefs, setPrefs] = useState(initialPreferences)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const handleToggle = (key: keyof Preferences) => {
    setPrefs(prev => ({ ...prev, [key]: !prev[key] }))
    setStatus('idle')
  }

  const handleSave = async () => {
    setLoading(true)
    setStatus('idle')

    try {
      const res = await updateNotificationPreferences(prefs)
      if (res.error) throw new Error(res.error)
      setStatus('success')
      // Reset success message after 3 seconds
      setTimeout(() => setStatus('idle'), 3000)
    } catch (e) {
      setStatus('error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={STYLES.card}>
      <div className={STYLES.cardHeader}>
        <h3 className={STYLES.cardTitle}>
          <Settings className="w-5 h-5 text-gray-400" />
          Notification Settings
        </h3>
      </div>

      <div className="space-y-5">
        {/* Email */}
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-primary-100 text-primary-500 flex items-center justify-center flex-shrink-0">
            <Mail className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <label htmlFor="email-toggle" className="font-semibold text-gray-900 cursor-pointer text-sm">Email</label>
              <button
                id="email-toggle"
                onClick={() => handleToggle('email')}
                className={cn(
                  "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2",
                  prefs.email ? "bg-primary-500" : "bg-gray-200"
                )}
              >
                <span className={cn(
                  "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                  prefs.email ? "translate-x-5" : "translate-x-0"
                )} />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Event invitations and updates
            </p>
          </div>
        </div>

        <div className="h-px bg-gray-100" />

        {/* SMS */}
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-accent-100 text-accent-500 flex items-center justify-center flex-shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <label htmlFor="sms-toggle" className="font-semibold text-gray-900 cursor-pointer text-sm">SMS</label>
              <button
                id="sms-toggle"
                onClick={() => handleToggle('sms')}
                className={cn(
                  "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2",
                  prefs.sms ? "bg-primary-500" : "bg-gray-200"
                )}
              >
                <span className={cn(
                  "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                  prefs.sms ? "translate-x-5" : "translate-x-0"
                )} />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Urgent alerts to your phone
            </p>
          </div>
        </div>

        <div className="h-px bg-gray-100" />

        {/* In-App */}
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-secondary-100 text-secondary-600 flex items-center justify-center flex-shrink-0">
            <Bell className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <label htmlFor="inapp-toggle" className="font-semibold text-gray-900 cursor-pointer text-sm">In-App</label>
              <button
                id="inapp-toggle"
                onClick={() => handleToggle('inApp')}
                className={cn(
                  "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2",
                  prefs.inApp ? "bg-primary-500" : "bg-gray-200"
                )}
              >
                <span className={cn(
                  "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                  prefs.inApp ? "translate-x-5" : "translate-x-0"
                )} />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Dashboard alerts and badges
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
        <div className="text-sm">
          {status === 'success' && (
            <span className="text-green-600 flex items-center gap-2 font-medium animate-in fade-in">
              <CheckCircle2 className="w-4 h-4" /> Saved!
            </span>
          )}
          {status === 'error' && (
            <span className="text-red-600 flex items-center gap-2 font-medium animate-in fade-in">
              <AlertCircle className="w-4 h-4" /> Failed
            </span>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={loading}
          className={cn(
            STYLES.btn,
            loading ? "bg-gray-400 cursor-not-allowed text-white" : STYLES.btnPrimary
          )}
        >
          {loading ? 'Saving...' : (
            <>
              <Save className="w-4 h-4" /> Save
            </>
          )}
        </button>
      </div>
    </div>
  )
}
