'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Package,
  Search,
  Plus,
  Trash2,
  Mail,
  Phone,
  Building2,
  Loader2,
  AlertTriangle,
  Pencil,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  createInventoryItem,
  createInventoryTransaction,
  deactivateInventoryItem,
  updateInventoryItem,
} from '@/app/actions/inventory'

type Item = {
  id: string
  name: string
  description: string | null
  category: string
  sku: string | null
  quantity: number
  minQuantity: number
  maxQuantity: number | null
  unit: string
  cost: number | null
  price: number | null
  supplier: string | null
  supplierEmail: string | null
  supplierPhone: string | null
  isActive: boolean
}

type Props = {
  items: Item[]
}

export function InventoryHubClient({ items: initialItems }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [distributorItem, setDistributorItem] = useState<Item | null>(null)
  const [adjustingId, setAdjustingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const categories = ['ALL', ...Array.from(new Set(initialItems.map((i) => i.category)))]

  const filtered = initialItems.filter((item) => {
    const q = search.toLowerCase()
    const matchSearch =
      !q ||
      item.name.toLowerCase().includes(q) ||
      (item.sku && item.sku.toLowerCase().includes(q)) ||
      (item.supplier && item.supplier.toLowerCase().includes(q)) ||
      item.category.toLowerCase().includes(q)
    const matchCategory = categoryFilter === 'ALL' || item.category === categoryFilter
    return matchSearch && matchCategory
  })

  const lowStockCount = initialItems.filter((i) => i.quantity <= i.minQuantity).length
  const totalValue = initialItems.reduce((sum, i) => sum + (i.cost || 0) * i.quantity, 0)

  const handleDeactivate = (id: string) => {
    if (!confirm('Remove this item from active inventory? You can re-add it later.')) return
    startTransition(async () => {
      const result = await deactivateInventoryItem(id)
      if (result?.error) alert(result.error)
      else router.refresh()
    })
  }

  const handleAdjustQuantity = (itemId: string, type: 'IN' | 'OUT', amount: number) => {
    if (amount <= 0) return
    setAdjustingId(itemId)
    startTransition(async () => {
      const result = await createInventoryTransaction({
        itemId,
        type,
        quantity: amount,
        reason: type === 'IN' ? 'Restock' : 'Used / sold',
      })
      setAdjustingId(null)
      if (result?.error) alert(result.error)
      else router.refresh()
    })
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 pb-4 border-b border-gray-200">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Inventory</h1>
            <p className="text-xs text-gray-500">
              Add and remove items, update quantities, view distributor details
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700"
          >
            <Plus className="w-4 h-4" /> Add item
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex-shrink-0 flex gap-4 py-3 text-sm">
        <span className="text-gray-500">
          <strong className="text-gray-900">{initialItems.length}</strong> items
        </span>
        {lowStockCount > 0 && (
          <span className="text-amber-600 flex items-center gap-1">
            <AlertTriangle className="w-4 h-4" />
            <strong>{lowStockCount}</strong> low stock
          </span>
        )}
        <span className="text-gray-500">
          Total value <strong className="text-gray-900">${totalValue.toFixed(2)}</strong>
        </span>
      </div>

      {/* Search and filter */}
      <div className="flex-shrink-0 flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, SKU, category, or distributor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-primary-500"
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat === 'ALL' ? 'All categories' : cat}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 border border-gray-200 rounded-lg overflow-hidden">
        <div className="table-scroll-wrapper h-full max-h-[calc(100vh-360px)]">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Item
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                Quantity
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                Unit
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                Min
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                Max
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
                Cost (per unit)
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
                Price (per unit)
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
                Total value
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                Distributor
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-4 py-12 text-center text-sm text-gray-500">
                  {initialItems.length === 0
                    ? 'No inventory items yet. Click “Add item” to create one.'
                    : 'No items match your search.'}
                </td>
              </tr>
            ) : (
              filtered.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{item.name}</p>
                        {item.sku && (
                          <p className="text-xs text-gray-500">SKU: {item.sku}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.category}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'text-sm font-medium',
                          item.quantity <= item.minQuantity ? 'text-red-600' : 'text-gray-900'
                        )}
                      >
                        {item.quantity} {item.unit}
                      </span>
                      {adjustingId === item.id && isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin text-primary-500" />
                      ) : (
                        <span className="flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => handleAdjustQuantity(item.id, 'IN', 1)}
                            disabled={isPending}
                            className="p-1 rounded bg-green-100 text-green-700 hover:bg-green-200 text-xs font-bold"
                          >
                            +
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAdjustQuantity(item.id, 'OUT', 1)}
                            disabled={isPending || item.quantity <= 0}
                            className="p-1 rounded bg-red-100 text-red-700 hover:bg-red-200 text-xs font-bold disabled:opacity-50"
                          >
                            −
                          </button>
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.unit}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.minQuantity}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.maxQuantity ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 text-right">
                    {item.cost != null ? `$${item.cost.toFixed(2)}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-right">
                    {item.price != null ? (
                      <span className="text-green-600 font-medium">${item.price.toFixed(2)}</span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                    {item.cost != null
                      ? `$${((item.cost || 0) * item.quantity).toFixed(2)}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {item.supplier || item.supplierEmail || item.supplierPhone ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setDistributorItem(item)}
                          className="text-xs text-primary-600 hover:underline flex items-center gap-1"
                        >
                          <Building2 className="w-3.5 h-3.5" />
                          {item.supplier || 'View details'}
                        </button>
                        {item.supplierEmail && (
                          <a
                            href={`mailto:${item.supplierEmail}`}
                            className="p-1.5 rounded text-gray-500 hover:bg-gray-100 hover:text-primary-600"
                            title="Email distributor"
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {item.supplierPhone && (
                          <a
                            href={`tel:${item.supplierPhone.replace(/\D/g, '')}`}
                            className="p-1.5 rounded text-gray-500 hover:bg-gray-100 hover:text-primary-600"
                            title="Call distributor"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingItem(item)}
                        disabled={isPending}
                        className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg disabled:opacity-50"
                        title="Edit item"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeactivate(item.id)}
                        disabled={isPending}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                        title="Remove from inventory"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>

      {showAddModal && (
        <AddItemModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false)
            router.refresh()
          }}
        />
      )}

      {editingItem && (
        <EditItemModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSuccess={() => {
            setEditingItem(null)
            router.refresh()
          }}
        />
      )}

      {distributorItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDistributorItem(null)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Distributor details</h3>
            <p className="text-sm text-gray-700 font-medium">{distributorItem.supplier || '—'}</p>
            {distributorItem.supplierEmail && (
              <a
                href={`mailto:${distributorItem.supplierEmail}`}
                className="text-sm text-primary-600 hover:underline block mt-2 flex items-center gap-2"
              >
                <Mail className="w-4 h-4" /> {distributorItem.supplierEmail}
              </a>
            )}
            {distributorItem.supplierPhone && (
              <a
                href={`tel:${distributorItem.supplierPhone.replace(/\D/g, '')}`}
                className="text-sm text-primary-600 hover:underline block mt-2 flex items-center gap-2"
              >
                <Phone className="w-4 h-4" /> {distributorItem.supplierPhone}
              </a>
            )}
            <p className="text-xs text-gray-500 mt-3">Item: {distributorItem.name}</p>
            <button
              type="button"
              onClick={() => setDistributorItem(null)}
              className="mt-4 w-full py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function EditItemModal({
  item,
  onClose,
  onSuccess,
}: {
  item: Item
  onClose: () => void
  onSuccess: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(item.quantity)
  const [cost, setCost] = useState<string>(item.cost != null ? String(item.cost) : '')
  const [price, setPrice] = useState<string>(item.price != null ? String(item.price) : '')

  const costNum = cost === '' ? null : parseFloat(cost)
  const totalValue = costNum != null && !Number.isNaN(costNum) ? costNum * quantity : null

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const form = e.currentTarget
    const formData = new FormData(form)

    const name = (formData.get('name') as string)?.trim()
    const category = (formData.get('category') as string)?.trim() || 'General'
    const sku = (formData.get('sku') as string)?.trim() || null
    const qty = parseInt((formData.get('quantity') as string) || '0', 10)
    const minQuantity = parseInt((formData.get('minQuantity') as string) || '0', 10)
    const maxQuantityRaw = (formData.get('maxQuantity') as string)?.trim()
    const maxQuantity = maxQuantityRaw ? parseInt(maxQuantityRaw, 10) : null
    const unit = (formData.get('unit') as string)?.trim() || 'pcs'
    const costRaw = (formData.get('cost') as string)?.trim()
    const costVal = costRaw ? parseFloat(costRaw) : null
    const priceRaw = (formData.get('price') as string)?.trim()
    const priceVal = priceRaw ? parseFloat(priceRaw) : null
    const supplier = (formData.get('supplier') as string)?.trim() || null
    const supplierEmail = (formData.get('supplierEmail') as string)?.trim() || null
    const supplierPhone = (formData.get('supplierPhone') as string)?.trim() || null
    const description = (formData.get('description') as string)?.trim() || null

    if (!name) {
      setError('Name is required')
      return
    }

    startTransition(async () => {
      const result = await updateInventoryItem(item.id, {
        name,
        description,
        category,
        sku,
        quantity: qty,
        minQuantity,
        maxQuantity,
        unit,
        cost: costVal,
        price: priceVal,
        supplier,
        supplierEmail,
        supplierPhone,
      })
      if (result?.error) {
        setError(result.error)
        return
      }
      onSuccess()
    })
  }

  const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Edit item</h2>
          <p className="text-sm text-gray-500">{item.name}</p>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input name="name" required defaultValue={item.name} className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <input name="category" defaultValue={item.category} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
              <input name="sku" defaultValue={item.sku ?? ''} className={inputClass} placeholder="Optional" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea name="description" rows={2} defaultValue={item.description ?? ''} className={inputClass} placeholder="Optional" />
          </div>
          <div className="border-t border-gray-200 pt-4">
            <p className="text-sm font-semibold text-gray-800 mb-2">Quantity & stock levels</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                <input
                  name="quantity"
                  type="number"
                  min={0}
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 0)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                <input name="unit" defaultValue={item.unit} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Min quantity</label>
                <input name="minQuantity" type="number" min={0} defaultValue={item.minQuantity} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max quantity</label>
                <input name="maxQuantity" type="number" min={0} defaultValue={item.maxQuantity ?? ''} className={inputClass} placeholder="Optional" />
              </div>
            </div>
          </div>
          <div className="border-t border-gray-200 pt-4">
            <p className="text-sm font-semibold text-gray-800 mb-2">Pricing (per unit)</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cost (what you pay)</label>
                <input
                  name="cost"
                  type="number"
                  step="0.01"
                  min={0}
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  className={inputClass}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price (sell price)</label>
                <input
                  name="price"
                  type="number"
                  step="0.01"
                  min={0}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className={inputClass}
                  placeholder="0.00"
                />
              </div>
            </div>
            {totalValue != null && (
              <p className="mt-2 text-sm text-gray-600">
                Total value (cost × quantity): <strong className="text-gray-900">${totalValue.toFixed(2)}</strong>
              </p>
            )}
          </div>
          <div className="border-t border-gray-200 pt-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Distributor (optional)</p>
            <div className="space-y-3">
              <input name="supplier" defaultValue={item.supplier ?? ''} className={inputClass} placeholder="Company or contact name" />
              <input name="supplierEmail" type="email" defaultValue={item.supplierEmail ?? ''} className={inputClass} placeholder="Email" />
              <input name="supplierPhone" type="tel" defaultValue={item.supplierPhone ?? ''} className={inputClass} placeholder="Phone" />
            </div>
          </div>
          <div className="flex-shrink-0 pt-4 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Save changes
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const COST_FROM_PRICE_RATIO = 0.7 // When user enters price, suggest cost = price × 70%

function AddItemModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void
  onSuccess: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(0)
  const [cost, setCost] = useState<string>('')
  const [price, setPrice] = useState<string>('')

  const costNum = cost === '' ? null : parseFloat(cost)
  const totalValue = costNum != null && !Number.isNaN(costNum) ? costNum * quantity : null

  const handlePriceChange = (value: string) => {
    setPrice(value)
    const p = value === '' ? null : parseFloat(value)
    if (p != null && !Number.isNaN(p) && cost === '') {
      setCost((p * COST_FROM_PRICE_RATIO).toFixed(2))
    }
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const form = e.currentTarget
    const formData = new FormData(form)

    const name = (formData.get('name') as string)?.trim()
    const category = (formData.get('category') as string)?.trim() || 'General'
    const sku = (formData.get('sku') as string)?.trim() || undefined
    const qty = parseInt((formData.get('quantity') as string) || '0', 10)
    const minQuantity = parseInt((formData.get('minQuantity') as string) || '0', 10)
    const maxQuantityRaw = (formData.get('maxQuantity') as string)?.trim()
    const maxQuantity = maxQuantityRaw ? parseInt(maxQuantityRaw, 10) : undefined
    const unit = (formData.get('unit') as string)?.trim() || 'pcs'
    const costRaw = (formData.get('cost') as string)?.trim()
    const costVal = costRaw ? parseFloat(costRaw) : undefined
    const priceRaw = (formData.get('price') as string)?.trim()
    const priceVal = priceRaw ? parseFloat(priceRaw) : undefined
    const supplier = (formData.get('supplier') as string)?.trim() || undefined
    const supplierEmail = (formData.get('supplierEmail') as string)?.trim() || undefined
    const supplierPhone = (formData.get('supplierPhone') as string)?.trim() || undefined
    const description = (formData.get('description') as string)?.trim() || undefined

    if (!name) {
      setError('Name is required')
      return
    }

    startTransition(async () => {
      const result = await createInventoryItem({
        name,
        description,
        category,
        sku,
        quantity: qty,
        minQuantity,
        maxQuantity,
        unit,
        cost: costVal,
        price: priceVal,
        supplier,
        supplierEmail,
        supplierPhone,
      })
      if (result?.error) {
        setError(result.error)
        return
      }
      onSuccess()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Add inventory item</h2>
          <p className="text-sm text-gray-500">Create a new item and optional distributor details</p>
        </div>
        <form id="add-item-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              name="name"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
              placeholder="e.g. Art supplies box"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <input
                name="category"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                placeholder="e.g. Supplies"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
              <input
                name="sku"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                placeholder="Optional"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              name="description"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
              placeholder="Optional"
            />
          </div>

          <div className="border-t border-gray-200 pt-4">
            <p className="text-sm font-semibold text-gray-800 mb-2">Quantity & stock levels</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                <input
                  name="quantity"
                  type="number"
                  min={0}
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                <input
                  name="unit"
                  defaultValue="pcs"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                  placeholder="pcs, boxes, etc."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Min quantity</label>
                <input
                  name="minQuantity"
                  type="number"
                  min={0}
                  defaultValue={0}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max quantity</label>
                <input
                  name="maxQuantity"
                  type="number"
                  min={0}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                  placeholder="Optional"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <p className="text-sm font-semibold text-gray-800 mb-2">Pricing (per unit)</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cost (what you pay)</label>
                <input
                  name="cost"
                  type="number"
                  step="0.01"
                  min={0}
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price (sell price)</label>
                <input
                  name="price"
                  type="number"
                  step="0.01"
                  min={0}
                  value={price}
                  onChange={(e) => handlePriceChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                  placeholder="0.00"
                />
              </div>
            </div>
            {totalValue != null && (
              <p className="mt-2 text-sm text-gray-600">
                Total value (cost × quantity): <strong className="text-gray-900">${totalValue.toFixed(2)}</strong>
              </p>
            )}
          </div>

          <div className="border-t border-gray-200 pt-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Distributor (optional)</p>
            <div className="space-y-3">
              <input
                name="supplier"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                placeholder="Company or contact name"
              />
              <input
                name="supplierEmail"
                type="email"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                placeholder="Email"
              />
              <input
                name="supplierPhone"
                type="tel"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                placeholder="Phone"
              />
            </div>
          </div>
          <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Add item
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
