'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from "next/image"
import { MessageSquare, UserPlus, Mail, Users, Check, X, Loader2, FileText } from "lucide-react"
import { TabNavigation } from "@/components/admin/shared/TabNavigation"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { STYLES } from "@/lib/styles"
import { approveGroupAccess, denyGroupAccess } from "@/app/actions/messaging"

// Import or recreate list components
// For brevity, we will inline simple versions or reuse existing logic patterns
import { ConversationRequestsList } from "@/components/admin/ConversationRequestsList"

import { AdminMessagingPanel } from "@/components/admin/communication/AdminMessagingPanel"
import { EmailTemplatesTab } from "@/components/admin/communication/EmailTemplatesTab"

// --- Sub-Components ---

const GROUP_COLOR_CLASS: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-green-100 text-green-700',
    purple: 'bg-purple-100 text-purple-700',
    red: 'bg-red-100 text-red-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    pink: 'bg-pink-100 text-pink-700'
}

interface Group {
  id: string
  name: string
  color: string
  iconEmoji: string
  isAttachableToForms?: boolean
  _count?: {
    members?: number
    messages?: number
  }
}

interface GroupRequest {
  id: string
  groupId: string
  userId: string
  joinedAt: string
  user: {
    id: string
    name?: string | null
    preferredName?: string | null
    image?: string | null
    role?: string
  }
  group: {
    id: string
    name: string
    iconEmoji: string
  }
}

interface Invitation {
  id: string
  email: string
  role: string
  status: string
  createdBy?: {
    name?: string | null
  }
}

function GroupsList({ groups }: { groups: Group[] }) {
    if (groups.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center bg-white rounded-lg border border-gray-200">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                    <Users className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-base font-medium text-gray-900">No message groups yet</p>
                <p className="text-sm text-gray-500 mt-1 max-w-[280px]">Create a group to organize team conversations</p>
                <Link
                    href="/admin/messaging/new"
                    className={cn(STYLES.btn, STYLES.btnPrimary, "mt-6")}
                >
                    <MessageSquare className="w-4 h-4" /> Create Group
                </Link>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map((group) => (
                <Link
                    key={group.id}
                    href={`/admin/messaging/${group.id}`}
                    className="group block bg-white rounded-xl border border-gray-200 p-5 transition-all hover:shadow-md hover:border-gray-300 active:scale-[0.99] touch-manipulation"
                >
                    <div className="flex items-start gap-4">
                        <div className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0",
                            GROUP_COLOR_CLASS[group.color] || 'bg-primary-100 text-primary-600'
                        )}>
                            {group.iconEmoji || '👥'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 truncate">
                                {group.name}
                            </h3>
                            <div className="flex items-center gap-2 mt-1.5 text-sm text-gray-500">
                                <span>{group._count?.members ?? 0} members</span>
                                <span className="text-gray-300">·</span>
                                <span>{group._count?.messages ?? 0} messages</span>
                            </div>
                        </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-100">
                        {group.isAttachableToForms && (
                            <span className="inline-flex mb-2 px-2 py-0.5 text-[11px] rounded-full bg-emerald-100 text-emerald-700 font-medium">
                                Attachable to Forms
                            </span>
                        )}
                        <span className="text-sm font-medium text-primary-600 group-hover:text-primary-700">
                            Manage Settings →
                        </span>
                    </div>
                </Link>
            ))}
        </div>
    )
}

