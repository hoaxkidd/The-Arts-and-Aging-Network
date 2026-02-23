import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { CommunicationHubClient } from "./CommunicationHubClient"

export default async function CommunicationHubPage() {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') redirect('/dashboard')

  const [groups, pendingGroupRequests, pendingConversationRequests, invitations] = await Promise.all([
    // Groups
    prisma.messageGroup.findMany({
      where: { isActive: true },
      include: {
        members: { where: { isActive: true }, include: { user: { select: { id: true, name: true, role: true } } } },
        _count: { select: { messages: true, members: true } }
      },
      orderBy: { createdAt: 'desc' }
    }),
    // Pending Group Requests
    prisma.groupMember.findMany({
      where: { isActive: false },
      include: {
        group: { select: { id: true, name: true, iconEmoji: true, type: true } },
        user: { select: { id: true, name: true, preferredName: true, role: true, image: true } }
      },
      orderBy: { joinedAt: 'desc' }
    }),
    // Pending Conversation Requests (Using a mock or actual query depending on implementation)
    prisma.directMessageRequest.findMany({
        where: { status: 'PENDING' },
        include: {
            requester: { select: { id: true, name: true, preferredName: true, image: true, role: true } },
            requested: { select: { id: true, name: true, preferredName: true, image: true, role: true } }
        }
    }).catch(() => []), // Fallback if table doesn't exist yet
    // Invitations
    prisma.invitation.findMany({
        orderBy: { createdAt: 'desc' },
        include: { createdBy: { select: { name: true } } }
    })
  ])

  return (
    <CommunicationHubClient 
        groups={groups}
        pendingGroupRequests={pendingGroupRequests}
        pendingConversationRequests={pendingConversationRequests}
        invitations={invitations}
        currentUserId={session.user.id || ''}
    />
  )
}
