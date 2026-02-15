import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getPendingConversationRequests } from "@/app/actions/conversation-requests"
import { ConversationRequestsList } from "@/components/admin/ConversationRequestsList"

export default async function ConversationRequestsPage() {
  const session = await auth()

  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    redirect('/admin')
  }

  const result = await getPendingConversationRequests()

  if ('error' in result) {
    return <div className="p-4 text-red-600">{result.error}</div>
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Conversation Requests</h1>
        <p className="text-gray-600 mt-1">
          Review and approve requests to start conversations
        </p>
      </div>

      <ConversationRequestsList requests={result.requests} />
    </div>
  )
}
