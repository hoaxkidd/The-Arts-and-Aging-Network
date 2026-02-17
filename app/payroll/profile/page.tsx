import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { ProfileForm } from "@/components/staff/ProfileForm"
import { User } from "lucide-react"

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
    },
  })

  if (!user) return <div>User not found</div>

  return (
    <div className="h-full flex flex-col">
      {/* Simple header, no cards */}
      <header className="flex-shrink-0 pb-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-primary-100 text-primary-600 flex items-center justify-center">
            <User className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-gray-900">My Profile</h1>
            <p className="text-xs text-gray-500">
              Update your contact, emergency, and intake details.
            </p>
          </div>
        </div>
      </header>

      {/* Main content, tabbed layout without card wrapper */}
      <div className="flex-1 min-h-0 overflow-auto pt-4">
        <ProfileForm user={user} documents={user.documents || []} embedded />
      </div>
    </div>
  )
}
