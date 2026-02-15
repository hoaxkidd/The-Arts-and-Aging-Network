'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

// Get inventory items
export async function getInventoryItems(filters?: {
  category?: string
  isActive?: boolean
  lowStock?: boolean
}) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN' && session?.user?.role !== 'PAYROLL') {
    return { error: "Unauthorized" }
  }

  try {
    const where: any = {}

    if (filters?.category && filters.category !== 'ALL') {
      where.category = filters.category
    }

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive
    }

    const items = await prisma.inventoryItem.findMany({
      where,
      include: {
        _count: {
          select: { transactions: true }
        }
      },
      orderBy: { name: 'asc' }
    })

    // Filter low stock if requested
    let filteredItems = items
    if (filters?.lowStock) {
      filteredItems = items.filter(item => item.quantity <= item.minQuantity)
    }

    return { success: true, data: filteredItems }
  } catch (error) {
    console.error("Failed to fetch inventory:", error)
    return { error: "Failed to load inventory" }
  }
}

// Create inventory item
export async function createInventoryItem(data: {
  name: string
  description?: string
  category: string
  sku?: string
  quantity?: number
  minQuantity?: number
  maxQuantity?: number
  unit?: string
  cost?: number
  price?: number
  isForSale?: boolean
  size?: string
  color?: string
  imageUrl?: string
  location?: string
  supplier?: string
  tags?: string[]
}) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    return { error: "Unauthorized" }
  }

  if (!data.name?.trim()) {
    return { error: "Name is required" }
  }

  try {
    const item = await prisma.inventoryItem.create({
      data: {
        name: data.name,
        description: data.description || null,
        category: data.category,
        sku: data.sku || null,
        quantity: data.quantity || 0,
        minQuantity: data.minQuantity || 0,
        maxQuantity: data.maxQuantity || null,
        unit: data.unit || 'pcs',
        cost: data.cost || null,
        price: data.price || null,
        isForSale: data.isForSale || false,
        size: data.size || null,
        color: data.color || null,
        imageUrl: data.imageUrl || null,
        location: data.location || null,
        supplier: data.supplier || null,
        tags: data.tags ? JSON.stringify(data.tags) : null
      }
    })

    // Create initial transaction if quantity > 0
    if (data.quantity && data.quantity > 0) {
      await prisma.inventoryTransaction.create({
        data: {
          itemId: item.id,
          type: 'IN',
          quantity: data.quantity,
          balanceAfter: data.quantity,
          reason: 'Initial stock',
          userId: session.user.id
        }
      })
    }

    await prisma.auditLog.create({
      data: {
        action: 'INVENTORY_ITEM_CREATED',
        details: JSON.stringify({ itemId: item.id, name: data.name }),
        userId: session.user.id
      }
    })

    revalidatePath('/admin/inventory')

    return { success: true, data: item }
  } catch (error) {
    console.error("Failed to create inventory item:", error)
    return { error: "Failed to create item" }
  }
}

// Update inventory item
export async function updateInventoryItem(id: string, data: any) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    return { error: "Unauthorized" }
  }

  try {
    const item = await prisma.inventoryItem.update({
      where: { id },
      data
    })

    revalidatePath('/admin/inventory')
    return { success: true, data: item }
  } catch (error) {
    console.error("Failed to update inventory item:", error)
    return { error: "Failed to update item" }
  }
}

// Create inventory transaction (stock in/out)
export async function createInventoryTransaction(data: {
  itemId: string
  type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'SALE'
  quantity: number
  reason?: string
  eventId?: string
  notes?: string
}) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN' && session?.user?.role !== 'PAYROLL') {
    return { error: "Unauthorized" }
  }

  try {
    const item = await prisma.inventoryItem.findUnique({
      where: { id: data.itemId }
    })

    if (!item) {
      return { error: "Item not found" }
    }

    // Calculate new balance
    let newBalance = item.quantity
    if (data.type === 'IN' || data.type === 'ADJUSTMENT') {
      newBalance += data.quantity
    } else {
      newBalance -= data.quantity
    }

    if (newBalance < 0) {
      return { error: "Insufficient stock" }
    }

    // Create transaction
    const transaction = await prisma.inventoryTransaction.create({
      data: {
        itemId: data.itemId,
        type: data.type,
        quantity: data.quantity,
        balanceAfter: newBalance,
        reason: data.reason || null,
        eventId: data.eventId || null,
        notes: data.notes || null,
        userId: session.user.id
      }
    })

    // Update item quantity
    await prisma.inventoryItem.update({
      where: { id: data.itemId },
      data: { quantity: newBalance }
    })

    revalidatePath('/admin/inventory')

    return { success: true, data: transaction }
  } catch (error) {
    console.error("Failed to create transaction:", error)
    return { error: "Failed to create transaction" }
  }
}
