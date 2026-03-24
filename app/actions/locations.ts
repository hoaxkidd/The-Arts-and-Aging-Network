'use server'

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { logger } from "@/lib/logger"

export async function getLocations() {
  try {
    const locations = await prisma.location.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        address: true,
        type: true,
        latitude: true,
        longitude: true,
        verified: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            events: true
          }
        }
      }
    })
    return { success: true, data: locations }
  } catch (error) {
    logger.serverAction('Failed to fetch locations', error)
    return { success: false, error: 'Failed to fetch locations' }
  }
}

export async function createLocation(data: {
  name: string
  address: string
  latitude?: number
  longitude?: number
  verified?: boolean
}) {
  try {
    if (!data.name?.trim()) {
      return { success: false, error: 'Location name is required' }
    }
    if (!data.address?.trim()) {
      return { success: false, error: 'Location address is required' }
    }

    const location = await prisma.location.create({
      data: {
        name: data.name.trim(),
        address: data.address.trim(),
        type: 'OTHER',
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        verified: data.verified ?? false,
      }
    })

    revalidatePath('/admin/events')
    revalidatePath('/admin/events/new')
    revalidatePath('/admin/events/[id]/edit')
    
    return { success: true, data: location }
  } catch (error) {
    logger.serverAction('Failed to create location', error)
    return { success: false, error: 'Failed to create location' }
  }
}

export async function updateLocation(id: string, data: {
  name: string
  address: string
  latitude?: number
  longitude?: number
  verified?: boolean
}) {
  try {
    if (!id) {
      return { success: false, error: 'Location ID is required' }
    }
    if (!data.name?.trim()) {
      return { success: false, error: 'Location name is required' }
    }
    if (!data.address?.trim()) {
      return { success: false, error: 'Location address is required' }
    }

    const location = await prisma.location.update({
      where: { id },
      data: {
        name: data.name.trim(),
        address: data.address.trim(),
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        verified: data.verified ?? false,
      }
    })

    revalidatePath('/admin/events')
    revalidatePath('/admin/events/new')
    revalidatePath('/admin/events/[id]/edit')
    
    return { success: true, data: location }
  } catch (error) {
    logger.serverAction('Failed to update location', error)
    return { success: false, error: 'Failed to update location' }
  }
}

export async function deleteLocation(id: string) {
  try {
    if (!id) {
      return { success: false, error: 'Location ID is required' }
    }

    // Check if location is used by any events
    const eventsUsingLocation = await prisma.event.count({
      where: { locationId: id }
    })

    if (eventsUsingLocation > 0) {
      return { 
        success: false, 
        error: `Cannot delete location: it is being used by ${eventsUsingLocation} event(s). Please update or remove those events first.` 
      }
    }

    await prisma.location.delete({
      where: { id }
    })

    revalidatePath('/admin/events')
    revalidatePath('/admin/events/new')
    revalidatePath('/admin/events/[id]/edit')
    
    return { success: true }
  } catch (error) {
    logger.serverAction('Failed to delete location', error)
    return { success: false, error: 'Failed to delete location' }
  }
}
