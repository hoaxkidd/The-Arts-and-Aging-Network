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
    <div className="h-full flex flex-col px-4 sm:px-6 py-5">
      <div className="flex-shrink-0 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
            <p className="text-sm text-gray-500 mt-1">Review and update your profile and intake information.</p>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <ProfileForm user={user} flat embedded />
      </div>
    </div>
  )
}
