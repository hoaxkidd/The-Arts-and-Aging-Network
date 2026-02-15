'use client'

import { UnifiedInbox } from './UnifiedInbox'
import { ChatInterface } from './ChatInterface'

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
    <div className="h-full flex bg-gray-50">
      {/* Unified Inbox */}
      <div className={`
        ${activeConversation ? 'hidden lg:flex' : 'flex'}
        w-full lg:w-96 lg:border-r lg:border-gray-200 bg-white lg:flex-shrink-0
      `}>
        <div className="w-full h-full">
          <UnifiedInbox
            conversations={conversations}
            groupMemberships={groupMemberships}
            currentUserId={currentUserId}
            currentUserRole={currentUserRole}
            activeConversationId={activeConversation?.partner.id}
          />
        </div>
      </div>

      {/* Chat Area */}
      <div className={`
        ${activeConversation ? 'flex' : 'hidden lg:flex'}
        flex-1 bg-white
      `}>
        {activeConversation ? (
          <div className="w-full h-full">
            <ChatInterface
              partner={activeConversation.partner}
              messages={activeConversation.messages}
              currentUserId={currentUserId}
            />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center p-8 text-center bg-gray-50">
            <div>
              <div className="w-24 h-24 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-4 text-4xl">
                💬
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select a conversation</h3>
              <p className="text-sm text-gray-500">
                Choose a conversation from the list to start messaging
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
