'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Bell, MessageSquare, Users, Loader2, X, Check } from 'lucide-react'
import { getMessageReminders, completeReminder, deleteReminder } from '@/app/actions/message-reminders'
import { cn } from '@/lib/utils'

type Reminder = {
  id: string
  messageId: string
  messageType: string
  remindAt: Date
  note: string | null
  content?: string
  senderName?: string
  conversationName?: string
  groupName?: string
}

export default function MessageRemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)

  useEffect(() => {
    loadReminders()
  }, [])

  async function loadReminders() {
    setLoading(true)
    const result = await getMessageReminders()
    if (result.success && result.data) {
      setReminders(result.data as Reminder[])
    }
    setLoading(false)
  }

  async function handleComplete(id: string) {
    setActionId(id)
    const result = await completeReminder(id)
    if (!result.error) {
      setReminders(prev => prev.filter(r => r.id !== id))
    }
    setActionId(null)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this reminder?')) return
    
    setActionId(id)
    const result = await deleteReminder(id)
    if (!result.error) {
      setReminders(prev => prev.filter(r => r.id !== id))
    }
    setActionId(null)
  }

  function formatRemindAt(date: Date): string {
    const d = new Date(date)
    const now = new Date()
    const diffMs = d.getTime() - now.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 60) return `in ${diffMins} min`
    if (diffHours < 24) return `in ${diffHours} hours`
    if (diffDays === 1) return 'Tomorrow'
    if (diffDays < 7) return `in ${diffDays} days`

    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  function isOverdue(date: Date): boolean {
    return new Date(date).getTime() < Date.now()
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : reminders.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-sm font-medium text-gray-900 mb-1">No reminders</h3>
            <p className="text-xs text-gray-500">Set reminders on messages to get notified later</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reminders.map((reminder) => (
              <div
                key={reminder.id}
                className={cn(
                  "bg-white border rounded-lg p-4 hover:border-gray-300 transition-colors",
                  isOverdue(reminder.remindAt) ? "border-red-200" : "border-gray-200"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs mb-1">
                      {reminder.messageType === 'DIRECT' ? (
                        <>
                          <MessageSquare className="w-3 h-3" />
                          <span className="text-gray-500">Direct with {reminder.conversationName}</span>
                        </>
                      ) : (
                        <>
                          <Users className="w-3 h-3" />
                          <span className="text-gray-500">Group: {reminder.groupName}</span>
                        </>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-900 line-clamp-2">
                      {reminder.content || '(No content)'}
                    </p>

                    {reminder.note && (
                      <p className="text-xs text-gray-500 mt-1 italic">
                        Note: {reminder.note}
                      </p>
                    )}
                    
                    <p className={cn(
                      "text-xs mt-2 font-medium",
                      isOverdue(reminder.remindAt) ? "text-red-600" : "text-primary-600"
                    )}>
                      {isOverdue(reminder.remindAt) ? '⚠️ ' : '🔔 '}
                      {formatRemindAt(reminder.remindAt)}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleComplete(reminder.id)}
                      disabled={actionId === reminder.id}
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg disabled:opacity-50"
                      title="Mark as done"
                    >
                      {actionId === reminder.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(reminder.id)}
                      disabled={actionId === reminder.id}
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                      title="Delete reminder"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
