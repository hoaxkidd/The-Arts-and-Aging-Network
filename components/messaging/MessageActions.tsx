'use client'

import { useState } from 'react'
import { Edit2, Trash2, X, Check } from 'lucide-react'
import { editGroupMessage, deleteGroupMessage } from '@/app/actions/message-features'

type Props = {
  messageId: string
  content: string
  createdAt: Date
  isOwnMessage: boolean
  onEditComplete?: () => void
}

export function MessageActions({ messageId, content, createdAt, isOwnMessage, onEditComplete }: Props) {
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(content)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check if message is within 15 minutes
  const messageAge = Date.now() - new Date(createdAt).getTime()
  const fifteenMinutes = 15 * 60 * 1000
  const canEdit = isOwnMessage && messageAge < fifteenMinutes

  const handleEdit = async () => {
    if (!editContent.trim()) {
      setError('Message cannot be empty')
      return
    }

    setIsLoading(true)
    setError(null)

    const result = await editGroupMessage(messageId, editContent)

    if ('error' in result) {
      setError(result.error || 'Failed to edit message')
      setIsLoading(false)
    } else {
      setIsEditing(false)
      onEditComplete?.()
    }
    setIsLoading(false)
  }

  const handleDelete = async () => {
    if (!confirm('Delete this message? This cannot be undone.')) return

    setIsLoading(true)
    const result = await deleteGroupMessage(messageId)

    if ('error' in result) {
      alert(result.error)
      setIsLoading(false)
    } else {
      onEditComplete?.()
    }
  }

  if (!isOwnMessage || !canEdit) {
    return null
  }

  if (isEditing) {
    return (
      <div className="mt-2 space-y-2">
        <textarea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none text-sm"
          rows={3}
          autoFocus
        />
        {error && (
          <p className="text-xs text-red-600">{error}</p>
        )}
        <div className="flex items-center gap-2">
          <button
            onClick={handleEdit}
            disabled={isLoading}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            Save
          </button>
          <button
            onClick={() => {
              setIsEditing(false)
              setEditContent(content)
              setError(null)
            }}
            disabled={isLoading}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-0.5 opacity-0 group-hover/msg:opacity-100 transition-opacity">
      <button
        onClick={() => setIsEditing(true)}
        className="p-1 text-gray-400 hover:text-primary-600 rounded hover:bg-gray-100 transition-colors"
        title="Edit message"
      >
        <Edit2 className="w-3 h-3" />
      </button>
      <button
        onClick={handleDelete}
        disabled={isLoading}
        className="p-1 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors disabled:opacity-50"
        title="Delete message"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  )
}
