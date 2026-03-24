import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { ClipboardList, Clock, CheckCircle } from "lucide-react"
import { ProfileForm } from "@/components/staff/ProfileForm"
import { OnboardingActions } from "@/components/staff/OnboardingActions"

export default async function StaffOnboardingPage(props: { searchParams: Promise<{ new?: string }> }) {
  const params = await props.searchParams
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { documents: { orderBy: { createdAt: "desc" } } },
  })

  if (!user) return <div>User not found</div>

  const isVolunteer = user.role === 'VOLUNTEER'
  const isNewVolunteer = params.new === 'true'
  const volunteerStatus = user.volunteerReviewStatus

  return (
    <div className="h-full flex flex-col">
      {/* Volunteer Status Banner */}
      {isVolunteer && volunteerStatus === 'PENDING_REVIEW' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-yellow-600" />
            <div>
              <p className="font-semibold text-yellow-800">Your application is pending review</p>
              <p className="text-sm text-yellow-700">
                Please complete your profile below. An administrator will review your information before you can access all features.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {isVolunteer && volunteerStatus === 'APPROVED' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div>
              <p className="font-semibold text-green-800">Your application has been approved!</p>
              <p className="text-sm text-green-700">
                You now have full access to the volunteer portal.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {isVolunteer && volunteerStatus === 'REQUEST_CORRECTIONS' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-red-600" />
            <div>
              <p className="font-semibold text-red-800">Action Required: Please Update Your Profile</p>
              <p className="text-sm text-red-700">
                An administrator has requested changes to your profile. Please review and update your information below.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="p-6">
            <ProfileForm
              user={user}
              documents={user.documents}
              isAdmin={false}
              visibleTabs={['personal', 'contact', 'emergency', 'health', 'intake']}
              flat
              showSaveButton={false}
            />
            <OnboardingActions redirectTo="/staff" />
          </div>
        </div>
      </div>
    </div>
  )
}
