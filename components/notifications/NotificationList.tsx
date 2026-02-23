'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Bell, Calendar, UserCheck, AlertCircle, Info, Trash2, CheckCheck,
  ThumbsUp, Reply, Heart, Clock, MessageSquare, Users, UserPlus,
  UserMinus, FileText, MapPin, Phone, Video
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { markAsRead, deleteNotification, markAllAsRead, clearAllNotifications } from '@/app/actions/notifications'
import { NOTIFICATION_REFRESH_EVENT } from '@/lib/notification-refresh'
import Link from 'next/link'

type Notification = {
  id: string
  type: string
  title: string
  message: string
  link: string | null
  read: boolean
  createdAt: Date | string
}

type NotificationListProps = {
  initialNotifications: Notification[]
  compact?: boolean
  onNotificationClick?: (note: Notification) => void
}

function getNotificationStyle(type: string) {
  switch (type) {
    case 'EVENT_CREATED':
    case 'EVENT_UPDATED':
      return { icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50', ring: 'ring-blue-100' }
    case 'EVENT_CANCELLED':
      return { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50', ring: 'ring-red-100' }
    case 'RSVP_RECEIVED':
    case 'STAFF_CHECKIN':
      return { icon: UserCheck, color: 'text-green-600', bg: 'bg-green-50', ring: 'ring-green-100' }
    case 'EXPENSE_SUBMITTED':
    case 'EXPENSE_APPROVED':
    case 'EXPENSE_REJECTED':
      return { icon: Info, color: 'text-amber-600', bg: 'bg-amber-50', ring: 'ring-amber-100' }
    case 'DIRECT_MESSAGE':
      return { icon: MessageSquare, color: 'text-indigo-600', bg: 'bg-indigo-50', ring: 'ring-indigo-100' }
    case 'GROUP_MESSAGE':
      return { icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50', ring: 'ring-indigo-100' }
    case 'GROUP_ACCESS_REQUEST':
      return { icon: UserPlus, color: 'text-orange-600', bg: 'bg-orange-50', ring: 'ring-orange-100' }
    case 'GROUP_ACCESS_APPROVED':
    case 'GROUP_ADDED':
      return { icon: UserPlus, color: 'text-green-600', bg: 'bg-green-50', ring: 'ring-green-100' }
    case 'GROUP_ACCESS_DENIED':
    case 'GROUP_REMOVED':
    case 'GROUP_MEMBER_LEFT':
      return { icon: UserMinus, color: 'text-red-600', bg: 'bg-red-50', ring: 'ring-red-100' }
    case 'TIMESHEET_SUBMITTED':
    case 'TIMESHEET_APPROVED':
    case 'TIMESHEET_REJECTED':
      return { icon: FileText, color: 'text-cyan-600', bg: 'bg-cyan-50', ring: 'ring-cyan-100' }
    case 'MILEAGE_APPROVED':
    case 'MILEAGE_REJECTED':
      return { icon: MapPin, color: 'text-teal-600', bg: 'bg-teal-50', ring: 'ring-teal-100' }
    case 'PHONE_REQUEST':
    case 'PHONE_REQUEST_RESPONSE':
      return { icon: Phone, color: 'text-violet-600', bg: 'bg-violet-50', ring: 'ring-violet-100' }
    case 'MEETING_REQUEST':
    case 'MEETING_REQUEST_RESPONSE':
      return { icon: Video, color: 'text-sky-600', bg: 'bg-sky-50', ring: 'ring-sky-100' }
    case 'COMMENT_REPLY':
      return { icon: Reply, color: 'text-purple-600', bg: 'bg-purple-50', ring: 'ring-purple-100' }
    case 'COMMENT_REACTION':
      return { icon: ThumbsUp, color: 'text-pink-600', bg: 'bg-pink-50', ring: 'ring-pink-100' }
    case 'PHOTO_REACTION':
      return { icon: Heart, color: 'text-red-500', bg: 'bg-red-50', ring: 'ring-red-100' }
    default:
      return { icon: Bell, color: 'text-gray-600', bg: 'bg-gray-100', ring: 'ring-gray-200' }
  }
}

function formatTime(date: Date | string) {
  const now = new Date()
  const d = new Date(date)
  const diff = now.getTime() - d.getTime()

  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function NotificationList({ initialNotifications, compact = false, onNotificationClick }: NotificationListProps) {
  const [notifications, setNotifications] = useState(initialNotifications)

  const refetch = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications')
      if (!res.ok) return
      const { notifications: latest } = await res.json()
      setNotifications(latest)
    } catch (e) {
      console.error(e)
    }
  }, [])

  // Sync when parent passes new data (compact mode: NotificationBell provides data)
  useEffect(() => {
    setNotifications(initialNotifications)
  }, [initialNotifications])

  // Full page: poll every 5s and listen for refresh events
  useEffect(() => {
    if (compact) return // Parent NotificationBell handles polling
    const handleRefresh = () => refetch()
    const interval = setInterval(refetch, 5000)
    window.addEventListener(NOTIFICATION_REFRESH_EVENT, handleRefresh)
    return () => {
      clearInterval(interval)
      window.removeEventListener(NOTIFICATION_REFRESH_EVENT, handleRefresh)
    }
  }, [compact, refetch])

  const handleMarkRead = async (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    await markAsRead(id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    await deleteNotification(id)
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const handleMarkAllRead = async () => {
    await markAllAsRead()
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to clear all notifications?')) return
    await clearAllNotifications()
    setNotifications([])
  }

  // Grouping logic
  const grouped = notifications.reduce((acc, note) => {
    const d = new Date(note.createdAt)
    const now = new Date()
    const isToday = d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    const isYesterday = d.getDate() === now.getDate() - 1 && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()

    const key = isToday ? 'Today' : isYesterday ? 'Yesterday' : 'Older'
    if (!acc[key]) acc[key] = []
    acc[key].push(note)
    return acc
  }, {} as Record<string, Notification[]>)

  const groups = ['Today', 'Yesterday', 'Older'].filter(k => grouped[k]?.length > 0)

  if (notifications.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center text-center", compact ? "py-8" : "py-16")}>
        <div className={cn("rounded-full bg-gray-100 flex items-center justify-center mb-4", compact ? "w-12 h-12" : "w-20 h-20")}>
          <Bell className={cn("text-gray-400", compact ? "w-6 h-6" : "w-10 h-10")} />
        </div>
        <h3 className={cn("font-semibold text-gray-900", compact ? "text-sm" : "text-lg")}>All caught up!</h3>
        <p className={cn("text-gray-500 max-w-xs mx-auto", compact ? "text-xs mt-1" : "text-sm mt-2")}>
          No new notifications at the moment.
        </p>
      </div>
    )
  }

  return (
    <div className={compact ? "divide-y divide-gray-100" : "space-y-6"}>
      {/* Action Bar - Only in full view */}
      {!compact && (
        <div className="flex items-center justify-between pb-4 border-b border-gray-200">
          <p className="text-sm text-gray-500">
            <span className="font-semibold text-gray-900">{notifications.filter(n => !n.read).length}</span> unread notifications
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={handleMarkAllRead}
              className="text-sm font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1.5 px-3 py-1.5 hover:bg-primary-50 rounded-lg transition-colors"
            >
              <CheckCheck className="w-4 h-4" /> Mark all read
            </button>
            <button
              onClick={handleClearAll}
              className="text-sm font-medium text-red-600 hover:text-red-700 flex items-center gap-1.5 px-3 py-1.5 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" /> Clear all
            </button>
          </div>
        </div>
      )}

      {groups.map(group => (
        <div key={group} className={compact ? "" : "space-y-3"}>
          {/* Group Header */}
          {!compact && (
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2 px-1">
              <Clock className="w-3.5 h-3.5" />
              {group}
            </h4>
          )}

          <div className={compact ? "" : "space-y-2"}>
            {grouped[group].map(note => {
              const style = getNotificationStyle(note.type)
              const Icon = style.icon

              return compact ? (
                // Compact View (Dropdown) - clickable row navigates to link
                <button
                  key={note.id}
                  type="button"
                  onClick={() => onNotificationClick?.(note)}
                  className={cn(
                    "group flex gap-3 px-4 py-3.5 transition-colors cursor-pointer w-full text-left",
                    note.read ? "bg-white hover:bg-gray-50" : "bg-primary-50/40 hover:bg-primary-50/60"
                  )}
                >
                  <div className={cn("flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ring-1", style.bg, style.color, style.ring)}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn("text-sm font-medium", note.read ? "text-gray-700" : "text-gray-900")}>
                        {note.title}
                        {!note.read && (
                          <span className="ml-2 inline-block w-2 h-2 rounded-full bg-primary-500"></span>
                        )}
                      </p>
                      <span className="text-[11px] text-gray-400 whitespace-nowrap flex-shrink-0">
                        {formatTime(note.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{note.message}</p>
                    {note.link && (
                      <span className="text-xs font-medium text-primary-600 group-hover:text-primary-700 mt-1.5 inline-block">
                        View details →
                      </span>
                    )}
                  </div>
                </button>
              ) : (
                // Full View (Page)
                <div
                  key={note.id}
                  className={cn(
                    "group relative flex gap-4 p-5 rounded-lg border transition-all duration-200",
                    note.read
                      ? "bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm"
                      : "bg-gradient-to-r from-primary-50/50 to-blue-50/30 border-primary-200 shadow-sm"
                  )}
                >
                  {/* Icon */}
                  <div className={cn("flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ring-1", style.bg, style.color, style.ring)}>
                    <Icon className="w-5 h-5" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <p className={cn("text-sm font-semibold flex items-center gap-2", note.read ? "text-gray-800" : "text-gray-900")}>
                          {note.title}
                          {!note.read && (
                            <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse"></span>
                          )}
                        </p>
                        <p className="text-sm text-gray-600 leading-relaxed">
                          {note.message}
                        </p>
                      </div>
                      <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0 pt-0.5">
                        {formatTime(note.createdAt)}
                      </span>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-100">
                      {note.link && (
                        <Link
                          href={note.link}
                          className="text-sm font-medium text-primary-600 hover:text-primary-700 hover:underline"
                        >
                          View Details →
                        </Link>
                      )}

                      <div className="flex items-center gap-1 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                        {!note.read && (
                          <button
                            onClick={(e) => handleMarkRead(note.id, e)}
                            className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                            title="Mark as read"
                          >
                            <CheckCheck className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={(e) => handleDelete(note.id, e)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
