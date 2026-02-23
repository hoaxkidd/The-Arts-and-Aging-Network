'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Zap, X, ExternalLink } from 'lucide-react'
import { createTestNotification, markAsRead } from '@/app/actions/notifications'
import { NotificationList } from './NotificationList'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { NOTIFICATION_REFRESH_EVENT } from '@/lib/notification-refresh'

type Notification = {
  id: string
  type: string
  title: string
  message: string
  link: string | null
  read: boolean
  createdAt: Date | string
}

type NotificationBellProps = {
  initialNotifications: Notification[]
  initialUnreadCount: number
  userRole: string
}

export function NotificationBell({ initialNotifications, initialUnreadCount }: NotificationBellProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState(initialNotifications)
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount)
  const [loading, setLoading] = useState(false)

  const refetch = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications')
      if (!res.ok) return
      const { notifications: data, unreadCount: count } = await res.json()
      setNotifications(data)
      setUnreadCount(count)
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    }
  }, [])

  // Sync when parent passes new data (e.g. after router.refresh())
  useEffect(() => {
    setNotifications(initialNotifications)
    setUnreadCount(initialUnreadCount)
  }, [initialNotifications, initialUnreadCount])

  // Real-time: SSE stream when tab visible, fallback to 2s polling on error
  useEffect(() => {
    const handleRefresh = () => refetch()
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') refetch()
    }

    let eventSource: EventSource | null = null
    let pollInterval: ReturnType<typeof setInterval> | null = null

    const startPolling = () => {
      if (pollInterval) return
      pollInterval = setInterval(refetch, 2000)
    }

    const stopPolling = () => {
      if (pollInterval) {
        clearInterval(pollInterval)
        pollInterval = null
      }
    }

    const url = new URL('/api/notifications/stream', window.location.origin)
    eventSource = new EventSource(url.toString())

    eventSource.onmessage = (e) => {
      try {
        const { notifications: data, unreadCount: count } = JSON.parse(e.data)
        setNotifications(data)
        setUnreadCount(count)
      } catch {
        // ignore parse errors
      }
    }

    eventSource.onerror = () => {
      eventSource?.close()
      eventSource = null
      startPolling()
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener(NOTIFICATION_REFRESH_EVENT, handleRefresh)

    return () => {
      eventSource?.close()
      stopPolling()
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener(NOTIFICATION_REFRESH_EVENT, handleRefresh)
    }
  }, [refetch])

  const handleNotificationClick = useCallback(async (note: Notification) => {
    if (!note.read) {
      await markAsRead(note.id)
      setNotifications((prev) => prev.map((n) => (n.id === note.id ? { ...n, read: true } : n)))
      setUnreadCount((c) => Math.max(0, c - 1))
    }
    setIsOpen(false)
    const target = note.link || '/notifications'
    router.push(target)
  }, [router])

  const handleTestNotification = async () => {
    setLoading(true)
    await createTestNotification()
    await refetch()
    setLoading(false)
  }

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "relative p-2.5 rounded-lg transition-all duration-200",
          isOpen
            ? "bg-primary-100 text-primary-700"
            : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
        )}
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center shadow-lg ring-2 ring-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/5"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div className="absolute right-0 mt-2 w-[380px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary-100 flex items-center justify-center">
                  <Bell className="w-4 h-4 text-primary-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Notifications</h3>
                  {unreadCount > 0 && (
                    <p className="text-xs text-gray-500">{unreadCount} unread</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {/* Dev Mode Test Button */}
                {process.env.NODE_ENV === 'development' && (
                  <button
                    onClick={handleTestNotification}
                    disabled={loading}
                    className="p-2 text-amber-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                    title="Generate test notification"
                  >
                    <Zap className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-[400px] overflow-y-auto overscroll-contain">
              <NotificationList
                initialNotifications={notifications}
                compact
                onNotificationClick={handleNotificationClick}
              />
            </div>

            {/* Footer */}
            <div className="border-t border-gray-100 bg-gray-50/80 p-3">
              <Link
                href="/notifications"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors"
              >
                View All Notifications
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
