import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Building2, CheckCircle2, Circle, User } from "lucide-react"
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

  const isHomeAdmin = user.role === 'HOME_ADMIN'

  let requiredForms: Array<{ id: string; title: string; category: string }> = []
  let submittedTemplateIds = new Set<string>()

  if (isHomeAdmin) {
    requiredForms = await prisma.formTemplate.findMany({
      where: {
        isActive: true,
        isPublic: false,
        allowedRoles: { contains: 'HOME_ADMIN' },
      },
      select: {
        id: true,
        title: true,
        category: true,
      },
      orderBy: { title: 'asc' },
    })

    if (requiredForms.length > 0) {
      const submissions = await prisma.formSubmission.findMany({
        where: {
          submittedBy: session.user.id,
          templateId: { in: requiredForms.map((template) => template.id) },
        },
        select: {
          templateId: true,
        },
      })
      submittedTemplateIds = new Set(submissions.map((submission) => submission.templateId))
    }
  }

  const params = await searchParams
  const activeTab = params.tab === 'account' ? 'account' : 'facility'

  return (
    <div className="h-full flex flex-col">
      {/* Tab Navigation */}
      <div className="flex-shrink-0 border-b border-gray-200 -mb-px">
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
          <div className="space-y-4">
            {isHomeAdmin && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <p className="text-sm font-semibold text-blue-900">Required Forms (Informational)</p>
                    <p className="text-xs text-blue-700">Complete assigned forms from your forms dashboard.</p>
                  </div>
                  <Link
                    href="/dashboard/forms"
                    className="text-sm font-medium text-blue-700 hover:text-blue-900 hover:underline"
                  >
                    Open Forms
                  </Link>
                </div>

                {requiredForms.length === 0 ? (
                  <p className="text-sm text-blue-700">No role-assigned forms at the moment.</p>
                ) : (
                  <div className="space-y-2">
                    {requiredForms.map((form) => {
                      const submitted = submittedTemplateIds.has(form.id)
                      return (
                        <div key={form.id} className="flex items-center justify-between bg-white rounded-md border border-blue-100 px-3 py-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{form.title}</p>
                            <p className="text-xs text-gray-500">{form.category}</p>
                          </div>
                          <span className={cn(
                            "inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded border",
                            submitted
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          )}>
                            {submitted ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}
                            {submitted ? 'Submitted' : 'Pending'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            <ProfileForm
              user={user}
              documents={user?.documents || []}
              visibleTabs={isHomeAdmin ? ['personal'] : undefined}
              identityOnly={isHomeAdmin}
              embedded
            />
          </div>
        )}
      </div>
    </div>
  )
}
