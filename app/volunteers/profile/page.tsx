import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { ProfileForm } from "@/components/staff/ProfileForm"
import { getRoleHomePath } from "@/lib/role-routes"

const db = prisma as any

export default async function VolunteerProfilePage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const roles = Array.isArray(session.user.roles) ? session.user.roles : [session.user.role]
  if (!roles.includes('VOLUNTEER')) {
    redirect(getRoleHomePath(session.user.primaryRole || session.user.role))
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: {
      documents: {
        orderBy: { createdAt: "desc" },
      },
    },
  })

  if (!user) return <div>User not found</div>

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0">
        <ProfileForm user={user} flat embedded />
      </div>
    </div>
  )
}
