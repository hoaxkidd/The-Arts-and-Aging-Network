import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { MessageSquare, Users, Plus, Settings } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { STYLES } from "@/lib/styles"
import { InlineStatStrip } from "@/components/ui/InlineStatStrip"

export const dynamic = 'force-dynamic'

export default async function AdminMessagingPage() {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') redirect('/dashboard')

  const groups = await prisma.messageGroup.findMany({
    take: 20,
    where: { isActive: true },
    include: {
      members: {
        where: { isActive: true },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              role: true
            }
          }
        }
      },
      _count: {
        select: {
          messages: true,
          members: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  const pendingRequests = await prisma.groupMember.findMany({
    where: { isActive: false },
    include: {
      group: true,
      user: {
        select: {
          id: true,
          name: true,
          role: true
        }
      }
    }
  })

  return (
    <div className="h-full flex flex-col min-w-0">
      <div className="flex-shrink-0 mb-6 flex items-center justify-end">
        <Link
          href="/admin/messaging/new"
          className={cn(STYLES.btn, STYLES.btnPrimary)}
        >
          <Plus className="w-4 h-4" />
          New Group
        </Link>
      </div>

      <InlineStatStrip
        className="mb-6"
        items={[
          { label: 'Total Groups', value: groups.length },
          { label: 'Total Members', value: groups.reduce((sum, g) => sum + g._count.members, 0), tone: 'info' },
          { label: 'Pending Requests', value: pendingRequests.length, tone: 'warning' },
        ]}
      />

      {/* Pending Requests Alert */}
      {pendingRequests.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <h3 className="text-sm font-semibold text-yellow-900 mb-2">
            {pendingRequests.length} Pending Access Request{pendingRequests.length !== 1 ? 's' : ''}
          </h3>
          <Link
            href="/admin/messaging/requests"
            className="text-sm text-yellow-700 hover:text-yellow-800 underline"
          >
            Review requests →
          </Link>
        </div>
      )}

      {/* Groups List */}
      <div className="flex-1 min-h-0 overflow-auto">
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
                  {group.description && (
                    <p className="text-xs text-gray-600 line-clamp-2 mt-1">
                      {group.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {group._count.members} members
                </div>
                <div className="flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  {group._count.messages} messages
                </div>
              </div>

                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-xs px-2 py-1 rounded",
                  group.type === 'CUSTOM' && "bg-purple-100 text-purple-700",
                  group.type === 'EVENT_BASED' && "bg-blue-100 text-blue-700",
                  group.type === 'ROLE_BASED' && "bg-green-100 text-green-700"
                )}>
                  {group.type}
                  </span>
                  {group.isAttachableToForms && (
                    <span className="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded">
                      Form-attachable
                    </span>
                  )}
                  {group.allowAllStaff && (
                    <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                      Open to All Staff
                  </span>
                )}
              </div>

              <Link
                href={`/admin/messaging/${group.id}`}
                className="mt-3 block text-center px-3 py-2 text-xs font-medium text-primary-600 bg-primary-50 rounded hover:bg-primary-100"
              >
                <Settings className="w-3 h-3 inline mr-1" />
                Manage
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
