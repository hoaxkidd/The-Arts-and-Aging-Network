'use client'

import { useState } from 'react'
import { Mail, Send } from 'lucide-react'
import { InboxList } from './InboxList'
import { ComposeMessageModal } from './ComposeMessageModal'

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

type Props = {
  inboxMessages: Message[]
  sentMessages: Message[]
  currentUserId: string
  unreadCount: number
}

export function InboxWrapper({ inboxMessages, sentMessages, currentUserId, unreadCount }: Props) {
  const [showComposeModal, setShowComposeModal] = useState(false)

  return (
    <>
      <div className="h-full flex flex-col">
        <header className="flex-shrink-0 pb-3 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Inbox</h1>
                <p className="text-xs text-gray-500">
                  {unreadCount > 0 ? `${unreadCount} unread messages` : 'All caught up!'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowComposeModal(true)}
              className="px-3 py-1.5 text-xs font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 flex items-center gap-1"
            >
              <Send className="w-3 h-3" />
              New Message
            </button>
          </div>
        </header>

        <div className="flex-1 min-h-0 overflow-auto mt-4">
          <InboxList
            inboxMessages={inboxMessages}
            sentMessages={sentMessages}
            currentUserId={currentUserId}
          />
        </div>
      </div>

      <ComposeMessageModal
        isOpen={showComposeModal}
        onClose={() => setShowComposeModal(false)}
      />
    </>
  )
}
