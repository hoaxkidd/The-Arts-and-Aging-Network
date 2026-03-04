import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getHomeEventRequests } from "@/app/actions/event-requests"
import { RequestListClient } from "./RequestListClient"

type Props = {
  searchParams: Promise<{ tab?: string }>
}

export default async function HomeRequestsPage({ searchParams }: Props) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const params = await searchParams
  const tabParam = params.tab || 'all'

  const result = await getHomeEventRequests()

  if (result.error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600">{result.error}</p>
      </div>
    )
  }

  const requests = result.data || []

  // Stats
  const pending = requests.filter((r: any) => r.status === 'PENDING').length
  const approved = requests.filter((r: any) => r.status === 'APPROVED').length
  const rejected = requests.filter((r: any) => r.status === 'REJECTED').length

  const tabs = [
    { id: 'all', label: 'All Requests', count: requests.length },
    { id: 'PENDING', label: 'Pending', count: pending },
    { id: 'APPROVED', label: 'Approved', count: approved },
    { id: 'REJECTED', label: 'Declined', count: rejected },
  ]

  return (
    <RequestListClient 
      requests={requests as any} 
      tabs={tabs} 
      initialTab={tabParam}
    />
  )
}
