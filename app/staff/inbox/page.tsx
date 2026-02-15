import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getConversations } from "@/app/actions/conversations"
import { prisma } from "@/lib/prisma"
import { ConversationSplitView } from "@/components/messaging/ConversationSplitView"

export default async function InboxPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const isAdmin = session.user.role === 'ADMIN'

  // Get conversations, memberships, pending requests, and discoverable groups in parallel
  const [conversationsResult, groupMemberships, pendingMemberships, discoverableGroups] = await Promise.all([
    getConversations(),
    // Groups user is explicitly a member of
    prisma.groupMember.findMany({
      where: {
        userId: session.user.id,
        isActive: true
      },
      include: {
        group: {
          include: {
            _count: {
              select: {
                members: true,
                messages: true
              }
            },
            messages: {
              take: 1,
              orderBy: { createdAt: 'desc' },
              select: {
                content: true,
                createdAt: true,
                sender: {
                  select: {
                    name: true,
                    preferredName: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        group: {
          updatedAt: 'desc'
        }
      }
    }),
    // Pending membership requests
    prisma.groupMember.findMany({
      where: {
        userId: session.user.id,
        isActive: false
      },
      select: {
        groupId: true
      }
    }),
    // ALL active groups user is not a member of (for discovery)
    prisma.messageGroup.findMany({
      where: {
        isActive: true,
        members: {
          none: {
            userId: session.user.id
          }
        }
      },
      include: {
        _count: {
          select: {
            members: true,
            messages: true
          }
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: {
            content: true,
            createdAt: true,
            sender: {
              select: {
                name: true,
                preferredName: true
              }
            }
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    })
  ])

  const pendingGroupIds = new Set(pendingMemberships.map(p => p.groupId))

  // Combine explicit memberships and discoverable groups
  const allGroups = [
    ...groupMemberships,
    ...discoverableGroups.map(group => ({
      id: `discover-${group.id}`,
      groupId: group.id,
      userId: session.user.id,
      role: 'MEMBER' as const,
      isActive: true,
      isMuted: false,
      lastReadAt: null,
      joinedAt: new Date(),
      group,
      isDiscoverable: true,
      allowAllStaff: group.allowAllStaff,
      isPending: pendingGroupIds.has(group.id)
    }))
  ]

  if ('error' in conversationsResult) {
    return <div className="p-4 text-red-600">{conversationsResult.error}</div>
  }

  return (
    <ConversationSplitView
      conversations={conversationsResult.conversations}
      groupMemberships={allGroups}
      currentUserId={session.user.id}
      currentUserRole={session.user.role as string}
    />
  )
}
