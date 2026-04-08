import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { ProfileForm } from "@/components/staff/ProfileForm"
import { User } from "lucide-react"
import { setMyPrimaryRole } from "@/app/actions/user"
import { ROLE_LABELS, isValidRole } from "@/lib/roles"
import { cn } from "@/lib/utils"
import { STYLES } from "@/lib/styles"

export default async function PayrollProfilePage() {
  const session = await auth()
  if (!session?.user) return <div>Unauthorized</div>

  const prismaClient = prisma as any

  const user = await prismaClient.user.findUnique({
    where: { id: session.user.id },
    include: {
      documents: {
        orderBy: { createdAt: "desc" },
      },
      roleAssignments: {
        where: { isActive: true },
        orderBy: [{ isPrimary: 'desc' }, { assignedAt: 'asc' }],
        select: { role: true, isPrimary: true },
      },
    },
  })

  if (!user) return <div>User not found</div>

  const activeRoles: string[] = Array.isArray(user.roleAssignments)
    ? user.roleAssignments.map((a: any) => a.role).filter((r: any) => typeof r === 'string' && isValidRole(r))
    : []
  const primaryRole: string | undefined =
    user.roleAssignments?.find((a: any) => a.isPrimary)?.role || (isValidRole(user.role) ? user.role : undefined)
  const showPrimaryRolePicker = user.role !== 'HOME_ADMIN' && activeRoles.length > 1

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0 overflow-auto pt-4">
        {showPrimaryRolePicker && (
          <div className={cn(STYLES.card, "mb-4")}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-900">Default portal</p>
                <p className="text-xs text-gray-500 mt-0.5">This controls your default landing portal when signing in.</p>
              </div>
              {primaryRole ? (
                <span className={cn(STYLES.badge, STYLES.badgeInfo)}>
                  Current: {ROLE_LABELS[primaryRole as keyof typeof ROLE_LABELS] || primaryRole}
                </span>
              ) : null}
            </div>

            <form action={setMyPrimaryRole} className="mt-3 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {activeRoles.map((role) => (
                  <label key={role} className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2 hover:bg-gray-50">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{ROLE_LABELS[role as keyof typeof ROLE_LABELS] || role}</p>
                      <p className="text-[11px] text-gray-500 truncate">{role}</p>
                    </div>
                    <input
                      type="radio"
                      name="primaryRole"
                      value={role}
                      defaultChecked={role === primaryRole}
                      className="border-gray-300"
                    />
                  </label>
                ))}
              </div>
              <div className="flex justify-end">
                <button type="submit" className={cn(STYLES.btn, STYLES.btnSecondary)}>
                  Save default
                </button>
              </div>
            </form>
          </div>
        )}
        <ProfileForm user={user} documents={user.documents || []} embedded />
      </div>
    </div>
  )
}
