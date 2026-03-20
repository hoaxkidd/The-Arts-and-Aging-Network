'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Star, MessageSquare, Users, Loader2 } from 'lucide-react'
import { getStarredMessages, unstarMessage } from '@/app/actions/starred-messages'
import { cn } from '@/lib/utils'

type StarredMessage = {
  id: string
  messageId: string
  messageType: string
  createdAt: Date
  content?: string
  senderName?: string
  conversationName?: string
  groupName?: string
}

export default function StarredMessagesPage() {
  const [messages, setMessages] = useState<StarredMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [removing, setRemoving] = useState<string | null>(null)

  useEffect(() => {
    loadStarredMessages()
  }, [])

  async function loadStarredMessages() {
    setLoading(true)
    const result = await getStarredMessages()
    if (result.success && result.data) {
      setMessages(result.data)
    }
    setLoading(false)
  }

  async function handleUnstar(messageId: string) {
    setRemoving(messageId)
    const result = await unstarMessage(messageId)
    if (!result.error) {
      setMessages(prev => prev.filter(m => m.messageId !== messageId))
    }
    setRemoving(null)
  }

  function formatDate(date: Date): string {
    const d = new Date(date)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`

    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
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
              <Star className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-sm font-medium text-gray-900 mb-1">No starred messages</h3>
            <p className="text-xs text-gray-500">Star messages to save them here for quick access</p>
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                      {msg.messageType === 'DIRECT' ? (
                        <>
                          <MessageSquare className="w-3 h-3" />
                          <span>Direct message with {msg.conversationName}</span>
                        </>
                      ) : (
                        <>
                          <Users className="w-3 h-3" />
                          <span>Group: {msg.groupName}</span>
                        </>
                      )}
                      <span className="text-gray-300">•</span>
                      <span>{formatDate(msg.createdAt)}</span>
                    </div>
                    
                    <p className="text-sm text-gray-900 line-clamp-2">
                      {msg.content || '(No content)'}
                    </p>
                    
                    {msg.senderName && (
                      <p className="text-xs text-gray-500 mt-1">
                        From: {msg.senderName}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => handleUnstar(msg.messageId)}
                    disabled={removing === msg.messageId}
                    className={cn(
                      "min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-yellow-500 rounded-lg transition-colors",
                      removing === msg.messageId && "opacity-50"
                    )}
                    title="Remove from starred"
                  >
                    {removing === msg.messageId ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
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
