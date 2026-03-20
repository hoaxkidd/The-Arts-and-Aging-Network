import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { Mail, UserPlus } from "lucide-react"
import { STYLES } from "@/lib/styles"
import { cn } from "@/lib/utils"
import UsersTable from "@/components/admin/UsersTable"

export const revalidate = 60

export default async function UsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { name: 'asc' },
    take: 100,
    include: {
      geriatricHome: true,
    },
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/admin/invitations" className={cn(STYLES.btn, STYLES.btnPrimary)}>
          <Mail className="w-4 h-4" />
          Invite New User
        </Link>
        <Link href="/admin/users/new" className={cn(STYLES.btn, STYLES.btnSecondary)}>
          <UserPlus className="w-4 h-4" />
          Create Staff Profile
        </Link>
      </div>
      <UsersTable users={users} />
    </div>
  )
}
