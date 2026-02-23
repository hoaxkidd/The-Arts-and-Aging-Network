'use client'

import { UnifiedInbox } from './UnifiedInbox'
import { ChatInterface } from './ChatInterface'
import { MessageSquare } from 'lucide-react'
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

type GroupMembership = {
  id: string
  groupId: string
  role: string
  isDiscoverable?: boolean
  allowAllStaff?: boolean
  isPending?: boolean
  group: {
    id: string
    name: string
    description: string | null
    type: string
    _count: {
      members: number
      messages: number
    }
    messages: Array<{
      content: string
      createdAt: Date
      sender: {
        name: string | null
        preferredName: string | null
      }
    }>
  }
}

type Message = {
  id: string
  content: string
  createdAt: Date
  senderId: string
  sender: {
    id: string
    name: string | null
    preferredName: string | null
    image: string | null
  }
}

type Partner = {
  id: string
  name: string | null
  preferredName: string | null
  image: string | null
  role: string
}

type Props = {
  conversations: Conversation[]
  groupMemberships?: GroupMembership[]
  currentUserId: string
  currentUserRole?: string
  activeConversation?: {
    partner: Partner
    messages: Message[]
  }
}

export function ConversationSplitView({
  conversations,
  groupMemberships = [],
  currentUserId,
  currentUserRole = 'VOLUNTEER',
  activeConversation
}: Props) {
  return (
    <div className="flex-1 flex flex-col lg:flex-row min-h-0 bg-gray-50">
      {/* Unified Inbox - full width on mobile, sidebar on desktop */}
      <div className={cn(
        "flex flex-col min-h-0",
        activeConversation ? "hidden lg:flex lg:w-96 lg:flex-shrink-0 lg:border-r lg:border-gray-200" : "flex-1 w-full",
        "bg-white"
      )}>
        <div className="w-full flex-1 min-h-0 flex flex-col">
          <UnifiedInbox
            conversations={conversations}
            groupMemberships={groupMemberships}
            currentUserId={currentUserId}
            currentUserRole={currentUserRole}
            activeConversationId={activeConversation?.partner.id}
          />
        </div>
      </div>

      {/* Chat Area - shown when conversation selected; on mobile replaces list */}
      <div className={cn(
        "flex flex-col min-h-0",
        activeConversation ? "flex-1 flex" : "hidden lg:flex lg:flex-1",
        "bg-white"
      )}>
        {activeConversation ? (
          <div className="w-full flex-1 min-h-0 flex flex-col">
            <ChatInterface
              partner={activeConversation.partner}
              messages={activeConversation.messages}
              currentUserId={currentUserId}
            />
          </div>
        ) : (
          <div className={cn(STYLES.emptyState, "flex-1 p-6 sm:p-8 bg-gray-50")}>
            <div className={STYLES.emptyIcon}>
              <MessageSquare className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className={STYLES.emptyTitle}>Select a conversation</h3>
            <p className={STYLES.emptyDescription}>
              Choose a conversation from the list to start messaging
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
