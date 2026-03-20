import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getPendingConversationRequests } from "@/app/actions/conversation-requests"
import { ConversationRequestsList } from "@/components/admin/ConversationRequestsList"

export const revalidate = 30

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
    <div className="space-y-6">
      <ConversationRequestsList requests={result.requests} />
    </div>
  )
}
