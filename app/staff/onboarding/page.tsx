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
