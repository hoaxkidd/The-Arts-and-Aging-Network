import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Building2, User } from "lucide-react"
import { HomeProfileForm } from "@/components/dashboard/HomeProfileForm"
import { ProfileForm } from "@/components/staff/ProfileForm"
import { cn } from "@/lib/utils"
import Link from "next/link"

export default async function HomeProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
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

  const params = await searchParams
  const activeTab = params.tab === 'account' ? 'account' : 'facility'

  return (
    <div className="h-full flex flex-col">
      {/* Sticky Header - Title + Tabs together */}
      <div className="flex-shrink-0 pb-0">
        <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
          <div className="w-10 h-10 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Profile & Settings</h1>
            <p className="text-sm text-gray-500 mt-1">Manage your facility details and personal account information</p>
          </div>
        </div>

        {/* Tab Navigation - part of sticky header */}
        <div className="flex border-b border-gray-200 mt-3 -mb-px">
          <Link
            href="/dashboard/profile?tab=facility"
            className={cn(
              "px-6 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors cursor-pointer",
              activeTab === 'facility'
                ? "border-primary-600 text-primary-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            )}
          >
            <Building2 className="w-4 h-4" />
            Facility Profile
          </Link>
          <Link
            href="/dashboard/profile?tab=account"
            className={cn(
              "px-6 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors cursor-pointer",
              activeTab === 'account'
                ? "border-primary-600 text-primary-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            )}
          >
            <User className="w-4 h-4" />
            My Account
          </Link>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 py-5 overflow-y-auto">
        {activeTab === 'facility' ? (
          home ? (
            <HomeProfileForm home={home} />
          ) : (
            <div className="p-8 text-center text-sm text-gray-500 border border-dashed border-gray-300 rounded-md">
              No facility profile is linked to this account yet.
            </div>
          )
        ) : (
          <ProfileForm
            user={user}
            documents={user?.documents || []}
            embedded
          />
        )}
      </div>
    </div>
  )
}
