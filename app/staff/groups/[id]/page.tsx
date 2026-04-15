import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { Users, Hash } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { MessageThread } from "@/components/messaging/MessageThread"
import { getStaffBasePathForRole } from "@/lib/role-routes"

export default async function GroupMessagesPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const basePath = getStaffBasePathForRole(session.user.role)

  const { id } = await params
  const isAdmin = session.user.role === 'ADMIN'

  // Get group first
  const group = await prisma.messageGroup.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      description: true,
      iconEmoji: true,
      color: true,
      type: true,
      allowAllStaff: true,
      isActive: true
    }
  })

  if (!group) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
          <Hash className="w-8 h-8 text-red-400" />
        </div>
        <p className="text-lg font-semibold text-gray-900 mb-1">Group not found</p>
        <p className="text-sm text-gray-500 mb-4">This group may have been deleted</p>
        <Link href={`${basePath}/inbox`} className="text-sm text-primary-600 hover:text-primary-700 font-medium">
          Back to Inbox
        </Link>
      </div>
    )
  }

  if (!group.isActive) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <Hash className="w-8 h-8 text-gray-400" />
        </div>
        <p className="text-lg font-semibold text-gray-900 mb-1">Group archived</p>
        <p className="text-sm text-gray-500 mb-4">This group is no longer active</p>
        <Link href={`${basePath}/inbox`} className="text-sm text-primary-600 hover:text-primary-700 font-medium">
          Back to Inbox
        </Link>
      </div>
    )
  }

  // Check membership
  const membership = await prisma.groupMember.findUnique({
    where: {
      groupId_userId: {
        groupId: id,
        userId: session.user.id
      }
    }
  })

  const hasAccess =
    (membership && membership.isActive) ||
    isAdmin ||
    group.allowAllStaff

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mb-4">
          <Users className="w-8 h-8 text-amber-400" />
        </div>
        <p className="text-lg font-semibold text-gray-900 mb-1">Access required</p>
        <p className="text-sm text-gray-500 mb-4">You need to be a member to view this group</p>
        <Link href={`${basePath}/inbox`} className="text-sm text-primary-600 hover:text-primary-700 font-medium">
          Back to Inbox
        </Link>
      </div>
    )
  }

  // Get group members
  const members = await prisma.groupMember.findMany({
    where: {
      groupId: id,
      isActive: true
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          preferredName: true,
          image: true,
          role: true
        }
      }
    },
    orderBy: { joinedAt: 'asc' }
  })

  // Get messages
  const messages = await prisma.groupMessage.findMany({
    where: { groupId: id },
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          preferredName: true,
          image: true
        }
      },
      reactions: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              preferredName: true
            }
          }
        }
      }
    },
    orderBy: { createdAt: 'asc' },
    take: 100
  })

  // Mark as read (only if member)
  if (membership) {
    await prisma.groupMember.update({
      where: {
        groupId_userId: {
          groupId: id,
          userId: session.user.id
        }
      },
      data: { lastReadAt: new Date() }
    })
  }

  return (
    <div className="h-full flex flex-col">
      {/* Messages Thread */}
      <div className="flex-1 min-h-0">
        <MessageThread
          groupId={group.id}
          currentUserId={session.user.id}
          currentUserRole={session.user.role as string}
          myGroupRole={membership?.role || 'MEMBER'}
          initialMessages={messages}
          members={members}
          isMuted={membership?.isMuted || false}
        />
      </div>
    </div>
  )
}
