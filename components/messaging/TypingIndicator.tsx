'use client'

import { useState, useEffect, useRef } from 'react'
import { getTypingUsers, setTyping, clearTyping } from '@/app/actions/typing-indicators'

type TypingUser = {
  user: {
    id: string
    name: string | null
    preferredName: string | null
  }
}

type TypingIndicatorProps = {
  targetType: 'DIRECT' | 'GROUP'
  targetId: string
  currentUserId: string
}

export function TypingIndicator({ targetType, targetId, currentUserId }: TypingIndicatorProps) {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([])
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastClearRef = useRef<number>(0)

  useEffect(() => {
    const interval = setInterval(async () => {
      const result = await getTypingUsers(targetType, targetId, currentUserId)
      if (result.success && result.data) {
        setTypingUsers(result.data as TypingUser[])
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [targetType, targetId, currentUserId])

  function handleTyping() {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    setTyping(targetType, targetId)

    const now = Date.now()
    if (now - lastClearRef.current > 3000) {
      lastClearRef.current = now
      typingTimeoutRef.current = setTimeout(() => {
        clearTyping(targetType, targetId)
      }, 3000)
    }
  }

  function getTypingText(): string {
    if (typingUsers.length === 0) return ''
    
    const names = typingUsers.map(u => u.user.preferredName || u.user.name || 'Someone')
    
    if (names.length === 1) {
      return `${names[0]} is typing...`
    } else if (names.length === 2) {
      return `${names[0]} and ${names[1]} are typing...`
    } else {
      return `${names[0]} and ${names.length - 1} others are typing...`
    }
  }

  const typingText = getTypingText()

  if (!typingText) return null

  return (
    <div className="flex items-center gap-2 px-4 py-1 text-sm text-gray-500">
      <span className="flex gap-0.5">
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </span>
      <span className="text-xs">{typingText}</span>
    </div>
  )
}

export function useTypingIndicator(targetType: 'DIRECT' | 'GROUP', targetId: string) {
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  function startTyping() {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    setTyping(targetType, targetId)

    typingTimeoutRef.current = setTimeout(() => {
      clearTyping(targetType, targetId)
    }, 3000)
  }

  function stopTyping() {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    clearTyping(targetType, targetId)
  }

  return { startTyping, stopTyping }
}
