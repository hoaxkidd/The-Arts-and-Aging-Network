'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

// Get all testimonials (filtered)
export async function getTestimonials(filters?: {
  status?: string
  featured?: boolean
  eventId?: string
}) {
  try {
    const where: any = {}

    if (filters?.status && filters.status !== 'ALL') {
      where.status = filters.status
    }

    if (filters?.featured !== undefined) {
      where.featured = filters.featured
    }

    if (filters?.eventId) {
      where.eventId = filters.eventId
    }

    // Non-admins only see approved testimonials
    const session = await auth()
    if (session?.user?.role !== 'ADMIN') {
      where.status = 'APPROVED'
    }

    const testimonials = await prisma.testimonial.findMany({
      where,
      include: {
        event: {
          select: {
            id: true,
            title: true,
            startDateTime: true
          }
        },
        collector: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: [
        { featured: 'desc' },
        { displayOrder: 'asc' },
        { collectedAt: 'desc' }
      ]
    })

    return { success: true, data: testimonials }
  } catch (error) {
    console.error("Failed to fetch testimonials:", error)
    return { error: "Failed to load testimonials" }
  }
}

// Create testimonial
export async function createTestimonial(data: {
  authorName: string
  authorRole?: string
  authorImage?: string
  organizationName?: string
  content: string
  rating?: number
  eventId?: string
  programType?: string
  photoUrl?: string
  videoUrl?: string
}) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Unauthorized" }
  }

  if (!data.authorName?.trim() || !data.content?.trim()) {
    return { error: "Author name and content are required" }
  }

  try {
    const testimonial = await prisma.testimonial.create({
      data: {
        authorName: data.authorName,
        authorRole: data.authorRole || null,
        authorImage: data.authorImage || null,
        organizationName: data.organizationName || null,
        content: data.content,
        rating: data.rating || null,
        eventId: data.eventId || null,
        programType: data.programType || null,
        photoUrl: data.photoUrl || null,
        videoUrl: data.videoUrl || null,
        collectedBy: session.user.id,
        status: session.user.role === 'ADMIN' ? 'APPROVED' : 'PENDING'
      }
    })

    await prisma.auditLog.create({
      data: {
        action: 'TESTIMONIAL_CREATED',
        details: JSON.stringify({ testimonialId: testimonial.id, author: data.authorName }),
        userId: session.user.id
      }
    })

    revalidatePath('/admin/testimonials')
    revalidatePath('/testimonials')

    return { success: true, data: testimonial }
  } catch (error) {
    console.error("Failed to create testimonial:", error)
    return { error: "Failed to create testimonial" }
  }
}

// Update testimonial
export async function updateTestimonial(
  id: string,
  data: {
    authorName?: string
    authorRole?: string
    content?: string
    rating?: number
    status?: string
    featured?: boolean
    displayOrder?: number
  }
) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    return { error: "Unauthorized" }
  }

  try {
    const updates: any = {}
    if (data.authorName !== undefined) updates.authorName = data.authorName
    if (data.authorRole !== undefined) updates.authorRole = data.authorRole
    if (data.content !== undefined) updates.content = data.content
    if (data.rating !== undefined) updates.rating = data.rating
    if (data.status !== undefined) {
      updates.status = data.status
      updates.reviewedBy = session.user.id
      updates.reviewedAt = new Date()
    }
    if (data.featured !== undefined) updates.featured = data.featured
    if (data.displayOrder !== undefined) updates.displayOrder = data.displayOrder

    const testimonial = await prisma.testimonial.update({
      where: { id },
      data: updates
    })

    revalidatePath('/admin/testimonials')
    revalidatePath('/testimonials')

    return { success: true, data: testimonial }
  } catch (error) {
    console.error("Failed to update testimonial:", error)
    return { error: "Failed to update testimonial" }
  }
}

// Delete testimonial
export async function deleteTestimonial(id: string) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    return { error: "Unauthorized" }
  }

  try {
    await prisma.testimonial.delete({ where: { id } })

    await prisma.auditLog.create({
      data: {
        action: 'TESTIMONIAL_DELETED',
        details: JSON.stringify({ testimonialId: id }),
        userId: session.user.id
      }
    })

    revalidatePath('/admin/testimonials')
    revalidatePath('/testimonials')

    return { success: true }
  } catch (error) {
    console.error("Failed to delete testimonial:", error)
    return { error: "Failed to delete testimonial" }
  }
}
