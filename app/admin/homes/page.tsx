import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { HomeList } from "@/components/admin/HomeList"
import { Building } from "lucide-react"
import { AddHomeButton } from "@/components/admin/AddHomeButton"
import { logger } from "@/lib/logger"

export const revalidate = 60

export default async function AdminHomesPage() {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') return <div>Unauthorized</div>

  try {
    // Ensure prisma client is ready and model exists
    // Use any casting to bypass stale type definition in IDE
    const prismaClient = prisma as any
    
    if (!prismaClient || !prismaClient.geriatricHome) {
        throw new Error("Database client not fully initialized or schema mismatch.")
    }

    const homes = await prismaClient.geriatricHome.findMany({
        take: 100,
        include: {
            user: {
                select: { email: true, status: true }
            }
        },
        orderBy: { createdAt: 'desc' }
    })

    return (
        <div className="space-y-6">
        <div className="flex items-center gap-3">
            <div className="bg-white px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700">
                Total Homes: <span className="text-primary-600 font-bold ml-1">{homes.length}</span>
            </div>
            <AddHomeButton />
        </div>

        <HomeList initialHomes={homes} />
        </div>
    )
  } catch (error) {
    logger.serverAction("Failed to load homes:", error)
    return (
        <div className="p-6 bg-red-50 border border-red-100 rounded-lg text-red-700">
            <h3 className="font-bold mb-2">Error Loading Homes</h3>
            <p className="text-sm">
                Unable to fetch geriatric home data. This might be due to a database connection issue or pending schema update.
            </p>
            <p className="text-xs mt-4 text-red-500 font-mono">
                {String(error)}
            </p>
        </div>
    )
  }
}
