'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { STYLES } from '@/lib/styles'

type Conversation = {
  partnerId: string
  partner: {
    id: string
    name: string | null
    preferredName: string | null
    image: string | null
    role: string
  }
  lastMessage: {
    id: string
    subject: string
    content: string
    createdAt: Date
    senderId: string
  }
  unreadCount: number
}

type Props = {
  conversations: Conversation[]
  currentUserId: string
  activeConversationId?: string
}

export function ConversationsList({ conversations, currentUserId, activeConversationId }: Props) {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredConversations = conversations.filter(conv => {
    const name = conv.partner.preferredName || conv.partner.name || ''
    return name.toLowerCase().includes(searchQuery.toLowerCase())
  })

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Search */}
      <div className="p-3 border-b border-gray-200 shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            id="inbox-search"
            name="search"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            aria-label="Search conversations"
            className="w-full pl-10 pr-3 py-2.5 min-h-[44px] text-base bg-gray-100 border-0 rounded-lg focus:ring-2 focus:ring-primary-500 focus:bg-white touch-manipulation"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
        {filteredConversations.length === 0 ? (
          <div className={cn(STYLES.emptyState, "h-full p-8")}>
            <div className={STYLES.emptyIcon}>
              <MessageSquare className="w-10 h-10 text-gray-300" />
            </div>
            <p className={STYLES.emptyTitle}>No conversations yet</p>
            <p className={STYLES.emptyDescription}>
              Use New Message above or browse the Staff Directory to start a conversation
            </p>
            <Link
              href="/staff/directory"
              className={cn(STYLES.btn, STYLES.btnPrimary, "mt-6 text-sm")}
            >
              Browse Staff
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredConversations.map((conversation) => {
              const isActive = conversation.partnerId === activeConversationId
              const isUnread = conversation.unreadCount > 0
              const isSentByMe = conversation.lastMessage.senderId === currentUserId
              const displayName = conversation.partner.preferredName || conversation.partner.name

              return (
                <Link
                  key={conversation.partnerId}
                  href={`/staff/inbox/${conversation.partnerId}`}
                  className={cn(
                    "flex items-center gap-3 p-4 min-h-[72px] hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation",
                    isActive && "bg-primary-50 hover:bg-primary-50 active:bg-primary-100",
                    isUnread && !isActive && "bg-blue-50/30"
                  )}
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <div className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-lg",
                      isActive ? "bg-primary-600" : "bg-gradient-to-br from-primary-400 to-primary-600"
                    )}>
                      {displayName?.[0]?.toUpperCase() || 'U'}
                    </div>
                    {isUnread && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                        {conversation.unreadCount}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between mb-0.5">
                      <h3 className={cn(
                        "text-sm truncate",
                        isUnread ? "font-bold text-gray-900" : "font-medium text-gray-900"
                      )}>
                        {displayName}
                      </h3>
                      <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                        {formatTime(conversation.lastMessage.createdAt)}
                      </span>
                    </div>
                    <p className={cn(
                      "text-xs truncate",
                      isUnread ? "font-semibold text-gray-900" : "text-gray-600"
                    )}>
                      {isSentByMe && <span className="text-gray-500">You: </span>}
                      {conversation.lastMessage.content}
                    </p>
                    <span className="text-xs text-gray-400">{conversation.partner.role}</span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function formatTime(date: Date): string {
  const now = new Date()
  const messageDate = new Date(date)
  const diffMs = now.getTime() - messageDate.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m`
  if (diffHours < 24) return `${diffHours}h`
  if (diffDays < 7) return `${diffDays}d`

  return messageDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
