import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { Mail } from "lucide-react"
import { STYLES } from "@/lib/styles"
import { cn } from "@/lib/utils"
import UsersTable from "@/components/admin/UsersTable"

export default async function UsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { name: 'asc' },
    include: {
      geriatricHome: true,
    },
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage access and roles for all members</p>
        </div>
        <Link href="/admin/invitations" className={cn(STYLES.btn, STYLES.btnPrimary, "self-start sm:self-auto")}>
          <Mail className="w-4 h-4" />
          Invite New User
        </Link>
      </div>
      <UsersTable users={users} />
    </div>
  )
}
