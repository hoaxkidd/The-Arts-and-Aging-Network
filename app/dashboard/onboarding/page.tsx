import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { ClipboardList } from "lucide-react"
import { ProfileForm } from "@/components/staff/ProfileForm"
import { OnboardingActions } from "@/components/staff/OnboardingActions"

export default async function DashboardOnboardingPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { documents: { orderBy: { createdAt: "desc" } } },
  })

  if (!user) return <div>User not found</div>

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <ClipboardList className="w-6 h-6 text-primary-500" />
          Complete your profile
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Review the information below and update any details. When you&apos;re done, click the button to continue to your dashboard.
        </p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-6">
          <ProfileForm
            user={user}
            documents={user.documents}
            isAdmin={false}
            visibleTabs={['contact', 'emergency', 'documents']}
            flat
          />
          <OnboardingActions redirectTo="/dashboard" />
        </div>
      </div>
    </div>
  )
}
