'use client'

import { Clock } from 'lucide-react'

type Props = {
  lastLoginAt: Date | string | null
}

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  })
}

export function LastLoginDisplay({ lastLoginAt }: Props) {
  if (!lastLoginAt) {
    return (
      <div className="flex items-center gap-1.5 text-sm text-gray-400">
        <Clock className="w-3.5 h-3.5" />
        <span>Never logged in</span>
      </div>
    )
  }

  const date = new Date(lastLoginAt)
  const relativeTime = formatRelativeTime(date)
  const fullTime = date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })

  return (
    <div
      className="flex items-center gap-1.5 text-sm text-gray-500"
      title={`Last login: ${fullTime}`}
    >
      <Clock className="w-3.5 h-3.5" />
      <span>Last active {relativeTime}</span>
    </div>
  )
}
