import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Building2, User } from "lucide-react"
import { HomeProfileForm } from "@/components/dashboard/HomeProfileForm"
import { ProfileForm } from "@/components/staff/ProfileForm"
import { HomeProfileTabs } from "./HomeProfileTabs"

export default async function HomeProfilePage() {
  const session = await auth()
  const prismaClient = prisma as any

  if (!session?.user?.id) return <div>Unauthorized</div>

  const [home, user] = await Promise.all([
    prismaClient.geriatricHome.findUnique({
      where: { userId: session.user.id }
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      include: { documents: true }
    })
  ])

  if (!user) return <div>User not found</div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-gray-700" />
            Profile & Settings
        </h1>
        <p className="text-gray-500 text-sm mt-1">Manage your facility details and personal account information</p>
      </div>

      <HomeProfileTabs
        facilityContent={
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                {home ? (
                <HomeProfileForm home={home} />
                ) : (
                <div className="p-12 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                        <Building2 className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">No Facility Profile</h3>
                    <p className="text-gray-500 mt-1">Please contact support to link your account to a facility.</p>
                </div>
                )}
            </div>
        }
        accountContent={
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <ProfileForm user={user} documents={user?.documents || []} visibleTabs={['contact', 'emergency', 'documents']} flat />
            </div>
        }
      />
    </div>
  )
}
