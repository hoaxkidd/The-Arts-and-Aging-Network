import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { MessageSquare, Users, Clock, Plus, Lock } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"

export default async function StaffMessagesPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  // Get user's active groups
  const memberships = await prisma.groupMember.findMany({
    where: {
      userId: session.user.id,
      isActive: true
    },
    include: {
      group: {
        include: {
          members: {
            where: { isActive: true },
            select: {
              user: {
                select: {
                  id: true,
                  name: true,
                  preferredName: true,
                  image: true
                }
              }
            }
          },
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            include: {
              sender: {
                select: {
                  id: true,
                  name: true,
                  preferredName: true
                }
              }
            }
          },
          _count: {
            select: { messages: true }
          }
        }
      }
    },
    orderBy: { group: { updatedAt: 'desc' } }
  })

  // Get pending requests
  const pendingRequests = await prisma.groupMember.findMany({
    where: {
      userId: session.user.id,
      isActive: false
    },
    include: {
      group: {
        select: {
          id: true,
          name: true,
          iconEmoji: true,
          color: true
        }
      }
    }
  })

  // Get available groups to join (open groups)
  const openGroups = await prisma.messageGroup.findMany({
    where: {
      isActive: true,
      allowAllStaff: true,
      members: {
        none: {
          userId: session.user.id
        }
      }
    },
    include: {
      _count: {
        select: { members: true, messages: true }
      }
    }
  })

  // Get request-only groups (not allowAllStaff, user not a member)
  const requestableGroups = await prisma.messageGroup.findMany({
    where: {
      isActive: true,
      allowAllStaff: false,
      members: {
        none: {
          userId: session.user.id
        }
      }
    },
    include: {
      _count: {
        select: { members: true, messages: true }
      }
    }
  })

  const pendingGroupIds = new Set(pendingRequests.map(r => r.group.id))

  return (
    <div className="h-full flex flex-col">
      <header className="flex-shrink-0 pb-3">
        <h1 className="text-lg font-bold text-gray-900">Messages</h1>
        <p className="text-xs text-gray-500">Connect with your team</p>
      </header>

      <div className="flex-1 min-h-0 overflow-auto space-y-4">
        {/* Pending Requests */}
        {pendingRequests.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <h3 className="text-sm font-semibold text-yellow-900 mb-2">
              Pending Approval ({pendingRequests.length})
            </h3>
            <div className="space-y-2">
              {pendingRequests.map((req) => (
                <div key={req.id} className="flex items-center gap-2 text-xs text-yellow-700">
                  <span className="text-lg">{req.group.iconEmoji}</span>
                  <span>{req.group.name}</span>
                  <Clock className="w-3 h-3 ml-auto" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Available Groups - Open to All */}
        {openGroups.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">
              Open Groups - Join Instantly
            </h3>
            <div className="space-y-2">
              {openGroups.map((group) => (
                <Link
                  key={group.id}
                  href={`/staff/groups/join/${group.id}`}
                  className="flex items-center gap-3 text-xs text-blue-700 hover:text-blue-800 p-1.5 rounded hover:bg-blue-100 transition-colors"
                >
                  <span className="text-lg">{group.iconEmoji}</span>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium">{group.name}</span>
                    <div className="flex items-center gap-2 text-blue-500">
                      <span className="flex items-center gap-0.5"><Users className="w-3 h-3" /> {group._count.members}</span>
                      <span className="flex items-center gap-0.5"><MessageSquare className="w-3 h-3" /> {group._count.messages}</span>
                    </div>
                  </div>
                  <Plus className="w-4 h-4 shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Request Access Groups */}
        {requestableGroups.length > 0 && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              Other Groups - Request Access
            </h3>
            <div className="space-y-2">
              {requestableGroups.map((group) => {
                const isPending = pendingGroupIds.has(group.id)
                return (
                  <Link
                    key={group.id}
                    href={`/staff/groups/join/${group.id}`}
                    className={cn(
                      "flex items-center gap-3 text-xs p-1.5 rounded transition-colors",
                      isPending
                        ? "text-yellow-700 bg-yellow-50 cursor-default"
                        : "text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                    )}
                  >
                    <span className="text-lg">{group.iconEmoji}</span>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">{group.name}</span>
                      <div className="flex items-center gap-2 text-gray-400">
                        <span className="flex items-center gap-0.5"><Users className="w-3 h-3" /> {group._count.members}</span>
                        <span className="flex items-center gap-0.5"><MessageSquare className="w-3 h-3" /> {group._count.messages}</span>
                      </div>
                    </div>
                    {isPending ? (
                      <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full shrink-0">Pending</span>
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* My Groups */}
        {memberships.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500 mb-3">No message groups yet</p>
            <p className="text-xs text-gray-400">
              Join groups above or wait for admin to add you
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {memberships.map((membership) => {
              const group = membership.group
              const lastMessage = group.messages[0]

              return (
                <Link
                  key={group.id}
                  href={`/staff/groups/${group.id}`}
                  className="block bg-white rounded-lg border border-gray-200 p-3 hover:border-primary-300 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0",
                      `bg-${group.color}-100`
                    )}>
                      {group.iconEmoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-sm font-semibold text-gray-900 truncate">
                          {group.name}
                        </h3>
                        {lastMessage && (
                          <span className="text-xs text-gray-500">
                            {new Date(lastMessage.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric'
                            })}
                          </span>
                        )}
                      </div>
                      {lastMessage ? (
                        <p className="text-xs text-gray-600 truncate">
                          {lastMessage.sender.preferredName || lastMessage.sender.name}: {lastMessage.content}
                        </p>
                      ) : (
                        <p className="text-xs text-gray-400 italic">No messages yet</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Users className="w-3 h-3" />
                          {group.members.length}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <MessageSquare className="w-3 h-3" />
                          {group._count.messages}
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
