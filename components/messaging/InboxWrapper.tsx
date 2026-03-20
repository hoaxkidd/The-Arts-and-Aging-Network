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
        <div className="flex items-center justify-end mb-2">
          <button
            onClick={() => setShowComposeModal(true)}
            className="px-3 py-1.5 text-xs font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 flex items-center gap-1"
          >
            <Send className="w-3 h-3" />
            New Message
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-auto">
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
