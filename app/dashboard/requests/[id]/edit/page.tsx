import { auth } from '@/auth'
import { redirect, notFound } from 'next/navigation'
import { getEventRequestDetail } from '@/app/actions/booking-requests'
import { EditEventRequestForm } from '@/components/booking-requests/EditEventRequestForm'

export default async function EditHomeRequestPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  if (session.user.role !== 'HOME_ADMIN') redirect('/dashboard/my-bookings?section=requests')

  const { id } = await params
  const result = await getEventRequestDetail(id)
  if (result.error || !result.data) notFound()

  return (
    <div className="mx-auto w-full max-w-5xl px-2 pb-4 md:px-4">
      <EditEventRequestForm request={result.data as never} />
    </div>
  )
}
