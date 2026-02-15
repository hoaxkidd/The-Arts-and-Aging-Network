'use client'

import { X, Reply, User } from 'lucide-react'
import { useState } from 'react'
import Link from 'next/link'

type Message = {
  id: string
  subject: string
  content: string
  createdAt: Date
  sender?: {
    id: string
    name: string | null
    preferredName: string | null
    role: string
  }
  recipient?: {
    id: string
    name: string | null
    preferredName: string | null
    role: string
  }
}

type MessageDetailModalProps = {
  message: Message
  isInbox: boolean
  onClose: () => void
}

export function MessageDetailModal({ message, isInbox, onClose }: MessageDetailModalProps) {
  const otherUser = isInbox ? message.sender : message.recipient

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">{message.subject}</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message Info */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-sm font-medium">
              {otherUser?.name?.[0] || 'U'}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">
                {isInbox ? 'From:' : 'To:'} {otherUser?.preferredName || otherUser?.name}
              </p>
              <p className="text-xs text-gray-500">{otherUser?.role}</p>
            </div>
          </div>
          <p className="text-xs text-gray-500">
            {new Date(message.createdAt).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit'
            })}
          </p>
        </div>

        {/* Message Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="prose prose-sm max-w-none">
            <p className="whitespace-pre-wrap text-gray-700">{message.content}</p>
          </div>
        </div>

        {/* Actions */}
        {isInbox && (
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <Link
              href={`/staff/directory/${otherUser?.id}`}
              className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium flex items-center justify-center gap-2"
            >
              <Reply className="w-4 h-4" />
              Reply
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
