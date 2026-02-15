'use client'

import { useState } from 'react'
import { Mail, Users, Send, Plus, MessageSquare, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { InboxList } from './InboxList'
import { ComposeMessageModal } from './ComposeMessageModal'
import Link from 'next/link'

type DirectMessage = {
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

type GroupMembership = {
  id: string
  groupId: string
  userId: string
  role: string
  group: {
    id: string
    name: string
    description: string | null
    type: string
    isActive: boolean
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

type Props = {
  currentUserId: string
  inboxMessages: DirectMessage[]
  sentMessages: DirectMessage[]
  groupMemberships: GroupMembership[]
  unreadDirectCount: number
  unreadGroupCount: number
}

export function MessagingCenter({
  currentUserId,
  inboxMessages,
  sentMessages,
  groupMemberships,
  unreadDirectCount,
  unreadGroupCount
}: Props) {
  const [activeTab, setActiveTab] = useState<'direct' | 'groups'>('direct')
  const [showComposeModal, setShowComposeModal] = useState(false)

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="flex-shrink-0 pb-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 text-white flex items-center justify-center shadow-lg">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Messages</h1>
              <p className="text-sm text-gray-500">
                {unreadDirectCount + unreadGroupCount > 0
                  ? `${unreadDirectCount + unreadGroupCount} unread`
                  : 'All caught up!'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'direct' && (
              <button
                onClick={() => setShowComposeModal(true)}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium flex items-center gap-2 shadow-sm"
              >
                <Send className="w-4 h-4" />
                New Message
              </button>
            )}
            {activeTab === 'groups' && (
              <Link
                href="/staff/groups/new"
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium flex items-center gap-2 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Create Group
              </Link>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('direct')}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors relative",
              activeTab === 'direct'
                ? "border-primary-600 text-primary-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            )}
          >
            <Mail className="w-4 h-4 inline mr-2" />
            Direct Messages
            {unreadDirectCount > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-primary-600 text-white text-xs font-bold rounded-full">
                {unreadDirectCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('groups')}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors relative",
              activeTab === 'groups'
                ? "border-primary-600 text-primary-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            )}
          >
            <Users className="w-4 h-4 inline mr-2" />
            Groups
            {unreadGroupCount > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-primary-600 text-white text-xs font-bold rounded-full">
                {unreadGroupCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-auto mt-4">
        {activeTab === 'direct' ? (
          <InboxList
            inboxMessages={inboxMessages}
            sentMessages={sentMessages}
            currentUserId={currentUserId}
          />
        ) : (
          <div className="space-y-2">
            {groupMemberships.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500 mb-4">No groups yet</p>
                <Link
                  href="/staff/groups/new"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Create Your First Group
                </Link>
              </div>
            ) : (
              groupMemberships.map((membership) => {
                const lastMessage = membership.group.messages[0]
                const isAdmin = membership.role === 'ADMIN'

                return (
                  <Link
                    key={membership.id}
                    href={`/staff/groups/${membership.groupId}`}
                    className="block bg-white rounded-lg border border-gray-200 p-4 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary-100 to-primary-200 text-primary-600 flex items-center justify-center text-lg font-bold flex-shrink-0">
                          {membership.group.name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-base font-semibold text-gray-900 truncate">
                              {membership.group.name}
                            </h3>
                            {isAdmin && (
                              <span className="px-2 py-0.5 bg-primary-100 text-primary-700 text-xs font-medium rounded">
                                Admin
                              </span>
                            )}
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">
                              {membership.group.type}
                            </span>
                          </div>
                          {membership.group.description && (
                            <p className="text-sm text-gray-600 truncate mb-2">
                              {membership.group.description}
                            </p>
                          )}
                          {lastMessage ? (
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <Clock className="w-3 h-3" />
                              <span>
                                {lastMessage.sender.preferredName || lastMessage.sender.name}:
                              </span>
                              <span className="truncate">
                                {lastMessage.content.slice(0, 50)}
                                {lastMessage.content.length > 50 ? '...' : ''}
                              </span>
                            </div>
                          ) : (
                            <p className="text-xs text-gray-400">No messages yet</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <div className="text-xs text-gray-500 mb-2">
                          {membership.group._count.members} members
                        </div>
                        <div className="text-xs font-medium text-primary-600">
                          {membership.group._count.messages} messages
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })
            )}
          </div>
        )}
      </div>

      {/* Compose Modal */}
      <ComposeMessageModal
        isOpen={showComposeModal}
        onClose={() => setShowComposeModal(false)}
      />
    </div>
  )
}
