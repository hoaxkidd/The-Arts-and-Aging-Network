import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { getRoleHomePath } from "@/lib/role-routes"
import { normalizeRoleList, ROLE_LABELS, VALID_ROLES, type UserRole } from "@/lib/roles"
import { STYLES } from "@/lib/styles"
import { cn } from "@/lib/utils"

export default async function ChooseRolePage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/choose-role")
  }

  const raw = Array.isArray(session.user.roles)
    ? session.user.roles
    : session.user.role
      ? [session.user.role]
      : []
  const roles = normalizeRoleList(
    raw.filter((r: unknown): r is string => typeof r === "string"),
  )

  if (roles.length <= 1) {
    redirect(getRoleHomePath(session.user.primaryRole || session.user.role))
  }

  const ordered = VALID_ROLES.filter((r) => roles.includes(r)) as UserRole[]

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className={cn(STYLES.card, "w-full max-w-md shadow-sm")}>
        <h1 className="text-xl font-bold text-gray-900 mb-1">Choose a portal</h1>
        <p className="text-sm text-gray-600 mb-6">
          Your account has multiple roles. Pick where you want to go; this becomes your active portal until you switch again from the sidebar.
        </p>
        <ul className="space-y-2">
          {ordered.map((role) => {
            const home = getRoleHomePath(role)
            const href = `/role/select?role=${encodeURIComponent(role)}&next=${encodeURIComponent(home)}`
            const label = ROLE_LABELS[role] ?? role
            return (
              <li key={role}>
                <Link
                  href={href}
                  className={cn(STYLES.btn, STYLES.btnSecondary, "w-full justify-between text-left")}
                >
                  <span>{label}</span>
                  <span className="text-xs text-gray-500 font-normal">{home}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
