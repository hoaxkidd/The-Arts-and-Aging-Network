'use client'

import { useState } from 'react'
import { MessageSquare, Users, Edit, Plus, Lock, Clock, LogIn } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ConversationsList } from './ConversationsList'
import { NewMessageModal } from './NewMessageModal'
import { requestGroupAccess } from '@/app/actions/messaging'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

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

type Props = {
  conversations: Conversation[]
  groupMemberships: GroupMembership[]
  currentUserId: string
  currentUserRole: string
  activeConversationId?: string
}

export function UnifiedInbox({ conversations, groupMemberships, currentUserId, currentUserRole, activeConversationId }: Props) {
  const [activeTab, setActiveTab] = useState<'direct' | 'groups'>('direct')
  const [showNewMessageModal, setShowNewMessageModal] = useState(false)
  const [joiningGroupId, setJoiningGroupId] = useState<string | null>(null)
  const router = useRouter()

  const totalUnread = conversations.reduce((sum, conv) => sum + conv.unreadCount, 0)

  // Separate my groups from discoverable groups
  const myGroups = groupMemberships.filter(m => !m.isDiscoverable)
  const discoverableGroups = groupMemberships.filter(m => m.isDiscoverable)

  const handleJoinGroup = async (groupId: string, allowAllStaff: boolean) => {
    setJoiningGroupId(groupId)
    const result = await requestGroupAccess(groupId)
    if (result.success) {
      if (result.autoApproved) {
        router.push(`/staff/groups/${groupId}`)
      } else {
        router.refresh()
      }
    } else {
      alert(result.error || 'Failed to join group')
    }
    setJoiningGroupId(null)
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold text-gray-900">Messages</h2>
          <button
            onClick={() => setShowNewMessageModal(true)}
            className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
            title="New Message"
          >
            <Edit className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('direct')}
            className={cn(
              "flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors",
              activeTab === 'direct'
                ? "bg-primary-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            <MessageSquare className="w-4 h-4 inline mr-1.5" />
            Direct
            {totalUnread > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-white text-primary-600 text-xs font-bold rounded-full">
                {totalUnread}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('groups')}
            className={cn(
              "flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors",
              activeTab === 'groups'
                ? "bg-primary-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            <Users className="w-4 h-4 inline mr-1.5" />
            Groups
            <span className="ml-1.5 text-xs">({myGroups.length})</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'direct' ? (
          <ConversationsList
            conversations={conversations}
            currentUserId={currentUserId}
            activeConversationId={activeConversationId}
          />
        ) : (
          <div className="p-3 space-y-3">
            {/* My Groups */}
            {myGroups.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">My Groups</p>
                <div className="space-y-2">
                  {myGroups.map((membership) => {
                    const lastMessage = membership.group.messages[0]
                    const isAdmin = membership.role === 'ADMIN'

                    return (
                      <Link
                        key={membership.id}
                        href={`/staff/groups/${membership.groupId}`}
                        className="block bg-white border border-gray-200 rounded-lg p-3 hover:border-primary-400 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 text-white flex items-center justify-center text-base font-bold flex-shrink-0">
                            {membership.group.name[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <h3 className="font-semibold text-sm text-gray-900 truncate">
                                {membership.group.name}
                              </h3>
                              {isAdmin && (
                                <span className="px-1.5 py-0.5 bg-primary-100 text-primary-700 text-[10px] font-medium rounded">
                                  Admin
                                </span>
                              )}
                            </div>
                            {lastMessage ? (
                              <p className="text-xs text-gray-500 truncate">
                                {lastMessage.sender.preferredName || lastMessage.sender.name}:
                                {' '}
                                {lastMessage.content.slice(0, 40)}
                                {lastMessage.content.length > 40 ? '...' : ''}
                              </p>
                            ) : (
                              <p className="text-xs text-gray-400">No messages yet</p>
                            )}
                            <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-400">
                              <span>{membership.group._count.members} members</span>
                              <span>{membership.group._count.messages} msgs</span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}

            {myGroups.length === 0 && discoverableGroups.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="w-16 h-16 text-gray-300 mb-3" />
                <p className="text-sm font-medium text-gray-900 mb-1">No groups yet</p>
                <p className="text-xs text-gray-500 mb-4">
                  {currentUserRole === 'ADMIN'
                    ? 'Create a group to get started'
                    : 'You\'ll see groups you\'re added to here'}
                </p>
                {currentUserRole === 'ADMIN' && (
                  <Link
                    href="/admin/messaging/new"
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium"
                  >
                    Create Group
                  </Link>
                )}
              </div>
            )}

            {/* Discover Groups */}
            {discoverableGroups.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">Discover Groups</p>
                <div className="space-y-2">
                  {discoverableGroups.map((membership) => {
                    const isPending = membership.isPending
                    const isOpen = membership.allowAllStaff
                    const isJoining = joiningGroupId === membership.groupId

                    return (
                      <div
                        key={membership.id}
                        className="bg-gray-50 border border-gray-200 rounded-lg p-3 transition-all"
                      >
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center text-base font-bold flex-shrink-0",
                            isOpen
                              ? "bg-gradient-to-br from-green-400 to-green-600 text-white"
                              : "bg-gradient-to-br from-gray-300 to-gray-500 text-white"
                          )}>
                            {membership.group.name[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <h3 className="font-semibold text-sm text-gray-900 truncate">
                                {membership.group.name}
                              </h3>
                              {isOpen ? (
                                <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-[10px] font-medium rounded">
                                  Open
                                </span>
                              ) : (
                                <Lock className="w-3 h-3 text-gray-400 flex-shrink-0" />
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-[11px] text-gray-400">
                              <span>{membership.group._count.members} members</span>
                              <span>{membership.group._count.messages} msgs</span>
                            </div>
                          </div>
                          <div className="flex-shrink-0">
                            {isPending ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-lg">
                                <Clock className="w-3 h-3" />
                                Pending
                              </span>
                            ) : (
                              <button
                                onClick={() => handleJoinGroup(membership.groupId, !!isOpen)}
                                disabled={isJoining}
                                className={cn(
                                  "inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-50",
                                  isOpen
                                    ? "bg-green-600 text-white hover:bg-green-700"
                                    : "bg-primary-600 text-white hover:bg-primary-700"
                                )}
                              >
                                {isJoining ? (
                                  'Joining...'
                                ) : isOpen ? (
                                  <><LogIn className="w-3 h-3" /> Join</>
                                ) : (
                                  <><Plus className="w-3 h-3" /> Request</>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Admin create group button */}
            {currentUserRole === 'ADMIN' && myGroups.length > 0 && (
              <Link
                href="/admin/messaging/new"
                className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-primary-400 hover:text-primary-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create New Group
              </Link>
            )}
          </div>
        )}
      </div>

      {/* New Message Modal */}
      <NewMessageModal
        isOpen={showNewMessageModal}
        onClose={() => setShowNewMessageModal(false)}
        currentUserRole={currentUserRole}
      />
    </div>
  )
}
