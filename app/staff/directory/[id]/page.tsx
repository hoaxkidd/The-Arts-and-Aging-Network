import { getStaffPublicProfile } from '@/app/actions/directory'
import { StaffPublicProfile } from '@/components/staff/StaffPublicProfile'
import { auth } from '@/auth'
import { notFound, redirect } from 'next/navigation'

export default async function StaffProfilePage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await auth()

  if (!session?.user?.id) {
    return <div className="text-red-600">Unauthorized</div>
  }

  const result = await getStaffPublicProfile(id)

  if ('error' in result) {
    if (result.error === 'Staff member not found') {
      notFound()
    }
    return <div className="text-red-600">{result.error}</div>
  }

  const { staff, upcomingEvents, phoneRequestStatus } = result
  const canonicalIdentifier = staff.userCode || staff.id
  if (id !== canonicalIdentifier) {
    redirect(`/staff/directory/${canonicalIdentifier}`)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Content */}
      <div className="flex-1 min-h-0 pt-4">
        <StaffPublicProfile
          staff={staff}
          upcomingEvents={upcomingEvents}
          phoneRequestStatus={phoneRequestStatus}
          currentUserId={session.user.id}
        />
      </div>
    </div>
  )
}
