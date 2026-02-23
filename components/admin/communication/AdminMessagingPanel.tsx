'use client'

import { useState, useEffect } from 'react'
import { MessageThread } from "@/components/messaging/MessageThread"
import { ChatInterface } from "@/components/messaging/ChatInterface"
import { Plus, Users, MessageSquare, Loader2, Search, X, Send, Mail, ArrowLeft } from "lucide-react"
import { STYLES } from "@/lib/styles"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { getGroupMessages } from "@/app/actions/messaging"
import { searchUsers, sendDirectMessage } from "@/app/actions/direct-messages"
import { getConversations, getConversation } from "@/app/actions/conversations"

type SidebarItem = {
    id: string
    name: string
    type: 'GROUP' | 'DM'
    image?: string | null
    lastMessage?: string
    timestamp: Date
    unreadCount?: number
    partnerId?: string
}

function formatRelativeTime(date: Date): string {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

type SearchUser = {
    id: string
    name: string | null
    preferredName: string | null
    email: string
    role: string
    image: string | null
}

// DM Creation Modal
function NewDMModal({ onClose, onSent }: { onClose: () => void, onSent: () => void }) {
    const [query, setQuery] = useState('')
    const [users, setUsers] = useState<SearchUser[]>([])
    const [searching, setSearching] = useState(false)
    const [selectedUser, setSelectedUser] = useState<SearchUser | null>(null)
    const [subject, setSubject] = useState('')
    const [content, setContent] = useState('')
    const [sending, setSending] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (query.length < 2) {
            setUsers([])
            return
        }

        const timeout = setTimeout(async () => {
            setSearching(true)
            const result = await searchUsers(query)
            if (result.success && result.data) {
                setUsers(result.data)
            }
            setSearching(false)
        }, 300)

        return () => clearTimeout(timeout)
    }, [query])

    const handleSend = async () => {
        if (!selectedUser || !subject.trim() || !content.trim()) {
            setError('Please fill in all fields')
            return
        }

        setSending(true)
        setError(null)

        const result = await sendDirectMessage({
            recipientId: selectedUser.id,
            subject: subject.trim(),
            content: content.trim()
        })

        if ('error' in result) {
            setError(result.error || 'Failed to send message')
            setSending(false)
        } else {
            onSent()
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="bg-gray-50 px-5 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h2 className="font-semibold text-gray-900">New Direct Message</h2>
                    <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded">
                        <X className="w-4 h-4 text-gray-500" />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    {/* Recipient Selection */}
                    {!selectedUser ? (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    id="search-dm-recipient"
                                    name="searchRecipient"
                                    type="search"
                                    placeholder="Search by name or email..."
                                    aria-label="Search recipient by name or email"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    className={cn(STYLES.input, "pl-9")}
                                    autoFocus
                                />
                            </div>
                            {searching && (
                                <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    Searching...
                                </div>
                            )}
                            {users.length > 0 && (
                                <div className="mt-2 border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                                    {users.map(user => (
                                        <button
                                            key={user.id}
                                            onClick={() => {
                                                setSelectedUser(user)
                                                setQuery('')
                                                setUsers([])
                                            }}
                                            className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-3 border-b border-gray-100 last:border-b-0"
                                        >
                                            <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-medium shrink-0">
                                                {(user.preferredName || user.name)?.[0] || 'U'}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-gray-900 truncate">
                                                    {user.preferredName || user.name}
                                                </p>
                                                <p className="text-xs text-gray-500 truncate">{user.email}</p>
                                            </div>
                                            <span className="ml-auto text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full shrink-0">
                                                {user.role}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}
                            {query.length >= 2 && !searching && users.length === 0 && (
                                <p className="mt-2 text-sm text-gray-500">No users found</p>
                            )}
                        </div>
                    ) : (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-medium">
                                    {(selectedUser.preferredName || selectedUser.name)?.[0] || 'U'}
                                </div>
                                <span className="text-sm font-medium text-gray-900">
                                    {selectedUser.preferredName || selectedUser.name}
                                </span>
                                <span className="text-xs text-gray-500">{selectedUser.email}</span>
                                <button
                                    onClick={() => setSelectedUser(null)}
                                    className="ml-auto p-0.5 hover:bg-gray-200 rounded"
                                >
                                    <X className="w-3.5 h-3.5 text-gray-400" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Subject */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                        <input
                            type="text"
                            placeholder="Message subject..."
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            className={STYLES.input}
                        />
                    </div>

                    {/* Content */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                        <textarea
                            placeholder="Write your message..."
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            rows={5}
                            className={cn(STYLES.input, "resize-none")}
                        />
                    </div>

                    {error && (
                        <p className="text-sm text-red-600">{error}</p>
                    )}
                </div>

                {/* Footer */}
                <div className="px-5 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSend}
                        disabled={sending || !selectedUser || !subject.trim() || !content.trim()}
                        className={cn(STYLES.btn, STYLES.btnPrimary, "disabled:opacity-50")}
                    >
                        {sending ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Sending...
                            </>
                        ) : (
                            <>
                                <Send className="w-4 h-4" />
                                Send Message
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}

// Wrapper to fetch messages for the selected group
function AdminGroupChat({ groupId, currentUserId }: { groupId: string, currentUserId: string }) {
    const [messages, setMessages] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let mounted = true

        async function fetchMessages() {
            setLoading(true)
            try {
                const result = await getGroupMessages(groupId)
                if (mounted && result.success && result.data) {
                    setMessages(result.data)
                }
            } catch (error) {
                console.error("Failed to fetch messages", error)
            } finally {
                if (mounted) setLoading(false)
            }
        }

        fetchMessages()
        return () => { mounted = false }
    }, [groupId])

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <Loader2 className="w-8 h-8 animate-spin mb-2" />
                <p>Loading conversation...</p>
            </div>
        )
    }

    return (
        <MessageThread
            groupId={groupId}
            currentUserId={currentUserId}
            currentUserRole="ADMIN"
            initialMessages={messages}
            members={[]}
            isMuted={false}
        />
    )
}

// Wrapper to fetch DM conversation
function AdminDMChat({ partnerId, currentUserId, onBack }: { partnerId: string, currentUserId: string, onBack?: () => void }) {
    const [partner, setPartner] = useState<any>(null)
    const [messages, setMessages] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let mounted = true

        async function fetchConversation() {
            setLoading(true)
            try {
                const result = await getConversation(partnerId)
                if (mounted && !('error' in result)) {
                    setPartner(result.partner)
                    setMessages(result.messages)
                }
            } catch (error) {
                console.error("Failed to fetch DM conversation", error)
            } finally {
                if (mounted) setLoading(false)
            }
        }

        fetchConversation()
        return () => { mounted = false }
    }, [partnerId])

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <Loader2 className="w-8 h-8 animate-spin mb-2" />
                <p>Loading conversation...</p>
            </div>
        )
    }

    if (!partner) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <p>Conversation not found</p>
            </div>
        )
    }

    return (
        <ChatInterface
            partner={partner}
            messages={messages}
            currentUserId={currentUserId}
            onBack={onBack}
        />
    )
}

