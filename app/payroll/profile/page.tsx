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
      <div className="flex-1 min-h-0 overflow-auto pt-4">
        <ProfileForm user={user} documents={user.documents || []} embedded />
      </div>
    </div>
  )
}
