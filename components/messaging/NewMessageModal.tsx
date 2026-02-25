'use client'

import { useState, useEffect } from 'react'
import { X, Users, MessageCircle, Search, Loader2, Send } from 'lucide-react'
import { searchUsers, searchFacilitatorsWithSharedEvents } from '@/app/actions/direct-messages'
import { requestConversation, canMessageUser } from '@/app/actions/conversation-requests'
import { sendMessage } from '@/app/actions/conversations'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type User = {
  id: string
  name: string | null
  preferredName: string | null
  email: string | null
  role: string
  image?: string | null
}

type Props = {
  isOpen: boolean
  onClose: () => void
  currentUserRole: string
}

export function NewMessageModal({ isOpen, onClose, currentUserRole }: Props) {
  const [view, setView] = useState<'menu' | 'browse' | 'message'>('menu')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [message, setMessage] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [facilitatorsFromEvents, setFacilitatorsFromEvents] = useState<User[]>([])
  const router = useRouter()

  const isAdmin = currentUserRole === 'ADMIN'
  const isHomeAdmin = currentUserRole === 'HOME_ADMIN'

  // Load facilitators from shared events for HOME_ADMIN
  useEffect(() => {
    if (isHomeAdmin && view === 'browse') {
      searchFacilitatorsWithSharedEvents().then((result) => {
        if ('data' in result && result.data) {
          setFacilitatorsFromEvents(result.data as User[])
        } else {
          setFacilitatorsFromEvents([])
        }
      })
    } else {
      setFacilitatorsFromEvents([])
    }
  }, [isHomeAdmin, view])

  // Debounced search with useEffect
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    const timer = setTimeout(async () => {
      const result = await searchUsers(searchQuery)
      if ('data' in result && result.data) {
        setSearchResults(result.data)
      } else {
        setSearchResults([])
      }
      setIsSearching(false)
    }, 300) // 300ms debounce

    return () => clearTimeout(timer)
  }, [searchQuery])

  async function handleSelectUser(user: User) {
    setSelectedUser(user)
    setView('message')

    // Check if user can message this person
    if (!isAdmin) {
      const check = await canMessageUser(user.id)
      if (!check.canMessage) {
        setError('You need admin approval to message this user. Send a request?')
      }
    }
  }

  async function handleSendOrRequest() {
    if (!selectedUser) return

    setIsLoading(true)
    setError(null)

    if (isAdmin) {
      // Admin can message directly
      const result = await sendMessage(selectedUser.id, message.trim() || 'Hi!')
      if ('error' in result) {
        setError(result.error || null)
      } else {
        onClose()
        router.push(`/staff/inbox/${selectedUser.id}`)
        router.refresh()
      }
    } else {
      // Check if can message
      const check = await canMessageUser(selectedUser.id)
      if (check.canMessage) {
        // Send message directly
        const result = await sendMessage(selectedUser.id, message.trim() || 'Hi!')
        if ('error' in result) {
          setError(result.error || null)
        } else {
          onClose()
          router.push(`/staff/inbox/${selectedUser.id}`)
          router.refresh()
        }
      } else {
        // Request to message
        const result = await requestConversation(selectedUser.id, message.trim())
        if ('error' in result) {
          setError(result.error || null)
        } else {
          alert('Request sent! An admin will review your request.')
          onClose()
        }
      }
    }

    setIsLoading(false)
  }

  function handleClose() {
    setView('menu')
    setSelectedUser(null)
    setSearchQuery('')
    setSearchResults([])
    setMessage('')
    setError(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {view === 'menu' && 'New Message'}
            {view === 'browse' && 'Choose Person'}
            {view === 'message' && `Message ${selectedUser?.preferredName || selectedUser?.name}`}
          </h2>
          <button
            onClick={handleClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {view === 'menu' && (
            <div className="space-y-3">
              {isAdmin && (
                <Link
                  href="/admin/messaging/new"
                  onClick={handleClose}
                  className="flex items-center gap-4 p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all group"
                >
                  <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center group-hover:bg-primary-600 group-hover:text-white transition-colors">
                    <Users className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">Create Group</h3>
                    <p className="text-sm text-gray-500">Start a group conversation</p>
                  </div>
                </Link>
              )}

              <button
                onClick={() => setView('browse')}
                className="w-full flex items-center gap-4 p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all group"
              >
                <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-semibold text-gray-900">Message Someone</h3>
                  <p className="text-sm text-gray-500">
                    {isAdmin ? 'Send a direct message' : 'Request to start a conversation'}
                  </p>
                </div>
              </button>
            </div>
          )}

          {view === 'browse' && (
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  id="new-message-search"
                  name="search"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name or email..."
                  aria-label="Search users by name or email"
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  autoFocus
                />
              </div>

              {/* Facilitators from your events (HOME_ADMIN only) */}
              {isHomeAdmin && facilitatorsFromEvents.length > 0 && searchQuery.length < 2 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Facilitators from your events
                  </p>
                  {facilitatorsFromEvents.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => handleSelectUser(user)}
                      className="w-full flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-white flex items-center justify-center font-semibold">
                        {(user.preferredName || user.name)?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-medium text-gray-900">
                          {user.preferredName || user.name}
                        </p>
                        <p className="text-xs text-gray-500">{user.role}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Results */}
              {searchQuery.length < 2 ? (
                !isHomeAdmin || facilitatorsFromEvents.length === 0 ? (
                  <div className="text-center py-8 text-sm text-gray-500">
                    Type at least 2 characters to search
                  </div>
                ) : (
                  <div className="text-center py-4 text-sm text-gray-500">
                    Or type at least 2 characters to search for more
                  </div>
                )
              ) : isSearching ? (
                <div className="text-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary-600 mb-2" />
                  <p className="text-sm text-gray-500">Searching...</p>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-8 text-sm text-gray-500">
                  No users found
                </div>
              ) : (
                <div className="space-y-2">
                  {searchResults.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => handleSelectUser(user)}
                      className="w-full flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-white flex items-center justify-center font-semibold">
                        {(user.preferredName || user.name)?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-medium text-gray-900">
                          {user.preferredName || user.name}
                        </p>
                        <p className="text-xs text-gray-500">{user.role}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {view === 'message' && selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-white flex items-center justify-center font-semibold">
                  {(selectedUser.preferredName || selectedUser.name)?.[0]?.toUpperCase() || 'U'}
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {selectedUser.preferredName || selectedUser.name}
                  </p>
                  <p className="text-xs text-gray-500">{selectedUser.role}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {isAdmin ? 'Message (optional)' : 'Message'}
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={isAdmin ? "Say hi or leave blank..." : "Introduce yourself and why you'd like to connect..."}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                />
              </div>

              {error && (
                <div className="text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                  {error}
                </div>
              )}

              <p className="text-xs text-gray-500">
                {isAdmin
                  ? 'As an admin, you can message anyone directly.'
                  : currentUserRole === 'HOME_ADMIN'
                    ? 'Message an admin directly, or request to connect with facilitators from your events.'
                    : 'Your request will be sent to an admin for approval.'}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        {view === 'message' && (
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
            <button
              onClick={() => {
                setView('browse')
                setSelectedUser(null)
                setMessage('')
                setError(null)
              }}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleSendOrRequest}
              disabled={isLoading || (!isAdmin && !message.trim())}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {isAdmin ? 'Send' : 'Request'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
