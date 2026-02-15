'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Users as UsersIcon, X, LogOut, UserMinus } from 'lucide-react'
import { sendGroupMessage, getGroupMessages, removeGroupMember, leaveGroup } from '@/app/actions/messaging'
import { cn } from '@/lib/utils'
import { MessageActions } from './MessageActions'
import { MessageReactions } from './MessageReactions'
import { useRouter } from 'next/navigation'

type Message = {
  id: string
  content: string
  editedAt?: Date | null
  createdAt: Date
  senderId: string
  sender: {
    id: string
    name: string | null
    preferredName: string | null
    image: string | null
  }
}

type Member = {
  id: string
  userId: string
  role: string
  isActive: boolean
  isMuted: boolean
  lastReadAt: Date | null
  joinedAt: Date
  groupId: string
  user: {
    id: string
    name: string | null
    email: string
    preferredName: string | null
    image: string | null
    role: string
  }
}

type MessageThreadProps = {
  groupId: string
  currentUserId: string
  currentUserRole?: string
  initialMessages: Message[]
  members: Member[]
  isMuted: boolean
}

export function MessageThread({
  groupId,
  currentUserId,
  currentUserRole = 'VOLUNTEER',
  initialMessages,
  members,
  isMuted
}: MessageThreadProps) {
  const [messages, setMessages] = useState(initialMessages)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [showMembers, setShowMembers] = useState(false)
  const [removingUserId, setRemovingUserId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const router = useRouter()

  const isAdmin = currentUserRole === 'ADMIN'

  // Sync with new initialMessages when they change (e.g. parent re-fetches)
  useEffect(() => {
    setMessages(initialMessages)
  }, [initialMessages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Re-fetch messages from server to ensure consistency
  const refreshMessages = useCallback(async () => {
    try {
      const result = await getGroupMessages(groupId)
      if (result.success && result.data) {
        setMessages(result.data)
      }
    } catch (e) {
      console.error('Failed to refresh messages:', e)
    }
  }, [groupId])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || sending || isMuted) return

    const messageContent = newMessage.trim()
    setSending(true)
    setNewMessage('')

    const result = await sendGroupMessage(groupId, messageContent)

    if (result.success) {
      // Re-fetch from server to get properly formatted messages
      await refreshMessages()
      textareaRef.current?.focus()
    } else if (result.error) {
      // Restore the message on error
      setNewMessage(messageContent)
      alert(result.error)
    }

    setSending(false)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend(e)
    }
  }

  const handleRemoveMember = async (userId: string, name: string) => {
    if (!confirm(`Remove ${name} from this group?`)) return
    setRemovingUserId(userId)
    const result = await removeGroupMember(groupId, userId)
    if (result.error) {
      alert(result.error)
    } else {
      router.refresh()
    }
    setRemovingUserId(null)
  }

  const handleLeaveGroup = async () => {
    if (!confirm('Leave this group? You can rejoin later.')) return
    const result = await leaveGroup(groupId)
    if (result.error) {
      alert(result.error)
    } else {
      router.push('/staff/inbox')
    }
  }

  return (
    <div className="h-full flex flex-col relative">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4 custom-scrollbar">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
              <UsersIcon className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-900">No messages yet</p>
            <p className="text-xs text-gray-500 mt-1">Be the first to start the conversation</p>
          </div>
        ) : (
          <>
            {messages.map((message, index) => {
              const isCurrentUser = message.senderId === currentUserId
              const showAvatar = index === 0 || messages[index - 1].senderId !== message.senderId
              const showName = showAvatar

              return (
                <div key={message.id} className="group/msg">
                  <div className={cn(
                    "flex gap-2",
                    isCurrentUser ? "flex-row-reverse" : "flex-row"
                  )}>
                    {/* Avatar */}
                    <div className="flex-shrink-0 w-8">
                      {showAvatar && !isCurrentUser && (
                        <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-medium">
                          {message.sender.name?.[0] || 'U'}
                        </div>
                      )}
                    </div>

                    {/* Message bubble */}
                    <div className={cn(
                      "flex flex-col max-w-[70%]",
                      isCurrentUser && "items-end"
                    )}>
                      {showName && !isCurrentUser && (
                        <p className="text-xs text-gray-600 mb-1 px-3">
                          {message.sender.preferredName || message.sender.name}
                        </p>
                      )}

                      <div className="flex items-start gap-2">
                        <div className={cn(
                          "rounded-2xl px-4 py-2",
                          isCurrentUser
                            ? "bg-primary-600 text-white"
                            : "bg-gray-100 text-gray-900"
                        )}>
                          <p className="text-sm whitespace-pre-wrap break-words">
                            {message.content}
                          </p>
                        </div>

                        {isCurrentUser && (
                          <MessageActions
                            messageId={message.id}
                            content={message.content}
                            createdAt={message.createdAt}
                            isOwnMessage={true}
                            onEditComplete={refreshMessages}
                          />
                        )}
                      </div>

                      <p className={cn(
                        "text-[11px] text-gray-400 mt-1 px-1",
                        isCurrentUser && "text-right"
                      )}>
                        {new Date(message.createdAt).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit'
                        })}
                        {message.editedAt && <span className="ml-1 italic">(edited)</span>}
                      </p>
                    </div>
                  </div>

                  {/* Reactions - outside the max-w constraint */}
                  <div className={cn(
                    "ml-10",
                    isCurrentUser && "ml-0 mr-10 flex justify-end"
                  )}>
                    <MessageReactions messageId={message.id} />
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Members Sidebar (Toggle) */}
      {showMembers && (
        <div className="absolute right-0 top-0 bottom-0 w-72 bg-white border-l border-gray-200 shadow-lg z-10 flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900 text-sm">Members ({members.length})</h3>
            <button
              onClick={() => setShowMembers(false)}
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {members.map(member => (
              <div key={member.user.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 group/member">
                <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-medium flex-shrink-0">
                  {member.user.name?.[0] || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {member.user.preferredName || member.user.name}
                    {member.user.id === currentUserId && (
                      <span className="text-xs text-gray-400 ml-1">(you)</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500">{member.user.role}</p>
                </div>
                {/* Admin remove button (can't remove self) */}
                {isAdmin && member.user.id !== currentUserId && (
                  <button
                    onClick={() => handleRemoveMember(member.user.id, member.user.preferredName || member.user.name || 'this user')}
                    disabled={removingUserId === member.user.id}
                    className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded opacity-0 group-hover/member:opacity-100 transition-all disabled:opacity-50"
                    title="Remove from group"
                  >
                    <UserMinus className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Leave group button */}
          {!isAdmin && (
            <div className="p-3 border-t border-gray-200">
              <button
                onClick={handleLeaveGroup}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Leave Group
              </button>
            </div>
          )}
        </div>
      )}

      {/* Input Area */}
      <div className="flex-shrink-0 border-t border-gray-200 p-4 bg-white">
        {isMuted ? (
          <div className="text-center py-2">
            <p className="text-sm text-gray-500">You are muted in this group</p>
          </div>
        ) : (
          <form onSubmit={handleSend} className="flex gap-2">
            <textarea
              ref={textareaRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              rows={1}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
              style={{ maxHeight: '120px' }}
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || sending}
              className="px-4 py-2 bg-primary-600 text-white rounded-full hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        )}

        <button
          onClick={() => setShowMembers(!showMembers)}
          className="mt-2 text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
        >
          <UsersIcon className="w-3 h-3" />
          {showMembers ? 'Hide' : 'Show'} members ({members.length})
        </button>
      </div>
    </div>
  )
}
