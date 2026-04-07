import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { CommunicationHubClient } from "./CommunicationHubClient"

export const revalidate = 30

export default async function CommunicationHubPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') redirect('/dashboard')

  const params = await searchParams
  const allowedTabs = new Set(['messages', 'groups', 'requests', 'emailTemplates', 'invitations', 'testimonials'])
  const initialTab = allowedTabs.has(params.tab || '') ? (params.tab as string) : 'messages'

  const [groups, pendingGroupRequests, pendingConversationRequests, invitations, testimonials, eventFeedback] = await Promise.all([
    // Groups
    prisma.messageGroup.findMany({
      take: 20,
      where: { isActive: true },
      include: {
        members: { where: { isActive: true }, include: { user: { select: { id: true, name: true, role: true } } } },
        _count: { select: { messages: true, members: true } }
      },
      orderBy: { createdAt: 'desc' }
    }),
    // Pending Group Requests
    prisma.groupMember.findMany({
      take: 20,
      where: { isActive: false },
      include: {
        group: { select: { id: true, name: true, iconEmoji: true, type: true } },
        user: { select: { id: true, name: true, preferredName: true, role: true, image: true } }
      },
      orderBy: { joinedAt: 'desc' }
    }),
    // Pending Conversation Requests
    prisma.directMessageRequest.findMany({
        take: 20,
        where: { status: 'PENDING' },
        include: {
            requester: { select: { id: true, name: true, preferredName: true, image: true, role: true } },
            requested: { select: { id: true, name: true, preferredName: true, image: true, role: true } }
        }
    }).catch(() => []),
    // Invitations
    prisma.invitation.findMany({
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: { createdBy: { select: { name: true } } }
    }),
    // Testimonials
    prisma.testimonial.findMany({
      include: {
        event: { select: { id: true, title: true } },
        collector: { select: { name: true } }
      },
      orderBy: [{ featured: 'desc' }, { collectedAt: 'desc' }]
    }),
    // Event Feedback (from attendances with feedback)
    prisma.eventAttendance.findMany({
      where: {
        OR: [
          { feedbackRating: { not: null } },
          { feedbackComment: { not: null } }
        ]
      },
      include: {
        user: { select: { id: true, name: true, preferredName: true } },
        event: { select: { id: true, title: true, startDateTime: true } }
      },
      orderBy: { updatedAt: 'desc' },
      take: 50
    })
  ])

  return (
    <CommunicationHubClient 
      groups={groups as never[]}
      pendingGroupRequests={pendingGroupRequests as never[]}
      pendingConversationRequests={pendingConversationRequests as never[]}
      invitations={invitations as never[]}
      testimonials={testimonials as never[]}
      eventFeedback={eventFeedback as never[]}
      currentUserId={session.user.id || ''}
      initialTab={initialTab}
    />
  )
}
