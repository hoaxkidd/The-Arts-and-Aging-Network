import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Building2, User } from "lucide-react"
import { HomeProfileForm } from "@/components/dashboard/HomeProfileForm"
import { ProfileForm } from "@/components/staff/ProfileForm"
import { cn } from "@/lib/utils"

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
      {/* Sticky Header - Title + Tabs together */}
      <div className="sticky top-0 z-20 bg-gray-50 px-4 sm:px-6 pt-5 pb-0">
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
          <button
            className={cn(
              "px-6 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors cursor-pointer",
              "border-primary-600 text-primary-600"
            )}
            id="tab-facility"
          >
            <Building2 className="w-4 h-4" />
            Facility Profile
          </button>
          <button
            className={cn(
              "px-6 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors cursor-pointer",
              "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            )}
            id="tab-account"
          >
            <User className="w-4 h-4" />
            My Account
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 px-4 sm:px-6 py-5 overflow-y-auto">
        {/* Facility Profile Tab Content */}
        <div id="panel-facility">
          {home ? (
            <HomeProfileForm home={home} />
          ) : (
            <div className="p-8 text-center text-sm text-gray-500 border border-dashed border-gray-300 rounded-md">
              No facility profile is linked to this account yet.
            </div>
          )}
        </div>

        {/* My Account Tab Content - hidden by default */}
        <div id="panel-account" className="hidden">
          <ProfileForm
            user={user}
            documents={user?.documents || []}
            embedded
          />
        </div>
      </div>

      {/* Client-side tab logic */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              const tabFacility = document.getElementById('tab-facility');
              const tabAccount = document.getElementById('tab-account');
              const panelFacility = document.getElementById('panel-facility');
              const panelAccount = document.getElementById('panel-account');
              
              function switchTab(tab) {
                if (tab === 'facility') {
                  tabFacility.classList.add('border-primary-600', 'text-primary-600');
                  tabFacility.classList.remove('border-transparent', 'text-gray-500');
                  tabAccount.classList.remove('border-primary-600', 'text-primary-600');
                  tabAccount.classList.add('border-transparent', 'text-gray-500');
                  panelFacility.classList.remove('hidden');
                  panelAccount.classList.add('hidden');
                } else {
                  tabAccount.classList.add('border-primary-600', 'text-primary-600');
                  tabAccount.classList.remove('border-transparent', 'text-gray-500');
                  tabFacility.classList.remove('border-primary-600', 'text-primary-600');
                  tabFacility.classList.add('border-transparent', 'text-gray-500');
                  panelAccount.classList.remove('hidden');
                  panelFacility.classList.add('hidden');
                }
              }
              
              tabFacility.addEventListener('click', function() { switchTab('facility'); });
              tabAccount.addEventListener('click', function() { switchTab('account'); });
            })();
          `
        }}
      />
    </div>
  )
}
