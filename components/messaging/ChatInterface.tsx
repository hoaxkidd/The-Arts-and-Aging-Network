'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, ArrowLeft, Loader2, MoreVertical, Edit2, Trash2, X, Check, Paperclip, File, Image, Reply, Star, Bell, Smile } from 'lucide-react'
import { sendMessage } from '@/app/actions/conversations'
import { triggerNotificationRefresh } from '@/lib/notification-refresh'
import { editDirectMessage, deleteDirectMessage } from '@/app/actions/message-features'
import { starMessage, unstarMessage, isMessageStarred } from '@/app/actions/starred-messages'
import { createMessageReminder } from '@/app/actions/message-reminders'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import EmojiPicker from 'emoji-picker-react'
import { logger } from '@/lib/logger'

type Attachment = {
  name: string
  url: string
  type: string
  size: number
  isImage?: boolean
}

type ReplyTo = {
  id: string
  content: string
  senderName: string
}

type Message = {
  id: string
  content: string
  contentHtml?: string | null
  attachments?: string | null
  editedAt?: Date | null
  createdAt: Date
  senderId: string
  replyToId?: string | null
  replyTo?: {
    id: string
    content: string
    sender: {
      name: string | null
      preferredName: string | null
    }
  } | null
  sender: {
    id: string
    name: string | null
    preferredName: string | null
    image: string | null
  }
}

type Partner = {
  id: string
  userCode?: string | null
  name: string | null
  preferredName: string | null
  image: string | null
  role: string
}

type Props = {
  partner: Partner
  messages: Message[]
  currentUserId: string
  /** When provided (e.g. admin context), use this instead of Link to /staff/inbox */
  onBack?: () => void
}

