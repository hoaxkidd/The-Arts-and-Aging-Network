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
      <div className="flex-1 min-h-0">
        <ProfileForm user={user} flat embedded />
      </div>
    </div>
  )
}
