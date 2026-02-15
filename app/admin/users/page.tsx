import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { Users, UserCheck, UserX, Mail } from "lucide-react"
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-500 text-sm">Manage access and roles for all members</p>
        </div>
        <Link href="/admin/invitations" className={cn(STYLES.btn, STYLES.btnPrimary)}>
          <Mail className="w-4 h-4" />
          Invite New User
        </Link>
      </div>

      {/* Users Table with Search and Filters */}
      <UsersTable users={users} />
    </div>
  )
}
