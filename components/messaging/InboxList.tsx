'use client'

import { useState } from 'react'
import { Mail, Send, Trash2, Eye, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { markMessageAsRead, deleteMessage } from '@/app/actions/direct-messages'
import { MessageDetailModal } from './MessageDetailModal'

type Message = {
  id: string
  subject: string
  content: string
  read: boolean
  createdAt: Date
  senderId: string
  recipientId: string
  sender?: {
    id: string
    name: string | null
    preferredName: string | null
    image: string | null
    role: string
  }
  recipient?: {
    id: string
    name: string | null
    preferredName: string | null
    image: string | null
    role: string
  }
}

type InboxListProps = {
  inboxMessages: Message[]
  sentMessages: Message[]
  currentUserId: string
}

export function InboxList({ inboxMessages, sentMessages, currentUserId }: InboxListProps) {
  const [activeTab, setActiveTab] = useState<'inbox' | 'sent'>('inbox')
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)

  const messages = activeTab === 'inbox' ? inboxMessages : sentMessages

  const handleViewMessage = async (message: Message) => {
    setSelectedMessage(message)
    if (activeTab === 'inbox' && !message.read) {
      await markMessageAsRead(message.id)
    }
  }

  const handleDelete = async (messageId: string) => {
    if (!confirm('Delete this message?')) return
    await deleteMessage(messageId)
  }

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('inbox')}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
            activeTab === 'inbox'
              ? "border-primary-600 text-primary-600"
              : "border-transparent text-gray-600 hover:text-gray-900"
          )}
        >
          <Mail className="w-4 h-4 inline mr-1.5" />
          Inbox ({inboxMessages.length})
        </button>
        <button
          onClick={() => setActiveTab('sent')}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
            activeTab === 'sent'
              ? "border-primary-600 text-primary-600"
              : "border-transparent text-gray-600 hover:text-gray-900"
          )}
        >
          <Send className="w-4 h-4 inline mr-1.5" />
          Sent ({sentMessages.length})
        </button>
      </div>

      {/* Messages List */}
      <div className="space-y-2">
        {messages.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            {activeTab === 'inbox' ? (
              <Mail className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            ) : (
              <Send className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            )}
            <p className="text-sm text-gray-500">
              {activeTab === 'inbox' ? 'No messages yet' : 'No sent messages'}
            </p>
          </div>
        ) : (
          messages.map((message) => {
            const otherUser = activeTab === 'inbox' ? message.sender : message.recipient
            const isUnread = activeTab === 'inbox' && !message.read

            return (
              <div
                key={message.id}
                className={cn(
                  "bg-white rounded-lg border p-4 transition-colors cursor-pointer",
                  isUnread ? "border-primary-200 bg-primary-50/30" : "border-gray-200"
                )}
                onClick={() => handleViewMessage(message)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-sm font-medium flex-shrink-0">
                      {otherUser?.name?.[0] || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn(
                          "text-sm truncate",
                          isUnread ? "font-bold text-gray-900" : "font-medium text-gray-900"
                        )}>
                          {otherUser?.preferredName || otherUser?.name}
                        </span>
                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded">
                          {otherUser?.role}
                        </span>
                      </div>
                      <p className={cn(
                        "text-sm truncate",
                        isUnread ? "font-semibold text-gray-900" : "text-gray-900"
                      )}>
                        {message.subject}
                      </p>
                      <p className="text-xs text-gray-600 truncate mt-1">
                        {message.content}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-500">
                          {new Date(message.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit'
                          })}
                        </span>
                        {isUnread && (
                          <span className="ml-auto px-2 py-0.5 bg-primary-600 text-white text-xs font-medium rounded-full">
                            New
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {activeTab === 'inbox' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(message.id)
                      }}
                      className="p-2 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Message Detail Modal */}
      {selectedMessage && (
        <MessageDetailModal
          message={selectedMessage}
          isInbox={activeTab === 'inbox'}
          onClose={() => setSelectedMessage(null)}
        />
      )}
    </div>
  )
}
