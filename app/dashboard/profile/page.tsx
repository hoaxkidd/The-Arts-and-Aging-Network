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
    <div className="h-full flex flex-col">
      {/* Simple header */}
      <header className="flex-shrink-0 pb-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-primary-100 text-primary-600 flex items-center justify-center">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-gray-900">Profile & Settings</h1>
            <p className="text-xs text-gray-500">
              Manage your facility details and personal account information
            </p>
          </div>
        </div>
      </header>

      {/* Tabbed content */}
      <div className="flex-1 min-h-0 overflow-auto pt-4">
        <HomeProfileTabs
          facilityContent={
            home ? (
              <HomeProfileForm home={home} />
            ) : (
              <div className="p-8 text-center text-sm text-gray-500 border border-dashed border-gray-300 rounded-md">
                No facility profile is linked to this account yet.
              </div>
            )
          }
          accountContent={
            <ProfileForm
              user={user}
              documents={user?.documents || []}
              embedded
            />
          }
        />
      </div>
    </div>
  )
}
