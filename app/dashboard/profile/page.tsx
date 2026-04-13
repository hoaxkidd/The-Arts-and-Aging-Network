import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Building2, FileText, User } from "lucide-react"
import { HomeProfileForm } from "@/components/dashboard/HomeProfileForm"
import { ProfileForm } from "@/components/staff/ProfileForm"
import { ProfileFormsTab } from "@/components/dashboard/ProfileFormsTab"
import { ProgramCoordinatorProfileForm } from "@/components/dashboard/ProgramCoordinatorProfileForm"
import { cn } from "@/lib/utils"
import Link from "next/link"

export default async function HomeProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; formsTab?: string; category?: string; view?: string; sort?: string; search?: string; status?: string }>
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

  const isHomeAdmin = user.role === 'HOME_ADMIN'

  const params = await searchParams
  const activeTab = params.tab === 'account' || params.tab === 'forms' ? params.tab : 'facility'

  return (
    <div className="h-full flex flex-col">
      {/* Tab Navigation */}
      <div className="flex flex-nowrap items-center gap-1 overflow-x-auto flex-shrink-0 border-b border-gray-200 -mb-px">
          <Link
            href="/dashboard/profile?tab=facility"
            className={cn(
              "px-6 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors cursor-pointer whitespace-nowrap shrink-0",
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
              "px-6 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors cursor-pointer whitespace-nowrap shrink-0",
              activeTab === 'account'
                ? "border-primary-600 text-primary-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            )}
          >
            <User className="w-4 h-4" />
            My Account
          </Link>
          {isHomeAdmin && (
            <Link
              href="/dashboard/profile?tab=forms&formsTab=browse"
              className={cn(
                "px-6 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors cursor-pointer whitespace-nowrap shrink-0",
                activeTab === 'forms'
                  ? "border-primary-600 text-primary-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              )}
            >
              <FileText className="w-4 h-4" />
              Forms
            </Link>
          )}
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
        ) : activeTab === 'account' ? (
          isHomeAdmin ? (
            <ProgramCoordinatorProfileForm user={user} />
          ) : (
            <div className="space-y-4">
              <ProfileForm
                user={user}
                documents={user?.documents || []}
                embedded
              />
            </div>
          )
        ) : (
          <ProfileFormsTab userId={session.user.id} userRole={user.role} params={params} />
        )}
      </div>
    </div>
  )
}
