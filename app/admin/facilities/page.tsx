import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { STYLES } from "@/lib/styles"
import { cn } from "@/lib/utils"
import { InlineStatStrip } from "@/components/ui/InlineStatStrip"

export const revalidate = 60

export default async function FacilitiesHubPage() {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') redirect('/dashboard')

  const [homeCount, recentHomes, inventoryCount, donorsCount] = await Promise.all([
    prisma.geriatricHome.count(),
    prisma.geriatricHome.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { email: true, status: true } } }
    }),
    prisma.inventoryItem.count(),
    prisma.donor.count()
  ])

  return (
    <div className="space-y-6">
      <InlineStatStrip
        className="grid grid-cols-1 md:grid-cols-3 gap-2"
        items={[
          { value: homeCount, label: "Facilities", href: "/admin/homes?tab=homes" },
          { value: inventoryCount, label: "Inventory Items", href: "/admin/inventory", tone: "success" },
          { value: donorsCount, label: "Donors", href: "/admin/donors", tone: "info" },
        ]}
      />

      <div className={cn(STYLES.card, "p-6")}>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Facilities</h2>
        {recentHomes.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No facilities yet. Add your first home to get started.</p>
        ) : (
          <div className="space-y-3">
            {recentHomes.slice(0, 5).map((home) => (
              <div key={home.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{home.name}</p>
                  <p className="text-sm text-gray-500">{home.address}</p>
                </div>
                <Link 
                  href={`/admin/homes/${home.id}`}
                  className="text-sm text-primary-600 hover:underline"
                >
                  View Details
                </Link>
              </div>
            ))}
          </div>
        )}
        {homeCount > 5 && (
          <Link href="/admin/homes?tab=homes" className="block text-center text-sm text-primary-600 mt-4 hover:underline">
            View all {homeCount} facilities →
          </Link>
        )}
      </div>
    </div>
  )
}
