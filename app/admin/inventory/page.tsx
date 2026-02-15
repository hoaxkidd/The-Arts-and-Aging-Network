import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { Package, AlertTriangle, TrendingDown } from "lucide-react"
import { cn } from "@/lib/utils"

export default async function InventoryPage() {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN' && session?.user?.role !== 'PAYROLL') redirect('/dashboard')

  const items = await prisma.inventoryItem.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' }
  })

  const lowStockItems = items.filter(item => item.quantity <= item.minQuantity)
  const totalValue = items.reduce((sum, item) => sum + (item.cost || 0) * item.quantity, 0)

  const categories = [...new Set(items.map(item => item.category))]

  return (
    <div className="h-full flex flex-col p-6">
      <div className="flex-shrink-0 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
        <p className="text-sm text-gray-500">Track merchandise, supplies, and equipment</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase">Total Items</p>
          <p className="text-2xl font-bold text-gray-900">{items.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-red-200 p-4">
          <p className="text-xs text-red-600 uppercase flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Low Stock
          </p>
          <p className="text-2xl font-bold text-red-600">{lowStockItems.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-blue-200 p-4">
          <p className="text-xs text-blue-600 uppercase">Categories</p>
          <p className="text-2xl font-bold text-blue-600">{categories.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-green-200 p-4">
          <p className="text-xs text-green-600 uppercase">Total Value</p>
          <p className="text-2xl font-bold text-green-600">${totalValue.toFixed(2)}</p>
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <div className="flex-shrink-0 mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-red-900 mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            {lowStockItems.length} item{lowStockItems.length !== 1 ? 's' : ''} need restocking
          </h3>
          <div className="space-y-1">
            {lowStockItems.slice(0, 5).map(item => (
              <p key={item.id} className="text-xs text-red-700">
                • {item.name}: {item.quantity} {item.unit} (min: {item.minQuantity})
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Items by Category */}
      <div className="flex-1 min-h-0 overflow-auto">
        {categories.map(category => {
          const categoryItems = items.filter(item => item.category === category)
          return (
            <div key={category} className="mb-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">{category}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {categoryItems.map(item => (
                  <div key={item.id} className="bg-white rounded-lg border border-gray-200 p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-start gap-2 flex-1">
                        <Package className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-gray-900 truncate">{item.name}</h4>
                          {item.sku && (
                            <p className="text-xs text-gray-500">SKU: {item.sku}</p>
                          )}
                        </div>
                      </div>
                      {item.quantity <= item.minQuantity && (
                        <TrendingDown className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className={cn(
                        "font-medium",
                        item.quantity <= item.minQuantity ? "text-red-600" : "text-gray-900"
                      )}>
                        {item.quantity} {item.unit}
                      </span>
                      {item.price && (
                        <span className="text-green-600 font-medium">${item.price.toFixed(2)}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
