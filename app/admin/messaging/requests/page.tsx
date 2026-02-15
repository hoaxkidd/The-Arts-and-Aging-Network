import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { CheckCircle, XCircle, UserPlus, ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { approveGroupAccess, denyGroupAccess } from "@/app/actions/messaging"

export default async function MessagingRequestsPage() {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') redirect('/dashboard')

  const pendingRequests = await prisma.groupMember.findMany({
    where: { isActive: false },
    include: {
      group: {
        select: {
          id: true,
          name: true,
          iconEmoji: true,
          color: true,
          type: true
        }
      },
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
        <h1 className="text-2xl font-bold text-gray-900">Pending Access Requests</h1>
        <p className="text-sm text-gray-500">Review and approve member requests</p>
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        {pendingRequests.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <UserPlus className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No pending requests</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingRequests.map((request) => (
              <div
                key={request.id}
                className="bg-white rounded-lg border border-gray-200 p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-semibold">
                      {request.user.name?.[0] || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900">
                          {request.user.preferredName || request.user.name}
                        </span>
                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded">
                          {request.user.role}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        wants to join <span className="font-medium">{request.group.iconEmoji} {request.group.name}</span>
                      </p>
                      <p className="text-xs text-gray-500">
                        Requested {request.joinedAt.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <form action={async () => {
                      'use server'
                      await approveGroupAccess(request.group.id, request.user.id)
                      redirect('/admin/messaging/requests')
                    }}>
                      <button className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Approve
                      </button>
                    </form>
                    <form action={async () => {
                      'use server'
                      await denyGroupAccess(request.group.id, request.user.id)
                      redirect('/admin/messaging/requests')
                    }}>
                      <button className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded flex items-center gap-1">
                        <XCircle className="w-3 h-3" />
                        Deny
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
