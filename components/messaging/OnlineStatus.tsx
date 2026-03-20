'use client'

import { useEffect } from 'react'
import { updateOnlineStatus } from '@/app/actions/online-status'

export function OnlineStatusTracker() {
  useEffect(() => {
    updateOnlineStatus(true)

    const handleOnline = () => updateOnlineStatus(true)
    const handleOffline = () => updateOnlineStatus(false)
    
    const handleActivity = () => {
      updateOnlineStatus(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('focus', handleActivity)
    window.addEventListener('mousemove', handleActivity)
    window.addEventListener('keydown', handleActivity)

    let interval: NodeJS.Timeout
    interval = setInterval(() => {
      updateOnlineStatus(true)
    }, 30000)

    const handleBeforeUnload = () => {
      updateOnlineStatus(false)
    }
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      updateOnlineStatus(false)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('focus', handleActivity)
      window.removeEventListener('mousemove', handleActivity)
      window.removeEventListener('keydown', handleActivity)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      clearInterval(interval)
    }
  }, [])

  return null
}

type OnlineStatusProps = {
  isOnline: boolean
  lastSeenAt?: Date | null
  showStatus?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function OnlineStatusBadge({ isOnline, lastSeenAt, showStatus = true, size = 'md' }: OnlineStatusProps) {
  if (!showStatus) return null

  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  }

  return (
    <span className="relative inline-flex">
      <span className={`${sizeClasses[size]} rounded-full ${isOnline ? 'bg-green-400' : 'bg-gray-300'}`} />
      {isOnline && (
        <span className={`${sizeClasses[size]} rounded-full bg-green-400 absolute inset-0 animate-ping opacity-75`} />
      )}
    </span>
  )
}

export function OnlineStatusText({ isOnline, lastSeenAt }: { isOnline: boolean, lastSeenAt?: Date | null }) {
  if (isOnline) {
    return <span className="text-green-600">Online</span>
  }

  if (lastSeenAt) {
    const diffMs = Date.now() - new Date(lastSeenAt).getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    let text = 'Last seen '
    if (diffMins < 1) text += 'just now'
    else if (diffMins < 60) text += `${diffMins}m ago`
    else if (diffHours < 24) text += `${diffHours}h ago`
    else if (diffDays === 1) text += 'yesterday'
    else text += `${diffDays}d ago`

    return <span className="text-gray-500">{text}</span>
  }

  return <span className="text-gray-500">Offline</span>
}
