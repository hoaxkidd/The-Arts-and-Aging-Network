'use server'

import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

export async function createMessageTemplate(data: {
  title: string
  content: string
  contentHtml?: string
  category?: string
  isGlobal?: boolean
}) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Unauthorized" }
  }

  // Only admins can create global templates
  if (data.isGlobal && session.user.role !== 'ADMIN') {
    return { error: "Only admins can create global templates" }
  }

  try {
    const template = await prisma.messageTemplate.create({
      data: {
        title: data.title,
        content: data.content,
        contentHtml: data.contentHtml || null,
        category: data.category || null,
        isGlobal: data.isGlobal || false,
        createdBy: session.user.id
      }
    })

    revalidatePath('/staff/inbox')
    revalidatePath('/admin/messaging/templates')

    return { success: true, data: template }
  } catch (error) {
    logger.serverAction("Failed to create template:", error)
    return { error: "Failed to create template" }
  }
}

export async function updateMessageTemplate(id: string, data: {
  title?: string
  content?: string
  contentHtml?: string
  category?: string
}) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Unauthorized" }
  }

  try {
    // Check ownership or admin
    const template = await prisma.messageTemplate.findUnique({
      where: { id }
    })

    if (!template) {
      return { error: "Template not found" }
    }

    if (template.createdBy !== session.user.id && session.user.role !== 'ADMIN') {
      return { error: "Unauthorized" }
    }

    const updated = await prisma.messageTemplate.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.content && { content: data.content }),
        ...(data.contentHtml !== undefined && { contentHtml: data.contentHtml }),
        ...(data.category !== undefined && { category: data.category })
      }
    })

    revalidatePath('/staff/inbox')
    revalidatePath('/admin/messaging/templates')

    return { success: true, data: updated }
  } catch (error) {
    logger.serverAction("Failed to update template:", error)
    return { error: "Failed to update template" }
  }
}

export async function deleteMessageTemplate(id: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Unauthorized" }
  }

  try {
    const template = await prisma.messageTemplate.findUnique({
      where: { id }
    })

    if (!template) {
      return { error: "Template not found" }
    }

    if (template.createdBy !== session.user.id && session.user.role !== 'ADMIN') {
      return { error: "Unauthorized" }
    }

    await prisma.messageTemplate.delete({
      where: { id }
    })

    revalidatePath('/staff/inbox')
    revalidatePath('/admin/messaging/templates')

    return { success: true }
  } catch (error) {
    logger.serverAction("Failed to delete template:", error)
    return { error: "Failed to delete template" }
  }
}

export async function getMessageTemplates() {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Unauthorized" }
  }

  try {
    const templates = await prisma.messageTemplate.findMany({
      where: {
        OR: [
          { isGlobal: true },
          { createdBy: session.user.id }
        ]
      },
      orderBy: [
        { isGlobal: 'desc' },
        { title: 'asc' }
      ]
    })

    return { success: true, data: templates }
  } catch (error) {
    logger.serverAction("Failed to get templates:", error)
    return { error: "Failed to get templates" }
  }
}

export async function useMessageTemplate(id: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Unauthorized" }
  }

  try {
    const template = await prisma.messageTemplate.findUnique({
      where: { id }
    })

    if (!template) {
      return { error: "Template not found" }
    }

    await prisma.messageTemplate.update({
      where: { id },
      data: { usageCount: { increment: 1 } }
    })

    return { 
      success: true, 
      data: {
        content: template.content,
        contentHtml: template.contentHtml
      } 
    }
  } catch (error) {
    logger.serverAction("Failed to use template:", error)
    return { error: "Failed to use template" }
  }
}
