import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { InventoryHubClient } from "./InventoryHubClient"
import { Package } from "lucide-react"

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
      <header className="flex-shrink-0 pb-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-primary-100 text-primary-600 flex items-center justify-center">
            <Package className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-gray-900">Inventory</h1>
            <p className="text-xs text-gray-500">
              Add and remove items, update quantities, contact distributors
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-auto pt-4">
        <InventoryHubClient items={items} />
      </div>
    </div>
  )
}
