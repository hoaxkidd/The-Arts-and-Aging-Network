import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { User } from "lucide-react"
import { ProfileForm } from "@/components/staff/ProfileForm"

const db = prisma as any

export default async function StaffProfilePage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

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
      {/* Simple header, shared style */}
      <header className="flex-shrink-0 pb-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-primary-100 text-primary-600 flex items-center justify-center">
            <User className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-gray-900">My Profile</h1>
            <p className="text-xs text-gray-500">
              Review and update your profile and intake information.
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-auto pt-4">
        <ProfileForm user={user} flat embedded />
      </div>
    </div>
  )
}
