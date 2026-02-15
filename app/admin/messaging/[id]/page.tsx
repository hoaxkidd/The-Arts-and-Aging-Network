import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { ArrowLeft, Users, MessageSquare, Settings } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { GroupMembersList } from "@/components/messaging/GroupMembersList"
import { GroupSettings } from "@/components/messaging/GroupSettings"

export default async function ManageGroupPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') redirect('/dashboard')

  const { id } = await params

  const group = await prisma.messageGroup.findUnique({
    where: { id },
    include: {
      members: {
        where: { isActive: true },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              preferredName: true,
              email: true,
              role: true,
              image: true
            }
          }
        },
        orderBy: { joinedAt: 'desc' }
      },
      _count: {
        select: { messages: true }
      }
    }
  })

  if (!group) {
    redirect('/admin/messaging')
  }

  // Get all staff not in the group
  const existingMemberIds = group.members.map(m => m.userId)
  const availableStaff = await prisma.user.findMany({
    where: {
      role: { in: ['FACILITATOR', 'CONTRACTOR', 'PAYROLL'] },
      status: 'ACTIVE',
      id: { notIn: existingMemberIds }
    },
    select: {
      id: true,
      name: true,
      preferredName: true,
      email: true,
      role: true,
      image: true
    },
    orderBy: { name: 'asc' }
  })

  return (
    <div className="h-full flex flex-col p-6">
      <div className="flex-shrink-0 mb-6">
        <Link
          href="/admin/messaging"
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 mb-2"
        >
          <ArrowLeft className="w-3 h-3" /> Back to Messaging
        </Link>

        <div className="flex items-start gap-4">
          <div className={cn(
            "w-16 h-16 rounded-lg flex items-center justify-center text-3xl",
            `bg-${group.color}-100`
          )}>
            {group.iconEmoji}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{group.name}</h1>
            {group.description && (
              <p className="text-sm text-gray-600 mt-1">{group.description}</p>
            )}
            <div className="flex items-center gap-4 mt-2">
              <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                {group.type}
              </span>
              {group.allowAllStaff && (
                <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                  Open to All Staff
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Members</p>
              <p className="text-xl font-bold text-gray-900">{group.members.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Messages</p>
              <p className="text-xl font-bold text-gray-900">{group._count.messages}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto space-y-6">
        {/* Members List */}
        <GroupMembersList
          groupId={group.id}
          members={group.members}
          availableStaff={availableStaff}
        />

        {/* Group Settings */}
        <GroupSettings group={group} />
      </div>
    </div>
  )
}
