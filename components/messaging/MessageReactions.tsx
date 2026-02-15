'use client'

import { useState, useEffect } from 'react'
import { Smile } from 'lucide-react'
import { addMessageReaction, getMessageReactions } from '@/app/actions/message-features'

type Reaction = {
  emoji: string
  count: number
  users: Array<{ id: string; name: string | null; preferredName: string | null }>
  hasCurrentUser: boolean
}

type Props = {
  messageId: string
  initialReactions?: Reaction[]
}

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '👏', '🔥', '🎉']

export function MessageReactions({ messageId, initialReactions = [] }: Props) {
  const [reactions, setReactions] = useState<Reaction[]>(initialReactions)
  const [showPicker, setShowPicker] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Load reactions on mount
  useEffect(() => {
    loadReactions()
  }, [messageId])

  const loadReactions = async () => {
    const result = await getMessageReactions(messageId)
    if ('reactions' in result && result.reactions) {
      setReactions(result.reactions as Reaction[])
    }
  }

  const handleReaction = async (emoji: string) => {
    setIsLoading(true)
    const result = await addMessageReaction(messageId, emoji)

    if ('success' in result) {
      await loadReactions()
    }

    setIsLoading(false)
    setShowPicker(false)
  }

  return (
    <div className="flex items-center gap-1 mt-0.5 flex-wrap">
      {/* Existing Reactions */}
      {reactions.map((reaction) => (
        <button
          key={reaction.emoji}
          onClick={() => handleReaction(reaction.emoji)}
          disabled={isLoading}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors ${
            reaction.hasCurrentUser
              ? 'bg-primary-100 border border-primary-400 text-primary-700'
              : 'bg-gray-100 border border-gray-200 text-gray-600 hover:bg-gray-200'
          }`}
          title={reaction.users.map(u => u.preferredName || u.name).join(', ')}
        >
          <span className="text-sm leading-none">{reaction.emoji}</span>
          <span className="text-[10px] font-medium leading-none">{reaction.count}</span>
        </button>
      ))}

      {/* Add Reaction Button */}
      <div className="relative">
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="p-0.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
          title="Add reaction"
        >
          <Smile className="w-3.5 h-3.5" />
        </button>

        {showPicker && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowPicker(false)}
            />
            <div className="absolute left-0 bottom-full mb-1 bg-white rounded-lg shadow-xl border border-gray-200 p-1.5 z-20 whitespace-nowrap">
              <div className="flex gap-0.5">
                {QUICK_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleReaction(emoji)}
                    disabled={isLoading}
                    className="w-7 h-7 text-base hover:bg-gray-100 rounded transition-colors disabled:opacity-50 flex items-center justify-center"
                    title={emoji}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