export function AdminMessagingPanel({ groups, currentUserId }: { groups: any[], currentUserId: string }) {
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [selectedType, setSelectedType] = useState<'GROUP' | 'DM'>('GROUP')
    const [searchQuery, setSearchQuery] = useState('')
    const [showDMModal, setShowDMModal] = useState(false)
    const [dmConversations, setDmConversations] = useState<SidebarItem[]>([])
    const [loadingDMs, setLoadingDMs] = useState(true)

    // Fetch DM conversations on mount
    useEffect(() => {
        async function fetchDMs() {
            setLoadingDMs(true)
            try {
                const result = await getConversations()
                if (!('error' in result) && result.conversations) {
                    const dmItems: SidebarItem[] = result.conversations.map((conv: any) => ({
                        id: `dm-${conv.partnerId}`,
                        name: conv.partner.preferredName || conv.partner.name || 'Unknown',
                        type: 'DM' as const,
                        image: conv.partner?.image,
                        lastMessage: conv.lastMessage?.content?.slice(0, 50) || 'No messages',
                        timestamp: new Date(conv.lastMessage?.createdAt || Date.now()),
                        unreadCount: conv.unreadCount || 0,
                        partnerId: conv.partnerId
                    }))
                    setDmConversations(dmItems)
                }
            } catch (error) {
                console.error("Failed to fetch DMs:", error)
            } finally {
                setLoadingDMs(false)
            }
        }
        fetchDMs()
    }, [])

    // Transform groups into sidebar items
    const groupItems: SidebarItem[] = groups.map(g => ({
        id: g.id,
        name: g.name,
        type: 'GROUP' as const,
        lastMessage: `${g._count?.messages || 0} messages`,
        timestamp: new Date(g.updatedAt || g.createdAt)
    }))

    // Combine and filter
    const allItems = [...dmConversations, ...groupItems]
    const filtered = allItems.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const selectedGroup = groups.find((g: any) => g.id === selectedId)
    const selectedDM = dmConversations.find(d => d.id === selectedId)

    const handleDMSent = async () => {
        setShowDMModal(false)
        // Refresh DM conversations
        try {
            const result = await getConversations()
            if (!('error' in result) && result.conversations) {
                const dmItems: SidebarItem[] = result.conversations.map((conv: any) => ({
                    id: `dm-${conv.partnerId}`,
                    name: conv.partner.preferredName || conv.partner.name || 'Unknown',
                    type: 'DM' as const,
                    lastMessage: conv.lastMessage?.content?.slice(0, 50) || 'No messages',
                    timestamp: new Date(conv.lastMessage?.createdAt || Date.now()),
                    unreadCount: conv.unreadCount || 0,
                    partnerId: conv.partnerId
                }))
                setDmConversations(dmItems)
                // Auto-select the latest DM
                if (dmItems.length > 0) {
                    setSelectedId(dmItems[0].id)
                    setSelectedType('DM')
                }
            }
        } catch (error) {
            console.error("Failed to refresh DMs:", error)
        }
    }

    const hasSelection = selectedId && ((selectedType === 'GROUP' && selectedGroup) || (selectedType === 'DM' && selectedDM?.partnerId))

    return (
        <>
            <div className="flex flex-col md:flex-row flex-1 min-h-[320px] md:min-h-[400px] w-full max-w-full min-w-0 bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                {/* Sidebar - full width on mobile when no selection, hidden when chat shown */}
                <div className={cn(
                    "flex flex-col bg-gray-50 min-h-0 min-w-0 shrink-0",
                    hasSelection ? "hidden md:flex md:w-80 md:border-r md:border-gray-200" : "flex-1 w-full max-w-full md:w-80 md:flex-shrink-0 md:border-r md:border-gray-200"
                )}>
                    <div className="flex-shrink-0 p-4 border-b border-gray-200 bg-gray-50">
                        <div className="flex items-center justify-between gap-2 mb-3">
                            <h2 className="font-semibold text-gray-900 text-base sm:text-lg">Messages</h2>
                            <div className="flex gap-1">
                                <Link
                                    href="/admin/messaging/new"
                                    className="min-w-[44px] min-h-[44px] flex items-center justify-center -m-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors touch-manipulation"
                                    title="New Group"
                                >
                                    <Users className="w-4 h-4" />
                                </Link>
                                <button
                                    className="min-w-[44px] min-h-[44px] flex items-center justify-center -m-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors touch-manipulation"
                                    title="New Direct Message"
                                    onClick={() => setShowDMModal(true)}
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        <input
                            id="search-conversations"
                            name="searchConversations"
                            type="search"
                            placeholder="Search conversations..."
                            aria-label="Search conversations"
                            className={cn(STYLES.input, "min-h-[44px] text-base")}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {/* DM Conversations */}
                        {dmConversations.length > 0 && (
                            <>
                                <div className="px-4 pt-3 pb-1">
                                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Direct Messages</p>
                                </div>
                                {filtered.filter(i => i.type === 'DM').map(item => {
                                    const hasUnread = (item.unreadCount ?? 0) > 0
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => {
                                                setSelectedId(item.id)
                                                setSelectedType('DM')
                                            }}
                                            className={cn(
                                                "w-full text-left px-4 py-3 min-h-[64px] border-b border-gray-100 hover:bg-white active:bg-gray-50 transition-colors flex items-center gap-3 touch-manipulation",
                                                selectedId === item.id ? "bg-white border-l-4 border-l-primary-500" : "border-l-4 border-l-transparent",
                                                hasUnread && selectedId !== item.id && "bg-primary-50/50"
                                            )}
                                        >
                                            {item.image ? (
                                                <img src={item.image} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
                                                    {item.name.charAt(0)}
                                                </div>
                                            )}
                                            <div className="min-w-0 flex-1">
                                                <div className="flex justify-between items-center gap-2">
                                                    <span className={cn(
                                                        "text-sm truncate",
                                                        hasUnread ? "font-semibold text-gray-900" : "font-medium text-gray-900"
                                                    )}>{item.name}</span>
                                                    <span className="text-[11px] text-gray-400 shrink-0">
                                                        {formatRelativeTime(item.timestamp)}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between gap-2 mt-0.5">
                                                    <p className={cn(
                                                        "text-xs truncate flex-1 min-w-0",
                                                        hasUnread ? "text-gray-900 font-medium" : "text-gray-500"
                                                    )}>{item.lastMessage}</p>
                                                    {hasUnread && (
                                                        <span className="w-5 h-5 bg-primary-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shrink-0">
                                                            {item.unreadCount}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </button>
                                    )
                                })}
                            </>
                        )}

                        {/* Group Conversations */}
                        <div className="px-4 pt-3 pb-1">
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Groups</p>
                        </div>
                        {filtered.filter(i => i.type === 'GROUP').map(item => {
                            const group = groups.find((g: any) => g.id === item.id)
                            const iconEmoji = group?.iconEmoji || '👥'
                            const colorClass = group?.color ? `bg-${group.color}-100 text-${group.color}-700` : 'bg-primary-100 text-primary-700'
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => {
                                        setSelectedId(item.id)
                                        setSelectedType('GROUP')
                                    }}
                                    className={cn(
                                        "w-full text-left px-4 py-3 min-h-[64px] border-b border-gray-100 hover:bg-white active:bg-gray-50 transition-colors flex items-center gap-3 touch-manipulation",
                                        selectedId === item.id ? "bg-white border-l-4 border-l-primary-500" : "border-l-4 border-l-transparent"
                                    )}
                                >
                                    <div className={cn(
                                        "w-10 h-10 rounded-full flex items-center justify-center text-base shrink-0",
                                        group?.color === 'blue' && "bg-blue-100 text-blue-700",
                                        group?.color === 'green' && "bg-green-100 text-green-700",
                                        group?.color === 'purple' && "bg-purple-100 text-purple-700",
                                        group?.color === 'red' && "bg-red-100 text-red-700",
                                        group?.color === 'yellow' && "bg-yellow-100 text-yellow-700",
                                        group?.color === 'pink' && "bg-pink-100 text-pink-700",
                                        !group?.color && "bg-primary-100 text-primary-700"
                                    )}>
                                        {iconEmoji}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex justify-between items-center gap-2">
                                            <span className="text-sm font-medium text-gray-900 truncate">{item.name}</span>
                                            <span className="text-[11px] text-gray-400 shrink-0">
                                                {formatRelativeTime(item.timestamp)}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 truncate mt-0.5">{item.lastMessage}</p>
                                    </div>
                                </button>
                            )
                        })}
                        {filtered.length === 0 && (
                            <div className={cn(STYLES.emptyState, "py-12 px-6")}>
                                {searchQuery ? (
                                    <>
                                        <div className={STYLES.emptyIcon}>
                                            <Search className="w-8 h-8 text-gray-400" />
                                        </div>
                                        <p className={STYLES.emptyTitle}>No matches</p>
                                        <p className={STYLES.emptyDescription}>Try a different search term</p>
                                    </>
                                ) : (
                                    <>
                                        <div className={STYLES.emptyIcon}>
                                            <MessageSquare className="w-8 h-8 text-gray-400" />
                                        </div>
                                        <p className={STYLES.emptyTitle}>No conversations yet</p>
                                        <p className={STYLES.emptyDescription}>
                                            Start a direct message or create a group to begin
                                        </p>
                                        <div className="flex flex-wrap justify-center gap-3 mt-6">
                                            <button
                                                onClick={() => setShowDMModal(true)}
                                                className={cn(STYLES.btn, STYLES.btnPrimary, "text-sm")}
                                            >
                                                <Plus className="w-4 h-4" /> New Message
                                            </button>
                                            <Link
                                                href="/admin/messaging/new"
                                                className={cn(STYLES.btn, STYLES.btnSecondary, "text-sm")}
                                            >
                                                <Users className="w-4 h-4" /> New Group
                                            </Link>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Main Chat Area - full width on mobile when selected; do not render empty state on mobile */}
                <div className={cn(
                    "flex flex-col bg-white overflow-hidden min-h-0 min-w-0 flex-1",
                    !hasSelection && "hidden md:flex"
                )}>
                    {selectedType === 'GROUP' && selectedId && selectedGroup ? (
                        <div className="flex flex-col flex-1 min-h-0">
                            {/* Mobile back button */}
                            <div className="md:hidden flex items-center gap-2 px-4 py-3 border-b border-gray-200 bg-white shrink-0">
                                <button
                                    onClick={() => { setSelectedId(null); setSelectedType('GROUP') }}
                                    className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg touch-manipulation"
                                    aria-label="Back to conversations"
                                >
                                    <ArrowLeft className="w-5 h-5" />
                                </button>
                                <span className="font-medium text-gray-900 truncate">{selectedGroup.name}</span>
                            </div>
                            <div className="flex-1 min-h-0 overflow-hidden">
                                <AdminGroupChat
                                    groupId={selectedId}
                                    currentUserId={currentUserId}
                                />
                            </div>
                        </div>
                    ) : selectedType === 'DM' && selectedDM?.partnerId ? (
                        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                            <AdminDMChat
                                partnerId={selectedDM.partnerId}
                                currentUserId={currentUserId}
                                onBack={() => { setSelectedId(null); setSelectedType('DM') }}
                            />
                        </div>
                    ) : (
                        <div className={cn(STYLES.emptyState, "flex-1 p-6")}>
                            <div className={STYLES.emptyIcon}>
                                <MessageSquare className="w-8 h-8 text-gray-300" />
                            </div>
                            <p className={STYLES.emptyTitle}>Select a conversation</p>
                            <p className={STYLES.emptyDescription}>
                                Choose a group or person from the sidebar to start messaging
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* DM Creation Modal */}
            {showDMModal && (
                <NewDMModal
                    onClose={() => setShowDMModal(false)}
                    onSent={handleDMSent}
                />
            )}
        </>
    )
}
