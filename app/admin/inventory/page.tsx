import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { InventoryHubClient } from "./InventoryHubClient"
import { Package } from "lucide-react"

export const revalidate = 60

export default async function AdminInventoryPage() {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN' && session?.user?.role !== 'PAYROLL') {
    redirect('/dashboard')
  }

  const items = await prisma.inventoryItem.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      description: true,
      category: true,
      sku: true,
      quantity: true,
      minQuantity: true,
      maxQuantity: true,
      unit: true,
      cost: true,
      price: true,
      supplier: true,
      supplierEmail: true,
      supplierPhone: true,
      isActive: true,
    },
  })

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0 overflow-auto pt-4">
        <InventoryHubClient items={items} />
      </div>
    </div>
  )
}
