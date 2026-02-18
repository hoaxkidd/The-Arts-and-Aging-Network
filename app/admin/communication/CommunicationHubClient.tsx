'use client'

import { useState } from 'react'
import { MessageSquare, UserPlus, Mail, Users } from "lucide-react"
import { TabNavigation } from "@/components/admin/shared/TabNavigation"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { STYLES } from "@/lib/styles"

// Import or recreate list components
// For brevity, we will inline simple versions or reuse existing logic patterns
import { ConversationRequestsList } from "@/components/admin/ConversationRequestsList"

import { AdminMessagingPanel } from "@/components/admin/communication/AdminMessagingPanel"

// --- Sub-Components ---

function GroupsList({ groups }: { groups: any[] }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
             {groups.map((group) => (
            <div
              key={group.id}
              className="bg-white rounded-lg border border-gray-200 p-4 transition-colors"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className={cn(
                  "w-12 h-12 rounded-lg flex items-center justify-center text-2xl",
                  `bg-${group.color}-100`
                )}>
                  {group.iconEmoji}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900 truncate">
                    {group.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                     <span className="text-xs text-gray-500">{group._count.members} members</span>
                     <span className="text-gray-300">•</span>
                     <span className="text-xs text-gray-500">{group._count.messages} msgs</span>
                  </div>
                </div>
              </div>

              <Link
                href={`/admin/messaging/${group.id}`}
                className="mt-3 block text-center px-3 py-2 text-xs font-medium text-primary-600 bg-primary-50 rounded hover:bg-primary-100"
              >
                Manage Settings
              </Link>
            </div>
          ))}
        </div>
    )
}

function AccessRequestsList({ groupRequests, convoRequests }: { groupRequests: any[], convoRequests: any[] }) {
    return (
        <div className="space-y-8">
            {/* Group Requests */}
            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5" /> Group Access Requests
                </h3>
                {groupRequests.length === 0 ? (
                    <p className="text-gray-500 text-sm">No pending group requests.</p>
                ) : (
                    <div className="space-y-3">
                        {/* We would render the request cards here, reusing logic from messaging/requests/page.tsx */}
                        {groupRequests.map(req => (
                             <div key={req.id} className="bg-white p-4 rounded-lg border border-gray-200">
                                <p className="text-sm">
                                    <span className="font-semibold">{req.user.name}</span> wants to join 
                                    <span className="font-semibold"> {req.group.name}</span>
                                </p>
                                {/* Actions would go here */}
                             </div>
                        ))}
                    </div>
                )}
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

function InvitationsList({ invitations }: { invitations: any[] }) {
    return (
        <div className="space-y-4 sm:space-y-0">
            {/* Mobile: card layout */}
            <div className="sm:hidden space-y-3">
                {invitations.map(inv => (
                    <div key={inv.id} className="bg-white rounded-lg border border-gray-200 p-4">
                        <div className="flex justify-between items-start gap-2 mb-2">
                            <p className="text-sm font-medium text-gray-900 truncate">{inv.email}</p>
                            <span className={cn("shrink-0 px-2 py-0.5 text-xs rounded-full",
                                inv.status === 'ACCEPTED' ? "bg-green-100 text-green-800" :
                                inv.status === 'PENDING' ? "bg-yellow-100 text-yellow-800" :
                                "bg-red-100 text-red-800"
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
            {/* Desktop: table */}
            <div className="hidden sm:block bg-white rounded-lg border border-gray-200 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Email</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Role</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Sent By</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {invitations.map(inv => (
                            <tr key={inv.id}>
                                <td className="px-6 py-4 text-sm text-gray-900">{inv.email}</td>
                                <td className="px-6 py-4 text-sm text-gray-600">{inv.role}</td>
                                <td className="px-6 py-4">
                                    <span className={cn("px-2 py-0.5 text-xs rounded-full",
                                        inv.status === 'ACCEPTED' ? "bg-green-100 text-green-800" :
                                        inv.status === 'PENDING' ? "bg-yellow-100 text-yellow-800" :
                                        "bg-red-100 text-red-800"
                                    )}>
                                        {inv.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">{inv.createdBy?.name}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

type CommunicationHubClientProps = {
    groups: any[]
    pendingGroupRequests: any[]
    pendingConversationRequests: any[]
    invitations: any[]
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
            id: 'invitations', 
            label: 'System Invites', 
            icon: Mail 
        }
    ]

    return (
        <div className="min-h-0 flex flex-col p-4 sm:p-6">
            <div className="flex-shrink-0 mb-4">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Communication Hub</h1>
                <p className="text-sm text-gray-500 mt-0.5">Manage chat groups, permissions, and user invitations</p>
            </div>

            <TabNavigation 
                tabs={tabs}
                activeTab={activeTab}
                onChange={setActiveTab}
            />

            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain">
                {activeTab === 'groups' && <GroupsList groups={groups} />}
                {activeTab === 'messages' && <AdminMessagingPanel groups={groups} currentUserId={currentUserId} />}
                {activeTab === 'requests' && (
                    <AccessRequestsList 
                        groupRequests={pendingGroupRequests} 
                        convoRequests={pendingConversationRequests} 
                    />
                )}
                {activeTab === 'invitations' && <InvitationsList invitations={invitations} />}
            </div>
        </div>
    )
}
