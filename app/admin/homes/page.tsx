import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { HomeList } from "@/components/admin/HomeList"
import { Building } from "lucide-react"

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
        include: {
            user: {
                select: { email: true }
            }
        },
        orderBy: { createdAt: 'desc' }
    })

    return (
        <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Building className="w-7 h-7 text-primary-600" />
                    Geriatric Homes
                </h1>
                <p className="text-gray-500 text-sm mt-1">
                    Manage registered facilities, view capacity metrics, and access contact details.
                </p>
            </div>
            <div className="bg-white px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700">
                Total Homes: <span className="text-primary-600 font-bold ml-1">{homes.length}</span>
            </div>
        </div>

        <HomeList initialHomes={homes} />
        </div>
    )
  } catch (error) {
    console.error("Failed to load homes:", error)
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
