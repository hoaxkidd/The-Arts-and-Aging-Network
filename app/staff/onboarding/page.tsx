import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { ClipboardList } from "lucide-react"
import { ProfileForm } from "@/components/staff/ProfileForm"
import { OnboardingActions } from "@/components/staff/OnboardingActions"

export default async function StaffOnboardingPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { documents: { orderBy: { createdAt: "desc" } } },
  })

  if (!user) return <div>User not found</div>

  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 pb-3 mb-3 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Complete your profile</h1>
            <p className="text-sm text-gray-500 mt-1">Review and update your details. Click Save & Continue when done.</p>
          </div>
        </div>
      </div>

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
