'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Clock, Loader2, X, Send, MessageSquare, Users } from 'lucide-react'
import { getScheduledMessages, cancelScheduledMessage } from '@/app/actions/scheduled-messages'
import { cn } from '@/lib/utils'

type ScheduledMessage = {
  id: string
  content: string
  targetType: string
  targetId: string
  scheduledAt: Date
  targetName: string
}

export default function ScheduledMessagesPage() {
  const [messages, setMessages] = useState<ScheduledMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)

  useEffect(() => {
    loadMessages()
  }, [])

  async function loadMessages() {
    setLoading(true)
    const result = await getScheduledMessages()
    if (result.success && result.data) {
      setMessages(result.data as ScheduledMessage[])
    }
    setLoading(false)
  }

  async function handleCancel(id: string) {
    if (!confirm('Cancel this scheduled message?')) return
    
    setActionId(id)
    const result = await cancelScheduledMessage(id)
    if (!result.error) {
      setMessages(prev => prev.filter(m => m.id !== id))
    }
    setActionId(null)
  }

  function formatScheduledAt(date: Date): string {
    const d = new Date(date)
    const now = new Date()
    const diffMs = d.getTime() - now.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 60) return `in ${diffMins} minutes`
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

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-sm font-medium text-gray-900 mb-1">No scheduled messages</h3>
            <p className="text-xs text-gray-500">Schedule messages to be sent at a specific time</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className="bg-white border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                      {msg.targetType === 'DIRECT' ? (
                        <>
                          <MessageSquare className="w-3 h-3" />
                          <span>Direct message to {msg.targetName}</span>
                        </>
                      ) : (
                        <>
                          <Users className="w-3 h-3" />
                          <span>Group: {msg.targetName}</span>
                        </>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-900 line-clamp-2">{msg.content}</p>
                    
                    <p className="text-xs text-primary-600 mt-2 font-medium">
                      <Clock className="w-3 h-3 inline mr-1" />
                      Sending {formatScheduledAt(msg.scheduledAt)}
                    </p>
                  </div>

                  <button
                    onClick={() => handleCancel(msg.id)}
                    disabled={actionId === msg.id}
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                    title="Cancel"
                  >
                    {actionId === msg.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <X className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
