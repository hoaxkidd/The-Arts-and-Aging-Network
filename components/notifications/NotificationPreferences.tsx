'use client'

import { useState } from 'react'
import { Mail, MessageSquare, Bell, Save, CheckCircle2, AlertCircle, Settings, Send, Clock, Zap } from 'lucide-react'
import { updateNotificationPreferences, updateEmailDigestTime, sendTestEmail } from '@/app/actions/user'
import { cn } from '@/lib/utils'
import { STYLES } from '@/lib/styles'
import { TimeInput } from '@/components/ui/TimeInput'

type Preferences = {
  email: boolean
  sms: boolean
  inApp: boolean
  emailFrequency?: string
  emailDigestTime?: string
}

export function NotificationPreferences({ initialPreferences }: { initialPreferences: Preferences }) {
  const [prefs, setPrefs] = useState<Preferences>({
    email: initialPreferences.email ?? true,
    sms: initialPreferences.sms ?? false,
    inApp: initialPreferences.inApp ?? true,
    emailFrequency: initialPreferences.emailFrequency ?? 'immediate',
    emailDigestTime: initialPreferences.emailDigestTime ?? '08:00'
  })
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [testStatus, setTestStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [testMessage, setTestMessage] = useState('')

  const handleToggle = (key: keyof Preferences) => {
    setPrefs(prev => ({ ...prev, [key]: !prev[key] }))
    setStatus('idle')
  }

  const handleFrequencyChange = (frequency: string) => {
    setPrefs(prev => ({ ...prev, emailFrequency: frequency }))
    setStatus('idle')
  }

  const handleDigestTimeChange = (time: string) => {
    setPrefs(prev => ({ ...prev, emailDigestTime: time }))
    setStatus('idle')
  }

  const handleSave = async () => {
    setLoading(true)
    setStatus('idle')

    try {
      const res = await updateNotificationPreferences({
        email: prefs.email ?? true,
        sms: prefs.sms ?? false,
        inApp: prefs.inApp ?? true,
        emailFrequency: prefs.emailFrequency
      })
      if (res.error) throw new Error(res.error)
      
      if (prefs.emailFrequency === 'daily' || prefs.emailFrequency === 'weekly') {
        const timeRes = await updateEmailDigestTime(prefs.emailDigestTime || '08:00')
        if (timeRes.error) throw new Error(timeRes.error)
      }
      
      setStatus('success')
      setTimeout(() => setStatus('idle'), 3000)
    } catch (e) {
      setStatus('error')
    } finally {
      setLoading(false)
    }
  }

  const handleSendTestEmail = async () => {
    setTestStatus('sending')
    setTestMessage('')

    try {
      const res = await sendTestEmail()
      if (res.error) {
        setTestStatus('error')
        setTestMessage(res.error)
      } else {
        setTestStatus('success')
        setTestMessage('Test email sent! Check your inbox.')
        setTimeout(() => {
          setTestStatus('idle')
          setTestMessage('')
        }, 5000)
      }
    } catch (e) {
      setTestStatus('error')
      setTestMessage('Failed to send test email')
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

        {/* Email Frequency (only show if email is enabled) */}
        {prefs.email && (
          <>
            <div className="ml-14 space-y-3">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary-500" />
                <span className="text-sm font-medium text-gray-700">Email Frequency</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'immediate', label: 'Immediate' },
                  { value: 'daily', label: 'Daily Digest' },
                  { value: 'weekly', label: 'Weekly Digest' },
                  { value: 'never', label: 'Never' },
                ].map(option => (
                  <button
                    key={option.value}
                    onClick={() => handleFrequencyChange(option.value)}
                    className={cn(
                      "px-3 py-1.5 text-sm rounded-full border transition-colors",
                      prefs.emailFrequency === option.value
                        ? "bg-primary-500 text-white border-primary-500"
                        : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {/* Digest Time Picker */}
              {(prefs.emailFrequency === 'daily' || prefs.emailFrequency === 'weekly') && (
                <div className="flex items-center gap-3 mt-3">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <label className="text-sm text-gray-600">Digest time:</label>
                  <div className="min-w-[150px]">
                    <TimeInput
                      name="emailDigestTime"
                      value={prefs.emailDigestTime || '08:00'}
                      onChange={handleDigestTimeChange}
                    />
                  </div>
                </div>
              )}

              {/* Test Email Button */}
              <div className="flex items-center gap-3 mt-3">
                <button
                  onClick={handleSendTestEmail}
                  disabled={testStatus === 'sending'}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border transition-colors",
                    testStatus === 'success'
                      ? "bg-green-50 text-green-600 border-green-200"
                      : testStatus === 'error'
                      ? "bg-red-50 text-red-600 border-red-200"
                      : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                  )}
                >
                  {testStatus === 'sending' ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send Test Email
                    </>
                  )}
                </button>
                {testMessage && (
                  <span className={cn(
                    "text-sm",
                    testStatus === 'success' ? "text-green-600" : "text-red-600"
                  )}>
                    {testMessage}
                  </span>
                )}
              </div>
            </div>
          </>
        )}

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
