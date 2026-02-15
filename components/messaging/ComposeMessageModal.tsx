'use client'

import { useState, useEffect } from 'react'
import { X, Send, Loader2, Search, User } from 'lucide-react'
import { searchUsers } from '@/app/actions/direct-messages'
import { sendDirectMessage } from '@/app/actions/communication'

type User = {
  id: string
  name: string | null
  preferredName: string | null
  email: string
  role: string
}

type Props = {
  isOpen: boolean
  onClose: () => void
  preselectedUserId?: string
  preselectedUserName?: string
}

export function ComposeMessageModal({ isOpen, onClose, preselectedUserId, preselectedUserName }: Props) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Handle preselected user
  useEffect(() => {
    if (preselectedUserId && preselectedUserName) {
      setSelectedUser({
        id: preselectedUserId,
        name: preselectedUserName,
        preferredName: null,
        email: '',
        role: ''
      })
    }
  }, [preselectedUserId, preselectedUserName])

  // Search users
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([])
      return
    }

    const timer = setTimeout(async () => {
      setIsSearching(true)
      const result = await searchUsers(searchQuery)
      if ('data' in result && result.data) {
        setSearchResults(result.data as User[])
      }
      setIsSearching(false)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedUser) return

    setIsSending(true)
    setError(null)

    const result = await sendDirectMessage(selectedUser.id, subject, content)

    if (result.error) {
      setError(result.error)
      setIsSending(false)
    } else {
      // Reset form
      setSelectedUser(null)
      setSearchQuery('')
      setSubject('')
      setContent('')
      setIsSending(false)
      onClose()
      window.location.reload() // Refresh to show new message
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            New Message
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Recipient Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                To
              </label>

              {selectedUser ? (
                <div className="flex items-center gap-3 p-3 bg-primary-50 border border-primary-200 rounded-lg">
                  <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-sm font-medium">
                    {selectedUser.name?.[0] || selectedUser.preferredName?.[0] || 'U'}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {selectedUser.preferredName || selectedUser.name}
                    </p>
                    <p className="text-xs text-gray-500">{selectedUser.role}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedUser(null)}
                    className="p-1 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search for a user..."
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>

                  {/* Search Results */}
                  {searchQuery.length >= 2 && (
                    <div className="mt-2 border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
                      {isSearching ? (
                        <div className="p-4 text-center text-sm text-gray-500">
                          <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />
                          Searching...
                        </div>
                      ) : searchResults.length === 0 ? (
                        <div className="p-4 text-center text-sm text-gray-500">
                          No users found
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-100">
                          {searchResults.map((user) => (
                            <button
                              key={user.id}
                              type="button"
                              onClick={() => {
                                setSelectedUser(user)
                                setSearchQuery('')
                                setSearchResults([])
                              }}
                              className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors text-left"
                            >
                              <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-sm font-medium flex-shrink-0">
                                {user.name?.[0] || user.preferredName?.[0] || 'U'}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
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
                </div>
              )}
            </div>

            {/* Subject */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="What's this about?"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
                disabled={!selectedUser}
              />
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Message
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your message..."
                rows={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                required
                disabled={!selectedUser}
              />
            </div>

            <p className="text-sm text-gray-500">
              Your message will be sent via email without revealing your email address.
            </p>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSending || !selectedUser}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Send Message
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
