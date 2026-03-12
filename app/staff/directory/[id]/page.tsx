import { getStaffPublicProfile } from '@/app/actions/directory'
import { StaffPublicProfile } from '@/components/staff/StaffPublicProfile'
import { auth } from '@/auth'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, User } from 'lucide-react'
import Link from 'next/link'

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
      {/* Header - consistent with other staff pages */}
      <header className="flex-shrink-0 pb-3 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <Link
            href="/staff/directory"
            className="w-8 h-8 rounded-md bg-primary-100 text-primary-600 flex items-center justify-center hover:bg-primary-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-base font-semibold text-gray-900">Staff Profile</h1>
            <p className="text-xs text-gray-500">
              View staff member details
            </p>
          </div>
        </div>
      </header>

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
