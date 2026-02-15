import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getConversation, getConversations } from "@/app/actions/conversations"
import { prisma } from "@/lib/prisma"
import { ConversationSplitView } from "@/components/messaging/ConversationSplitView"
import { notFound } from "next/navigation"

export default async function ConversationPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login')
  }

  // Get conversation, conversations list, and groups in parallel
  const [conversationResult, conversationsResult, groupMemberships] = await Promise.all([
    getConversation(id),
    getConversations(),
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
    })
  ])

  if ('error' in conversationResult) {
    if (conversationResult.error === 'User not found') {
      notFound()
    }
    return <div className="p-4 text-red-600">{conversationResult.error}</div>
  }

  if ('error' in conversationsResult) {
    return <div className="p-4 text-red-600">{conversationsResult.error}</div>
  }

  return (
    <ConversationSplitView
      conversations={conversationsResult.conversations}
      groupMemberships={groupMemberships}
      currentUserId={session.user.id}
      currentUserRole={session.user.role as string}
      activeConversation={{
        partner: conversationResult.partner,
        messages: conversationResult.messages
      }}
    />
  )
}