function GroupRequestsList({ requests }: { requests: GroupRequest[] }) {
    const [processing, setProcessing] = useState<string | null>(null)
    const router = useRouter()

    async function handleApprove(groupId: string, userId: string, requestId: string) {
        setProcessing(requestId)
        const result = await approveGroupAccess(groupId, userId)
        if (result.error) alert(result.error)
        else router.refresh()
        setProcessing(null)
    }

    async function handleDeny(groupId: string, userId: string, requestId: string) {
        setProcessing(requestId)
        const result = await denyGroupAccess(groupId, userId)
        if (result.error) alert(result.error)
        else router.refresh()
        setProcessing(null)
    }

    if (requests.length === 0) {
        return (
            <div className={cn(STYLES.card, "p-12 text-center")}>
                <div className={STYLES.emptyIcon}>
                    <Users className="w-10 h-10 text-gray-300" />
                </div>
                <p className={STYLES.emptyTitle}>No pending group requests</p>
                <p className={STYLES.emptyDescription}>Group access requests will appear here</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {requests.map((req) => {
                const loading = processing === req.id
                return (
                    <div key={req.id} className={cn(STYLES.card, "p-5 sm:p-6")}>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="flex items-center gap-3 min-w-0">
                                {req.user?.image ? (
                                    <Image src={req.user.image} alt="" width={48} height={48} className="rounded-full object-cover shrink-0" />
                                ) : (
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-white flex items-center justify-center font-semibold text-lg shrink-0">
                                        {(req.user?.preferredName || req.user?.name)?.[0]?.toUpperCase() || 'U'}
                                    </div>
                                )}
                                <div className="min-w-0">
                                    <p className="font-medium text-gray-900">
                                        <span className="font-semibold">{req.user?.preferredName || req.user?.name}</span>
                                        {' '}wants to join{' '}
                                        <span className="font-semibold">{req.group?.iconEmoji} {req.group?.name}</span>
                                    </p>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        {req.user?.role} · {new Date(req.joinedAt).toLocaleDateString('en-US', {
                                            month: 'long',
                                            day: 'numeric',
                                            hour: 'numeric',
                                            minute: '2-digit'
                                        })}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    onClick={() => handleApprove(req.group.id, req.user.id, req.id)}
                                    disabled={loading}
                                    className={cn(STYLES.btn, "bg-green-600 hover:bg-green-700 text-white flex items-center gap-2 disabled:opacity-50")}
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                    Approve
                                </button>
                                <button
                                    onClick={() => handleDeny(req.group.id, req.user.id, req.id)}
                                    disabled={loading}
                                    className={cn(STYLES.btn, STYLES.btnDanger, "flex items-center gap-2 disabled:opacity-50")}
                                >
                                    <X className="w-4 h-4" /> Deny
                                </button>
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

interface ConversationRequest {
  id: string
  message: string | null
  createdAt: Date
  requester: {
    id: string
    name: string | null
    preferredName: string | null
    image: string | null
    role: string
  }
  requested: {
    id: string
    name: string | null
    preferredName: string | null
    image: string | null
    role: string
  }
}

function AccessRequestsList({ groupRequests, convoRequests }: { groupRequests: GroupRequest[], convoRequests: ConversationRequest[] }) {
    return (
        <div className="space-y-8">
            {/* Group Requests */}
            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5" /> Group Access Requests
                </h3>
                <GroupRequestsList requests={groupRequests} />
            </div>

            {/* Conversation Requests */}
            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" /> 1-on-1 Conversation Requests
                </h3>
                <ConversationRequestsList requests={convoRequests} />
            </div>
        </div>
    )
}

function InvitationsList({ invitations }: { invitations: Invitation[] }) {
    return (
        <div className="space-y-4 sm:space-y-0 w-full min-w-0">
            {/* Mobile: card layout - only below sm breakpoint */}
            <div className="sm:hidden space-y-3 w-full min-w-0">
                {invitations.length === 0 ? (
                    <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                        <Mail className="w-10 h-10 mx-auto text-gray-300 mb-3" />
                        <p className="text-gray-500">No invitations sent yet</p>
                    </div>
                ) : invitations.map(inv => (
                    <div key={inv.id} className="bg-white rounded-lg border border-gray-200 p-4">
                        <div className="flex justify-between items-start gap-2 mb-2">
                            <p className="text-sm font-medium text-gray-900 truncate">{inv.email}</p>
                            <span className={cn("shrink-0 text-xs font-medium",
                                inv.status === 'ACCEPTED' ? "text-green-700" :
                                inv.status === 'PENDING' ? "text-yellow-700" :
                                "text-red-700"
                            )}>
                                {inv.status}
                            </span>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                            <span>{inv.role}</span>
                            {inv.createdBy?.name && (
                                <span className="text-gray-500">By {inv.createdBy.name}</span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
            {/* Desktop: table - only from sm breakpoint up */}
            <div className="hidden sm:block w-full min-w-0">
                {invitations.length === 0 ? (
                    <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                        <Mail className="w-10 h-10 mx-auto text-gray-300 mb-3" />
                        <p className="text-gray-500">No invitations sent yet</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden min-w-0">
                        <div className="table-scroll-wrapper max-h-[calc(100vh-320px)] min-w-0">
                            <table className={STYLES.table}>
                                <thead className="bg-gray-50">
                                    <tr className={STYLES.tableHeadRow}>
                                        <th className={STYLES.tableHeader}>Email</th>
                                        <th className={STYLES.tableHeader}>Role</th>
                                        <th className={STYLES.tableHeader}>Status</th>
                                        <th className={STYLES.tableHeader}>Sent By</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {invitations.map(inv => (
                                        <tr key={inv.id} className={STYLES.tableRow}>
                                            <td className={STYLES.tableCell}>{inv.email}</td>
                                            <td className={STYLES.tableCell}>{inv.role}</td>
                                            <td className={STYLES.tableCell}>
                                                <span className={cn("text-xs font-medium",
                                                    inv.status === 'ACCEPTED' ? "text-green-700" :
                                                    inv.status === 'PENDING' ? "text-yellow-700" :
                                                    "text-red-700"
                                                )}>
                                                    {inv.status}
                                                </span>
                                            </td>
                                            <td className={STYLES.tableCell}>{inv.createdBy?.name}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

type CommunicationHubClientProps = {
    groups: Group[]
    pendingGroupRequests: GroupRequest[]
    pendingConversationRequests: ConversationRequest[]
    invitations: Invitation[]
    currentUserId: string
}

export function CommunicationHubClient({ groups, pendingGroupRequests, pendingConversationRequests, invitations, currentUserId }: CommunicationHubClientProps) {
    const [activeTab, setActiveTab] = useState('messages') // Default to messages for better UX

    const totalRequests = pendingGroupRequests.length + pendingConversationRequests.length

    const tabs = [
        { 
            id: 'messages', 
            label: 'Messages', 
            icon: MessageSquare 
        },
        { 
            id: 'groups', 
            label: 'Message Groups', 
            icon: MessageSquare 
        },
        { 
            id: 'requests', 
            label: 'Access Requests', 
            icon: UserPlus,
            count: totalRequests
        },
        { 
            id: 'emailTemplates', 
            label: 'Email Templates', 
            icon: FileText 
        },
        { 
            id: 'invitations', 
            label: 'System Invites', 
            icon: Mail 
        }
        
    ]

    return (
        <div className="h-full min-h-0 flex flex-col w-full max-w-full min-w-0 overflow-x-hidden">
            <TabNavigation
                tabs={tabs}
                activeTab={activeTab}
                onChange={setActiveTab}
            />

            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain flex flex-col w-full min-w-0 pt-2 sm:pt-0">
                {activeTab === 'groups' && <GroupsList groups={groups} />}
                {activeTab === 'messages' && <AdminMessagingPanel groups={groups} currentUserId={currentUserId} />}
                {activeTab === 'requests' && (
                    <AccessRequestsList 
                        groupRequests={pendingGroupRequests} 
                        convoRequests={pendingConversationRequests} 
                    />
                )}
                {activeTab === 'invitations' && <InvitationsList invitations={invitations} />}
                {activeTab === 'emailTemplates' && <EmailTemplatesTab />}
            </div>
        </div>
    )
}
