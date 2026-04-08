import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { AddHomeButton } from "@/components/admin/AddHomeButton"
import { HomeList } from "@/components/admin/HomeList"

export const dynamic = 'force-dynamic'

export default async function AdminHomesPage() {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    return <div>Unauthorized</div>
  }

  const homes = await prisma.geriatricHome.findMany({
    include: {
      user: { select: { email: true, status: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="bg-white px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700">
          Total Homes: <span className="text-primary-600 font-bold ml-1">{homes.length}</span>
        </div>
        <AddHomeButton />
      </div>
      <HomeList initialHomes={homes} />
    </div>
  )
}