export function ChatInterface({ partner, messages, currentUserId, onBack }: Props) {
  const [newMessage, setNewMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [replyTo, setReplyTo] = useState<ReplyTo | null>(null)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [starredMessages, setStarredMessages] = useState<Set<string>>(new Set())
  const [showReminderModal, setShowReminderModal] = useState(false)
  const [reminderMessageId, setReminderMessageId] = useState<string | null>(null)
  const [reminderNote, setReminderNote] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // Scroll to bottom on mount and when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Load starred status for messages
  useEffect(() => {
    async function loadStarredStatus() {
      const newStarred = new Set<string>()
      for (const msg of messages) {
        const result = await isMessageStarred(msg.id)
        if (result.success && result.isStarred) {
          newStarred.add(msg.id)
        }
      }
      setStarredMessages(newStarred)
    }
    loadStarredStatus()
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
    if ((!newMessage.trim() && attachments.length === 0) || isSending) return

    setIsSending(true)
    const content = newMessage.trim()
    setNewMessage('')
    setAttachments([])
    setReplyTo(null)

    const result = await sendMessage(partner.id, content, undefined, attachments.length > 0 ? attachments : undefined, replyTo?.id)

    if (result.error) {
      alert(result.error)
      setNewMessage(content)
      setAttachments(attachments)
      setReplyTo(replyTo)
    } else {
      triggerNotificationRefresh()
      router.refresh()
    }

    setIsSending(false)
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return

    setIsUploading(true)
    
    for (const file of Array.from(files)) {
      const formData = new FormData()
      formData.append('file', file)

      try {
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })
        
        if (!response.ok) {
          const error = await response.json()
          alert(error.error || 'Failed to upload file')
          continue
        }

        const data = await response.json()
        if (data.success) {
          setAttachments(prev => [...prev, {
            name: data.data.name,
            url: data.data.url,
            type: data.data.type,
            size: data.data.size,
            isImage: data.data.isImage,
          }])
        }
      } catch (error) {
        logger.serverAction('Upload error:', error)
        alert('Failed to upload file')
      }
    }

    setIsUploading(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  function removeAttachment(index: number) {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  function handleReply(message: Message) {
    const senderName = message.sender.preferredName || message.sender.name || 'Unknown'
    setReplyTo({
      id: message.id,
      content: message.content,
      senderName,
    })
  }

  function cancelReply() {
    setReplyTo(null)
  }

  async function toggleStar(messageId: string) {
    const isStarred = starredMessages.has(messageId)
    
    if (isStarred) {
      const result = await unstarMessage(messageId)
      if (!result.error) {
        setStarredMessages(prev => {
          const newSet = new Set(prev)
          newSet.delete(messageId)
          return newSet
        })
      }
    } else {
      const result = await starMessage(messageId, 'DIRECT')
      if (!result.error) {
        setStarredMessages(prev => new Set(prev).add(messageId))
      }
    }
  }

  async function handleSetReminder() {
    if (!reminderMessageId) return

    const remindAt = new Date()
    remindAt.setHours(remindAt.getHours() + 1)

    const result = await createMessageReminder({
      messageId: reminderMessageId,
      messageType: 'DIRECT',
      remindAt,
      note: reminderNote || undefined
    })

    if (!result.error) {
      alert('Reminder set!')
    } else {
      alert(result.error)
    }

    setShowReminderModal(false)
    setReminderMessageId(null)
    setReminderNote('')
  }

  function handleEmojiClick(emoji: string) {
    setNewMessage(prev => prev + emoji)
    setShowEmojiPicker(false)
  }

  function scrollToMessage(messageId: string) {
    const element = document.getElementById(`message-${messageId}`)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      element.classList.add('bg-yellow-50')
      setTimeout(() => element.classList.remove('bg-yellow-50'), 2000)
    }
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
    return messageAge < fifteenMinutes
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white shadow-sm shrink-0 safe-area-top">
        {onBack ? (
          <button
            onClick={onBack}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center -ml-2 text-gray-600 hover:bg-gray-100 active:bg-gray-200 rounded-lg lg:hidden touch-manipulation"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        ) : (
          <Link
            href="/staff/inbox"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center -ml-2 text-gray-600 hover:bg-gray-100 active:bg-gray-200 rounded-lg lg:hidden touch-manipulation"
            aria-label="Back to inbox"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
        )}

        <Link
          href={`/staff/directory/${partner.userCode || partner.id}`}
          className="flex items-center gap-3 flex-1 min-h-[44px] hover:bg-gray-50 active:bg-gray-100 -mx-2 px-2 py-2 rounded-lg transition-colors touch-manipulation"
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
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 bg-gray-50 overscroll-contain">
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
                    <div className="flex flex-col gap-2 max-w-[85%] sm:max-w-[70%] ml-auto">
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
                    "max-w-[85%] sm:max-w-[70%] px-4 py-2 rounded-2xl relative",
                    isCurrentUser
                          ? "bg-primary-600 text-white rounded-br-sm"
                          : "bg-white border border-gray-200 text-gray-900 rounded-bl-sm"
                      )}>
                        {/* Reply context */}
                        {message.replyTo && (
                          <div 
                            onClick={() => scrollToMessage(message.replyTo!.id)}
                            className={cn(
                              "mb-2 pb-2 border-b text-xs cursor-pointer hover:opacity-80",
                              isCurrentUser ? "border-primary-400 text-primary-100" : "border-gray-200 text-gray-500"
                            )}
                          >
                            <span className="font-medium">Replying to {message.replyTo.sender.preferredName || message.replyTo.sender.name || 'Unknown'}</span>
                            <p className="truncate">{message.replyTo.content}</p>
                          </div>
                        )}
                        
                        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>

                        {/* Attachments */}
                        {message.attachments && (() => {
                          try {
                            const attachments = JSON.parse(message.attachments) as Attachment[]
                            if (attachments && attachments.length > 0) {
                              return (
                                <div className="mt-2 space-y-1">
                                  {attachments.map((att, idx) => (
                                    <a
                                      key={idx}
                                      href={att.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className={cn(
                                        "flex items-center gap-2 p-2 rounded text-xs hover:opacity-80",
                                        isCurrentUser ? "bg-primary-500" : "bg-gray-100"
                                      )}
                                    >
                                      {att.isImage ? (
                                        <Image className="w-4 h-4" aria-hidden="true" />
                                      ) : (
                                        <File className="w-4 h-4" aria-hidden="true" />
                                      )}
                                      <span className="truncate">{att.name}</span>
                                    </a>
                                  ))}
                                </div>
                              )
                            }
                          } catch {
                            return null
                          }
                        })()}

                        <p className={cn(
                          "text-xs mt-1",
                          isCurrentUser ? "text-primary-100" : "text-gray-500"
                        )}>
                          {formatTime(message.createdAt)}
                          {message.editedAt && <span className="ml-1">(edited)</span>}
                        </p>
                      </div>

                      {/* Message actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {/* Reply button - visible to all */}
                        <button
                          onClick={() => handleReply(message)}
                          className="min-w-[44px] min-h-[44px] flex items-center justify-center -m-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 active:bg-gray-200 rounded-full transition-colors"
                          title="Reply"
                        >
                          <Reply className="w-4 h-4" />
                        </button>

                        {/* Star button - visible to all */}
                        <button
                          onClick={() => toggleStar(message.id)}
                          className="min-w-[44px] min-h-[44px] flex items-center justify-center -m-1.5 text-gray-400 hover:text-yellow-500 hover:bg-gray-100 active:bg-gray-200 rounded-full transition-colors"
                          title={starredMessages.has(message.id) ? "Unstar" : "Star"}
                        >
                          <Star className={cn("w-4 h-4", starredMessages.has(message.id) && "fill-yellow-500 text-yellow-500")} />
                        </button>

                        {/* Reminder button - visible to all */}
                        <button
                          onClick={() => {
                            setReminderMessageId(message.id)
                            setShowReminderModal(true)
                          }}
                          className="min-w-[44px] min-h-[44px] flex items-center justify-center -m-1.5 text-gray-400 hover:text-primary-600 hover:bg-gray-100 active:bg-gray-200 rounded-full transition-colors"
                          title="Set reminder"
                        >
                          <Bell className="w-4 h-4" />
                        </button>

                        {isCurrentUser && canEditOrDelete(message.createdAt) && (
                          <div className="relative">
                            <button
                              onClick={() => setActiveMenu(activeMenu === message.id ? null : message.id)}
                              className="min-w-[44px] min-h-[44px] flex items-center justify-center -m-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 active:bg-gray-200 rounded-full transition-colors"
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
      <form onSubmit={handleSend} className="p-4 border-t border-gray-200 bg-white shrink-0 safe-area-bottom safe-area-x">
        {/* Reply context bar */}
        {replyTo && (
          <div className="mb-2 px-3 py-2 bg-gray-100 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Reply className="w-4 h-4 text-gray-500" />
              <span className="text-gray-600">Replying to <span className="font-medium">{replyTo.senderName}</span></span>
            </div>
            <button type="button" onClick={cancelReply} className="text-gray-500 hover:text-gray-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Attachments preview */}
        {attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {attachments.map((att, idx) => (
              <div key={idx} className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-sm">
                <span className="sr-only">{att.isImage ? 'Image' : 'File'}</span>
                {att.isImage ? <Image className="w-4 h-4" aria-hidden="true" /> : <File className="w-4 h-4" aria-hidden="true" />}
                <span className="max-w-[100px] truncate">{att.name}</span>
                <button
                  type="button"
                  onClick={() => removeAttachment(idx)}
                  className="text-gray-500 hover:text-red-500"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2">
          {/* File attachment button */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            multiple
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full disabled:opacity-50"
          >
            {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
          </button>

          {/* Emoji Picker Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
            >
              <Smile className="w-5 h-5" />
            </button>

            {showEmojiPicker && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowEmojiPicker(false)} />
                <div className="absolute bottom-full left-0 mb-2 z-20">
                  <EmojiPicker
                    onEmojiClick={(emoji) => handleEmojiClick(emoji.emoji)}
                    width={300}
                    height={400}
                    previewConfig={{ showPreview: false }}
                    skinTonesDisabled
                    searchDisabled={false}
                  />
                </div>
              </>
            )}
          </div>

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
            className="flex-1 px-4 py-3 text-base bg-gray-100 border-0 rounded-full focus:ring-2 focus:ring-primary-500 focus:bg-white resize-none min-h-[44px] max-h-[120px] touch-manipulation"
          />
          <button
            type="submit"
            disabled={!newMessage.trim() && attachments.length === 0 || isSending}
            className="min-w-[44px] min-h-[44px] bg-primary-600 text-white rounded-full hover:bg-primary-700 active:bg-primary-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center flex-shrink-0 transition-colors touch-manipulation"
          >
            {isSending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        <p className="hidden sm:block text-xs text-gray-500 mt-2 px-2">
          Press Enter to send, Shift+Enter for new line • Attach files up to 15MB
        </p>
      </form>

      {/* Reminder Modal */}
      {showReminderModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-sm">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Set Reminder</h2>
              <button
                onClick={() => {
                  setShowReminderModal(false)
                  setReminderMessageId(null)
                  setReminderNote('')
                }}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <p className="text-sm text-gray-600">
                You'll be reminded about this message in 1 hour.
              </p>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Note (optional)</label>
                <textarea
                  value={reminderNote}
                  onChange={(e) => setReminderNote(e.target.value)}
                  placeholder="Add a note for yourself..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowReminderModal(false)
                  setReminderMessageId(null)
                  setReminderNote('')
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSetReminder}
                className="flex items-center gap-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm"
              >
                <Bell className="w-4 h-4" />
                Set Reminder
              </button>
            </div>
          </div>
        </div>
      )}
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
