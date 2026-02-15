'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, ArrowLeft, Loader2, MoreVertical, Edit2, Trash2, X, Check } from 'lucide-react'
import { sendMessage } from '@/app/actions/conversations'
import { editDirectMessage, deleteDirectMessage } from '@/app/actions/message-features'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'

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

type Partner = {
  id: string
  name: string | null
  preferredName: string | null
  image: string | null
  role: string
}

type Props = {
  partner: Partner
  messages: Message[]
  currentUserId: string
}

export function ChatInterface({ partner, messages, currentUserId }: Props) {
  const [newMessage, setNewMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Scroll to bottom on mount and when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (!partner) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center bg-gray-50">
        <p className="text-gray-500">Select a conversation to start messaging</p>
      </div>
    )
  }

  const displayName = partner.preferredName || partner.name || 'Unknown User'

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!newMessage.trim() || isSending) return

    setIsSending(true)
    const content = newMessage.trim()
    setNewMessage('') // Clear input immediately for better UX

    const result = await sendMessage(partner.id, content)

    if (result.error) {
      alert(result.error)
      setNewMessage(content) // Restore message on error
    } else {
      router.refresh()
    }

    setIsSending(false)
  }

  async function handleEdit(messageId: string) {
    if (!editContent.trim()) return

    const result = await editDirectMessage(messageId, editContent)
    if (result.error) {
      alert(result.error)
    } else {
      setEditingMessageId(null)
      setEditContent('')
      router.refresh()
    }
  }

  async function handleDelete(messageId: string) {
    if (!confirm('Delete this message? This cannot be undone.')) return

    const result = await deleteDirectMessage(messageId)
    if (result.error) {
      alert(result.error)
    } else {
      setActiveMenu(null)
      router.refresh()
    }
  }

  function canEditOrDelete(messageCreatedAt: Date): boolean {
    const messageAge = Date.now() - new Date(messageCreatedAt).getTime()
    const fifteenMinutes = 15 * 60 * 1000
    const canEdit = messageAge < fifteenMinutes
    console.log('Can edit/delete message?', {
      messageAge: Math.floor(messageAge / 1000) + 's',
      fifteenMinutes: '900s',
      canEdit
    })
    return canEdit
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white shadow-sm">
        <Link
          href="/staff/inbox"
          className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg lg:hidden"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>

        <Link
          href={`/staff/directory/${partner.id}`}
          className="flex items-center gap-3 flex-1 hover:bg-gray-50 -mx-2 px-2 py-1 rounded-lg transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-white flex items-center justify-center font-semibold text-lg flex-shrink-0">
            {displayName?.[0]?.toUpperCase() || 'U'}
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">{displayName}</h2>
            <p className="text-xs text-gray-500">{partner.role}</p>
          </div>
        </Link>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-white flex items-center justify-center font-bold text-2xl mb-3">
              {displayName?.[0]?.toUpperCase() || 'U'}
            </div>
            <p className="text-sm font-medium text-gray-900 mb-1">{displayName}</p>
            <p className="text-xs text-gray-500">Send a message to start the conversation</p>
          </div>
        ) : (
          <>
            {messages.map((message, index) => {
              const isCurrentUser = message.senderId === currentUserId
              const showDate = index === 0 || !isSameDay(messages[index - 1].createdAt, message.createdAt)

              return (
                <div key={message.id}>
                  {showDate && (
                    <div className="flex justify-center my-4">
                      <span className="px-3 py-1 bg-gray-200 text-gray-600 text-xs font-medium rounded-full">
                        {formatDate(message.createdAt)}
                      </span>
                    </div>
                  )}

                  {editingMessageId === message.id ? (
                    // Edit Mode
                    <div className="flex flex-col gap-2 max-w-[70%] ml-auto">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-primary-500"
                        rows={3}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(message.id)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700"
                        >
                          <Check className="w-4 h-4" /> Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingMessageId(null)
                            setEditContent('')
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300"
                        >
                          <X className="w-4 h-4" /> Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className={cn(
                      "flex items-start gap-2 group",
                      isCurrentUser ? "justify-end" : "justify-start"
                    )}>
                      {!isCurrentUser && (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-white flex items-center justify-center font-semibold text-sm flex-shrink-0">
                          {displayName?.[0]?.toUpperCase() || 'U'}
                        </div>
                      )}

                      <div className={cn(
                        "max-w-[70%] px-4 py-2 rounded-2xl relative",
                        isCurrentUser
                          ? "bg-primary-600 text-white rounded-br-sm"
                          : "bg-white border border-gray-200 text-gray-900 rounded-bl-sm"
                      )}>
                        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                        <p className={cn(
                          "text-xs mt-1",
                          isCurrentUser ? "text-primary-100" : "text-gray-500"
                        )}>
                          {formatTime(message.createdAt)}
                          {message.editedAt && <span className="ml-1">(edited)</span>}
                        </p>
                      </div>

                      {isCurrentUser && canEditOrDelete(message.createdAt) && (
                        <div className="relative flex-shrink-0">
                          <button
                            onClick={() => setActiveMenu(activeMenu === message.id ? null : message.id)}
                            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {activeMenu === message.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setActiveMenu(null)} />
                              <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                                <button
                                  onClick={() => {
                                    setEditingMessageId(message.id)
                                    setEditContent(message.content)
                                    setActiveMenu(null)
                                  }}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                >
                                  <Edit2 className="w-4 h-4" /> Edit
                                </button>
                                <button
                                  onClick={() => handleDelete(message.id)}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4" /> Delete
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-4 border-t border-gray-200 bg-white">
        <div className="flex items-end gap-2">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend(e)
              }
            }}
            placeholder={`Message ${displayName}...`}
            rows={1}
            className="flex-1 px-4 py-2.5 bg-gray-100 border-0 rounded-full focus:ring-2 focus:ring-primary-500 focus:bg-white resize-none text-sm"
            style={{ minHeight: '42px', maxHeight: '120px' }}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || isSending}
            className="w-10 h-10 bg-primary-600 text-white rounded-full hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center flex-shrink-0 transition-colors"
          >
            {isSending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2 px-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </form>
    </div>
  )
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}

function formatDate(date: Date): string {
  const messageDate = new Date(date)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (isSameDay(messageDate, today)) return 'Today'
  if (isSameDay(messageDate, yesterday)) return 'Yesterday'

  return messageDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  })
}

function isSameDay(date1: Date, date2: Date): boolean {
  const d1 = new Date(date1)
  const d2 = new Date(date2)
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
}
