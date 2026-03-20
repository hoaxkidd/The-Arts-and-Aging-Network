'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

export type SearchFilters = {
  type?: 'DIRECT' | 'GROUP' | 'ALL'
  groupId?: string
  dateFrom?: string
  dateTo?: string
  hasAttachments?: boolean
}

export async function searchMessages(query: string, filters?: SearchFilters) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Unauthorized" }
  }

  if (!query?.trim()) {
    return { error: "Search query is required" }
  }

  try {
    const searchTerm = query.trim()
    const results: Array<{
      id: string
      type: 'DIRECT' | 'GROUP'
      content: string
      createdAt: Date
      sender: {
        name: string | null
        preferredName: string | null
      }
      conversationName?: string
      groupName?: string
      hasAttachments: boolean
    }> = []

    // Search direct messages
    if (!filters?.type || filters.type === 'DIRECT' || filters.type === 'ALL') {
      const dmWhere: any = {
        OR: [
          { senderId: session.user.id },
          { recipientId: session.user.id }
        ],
        content: { contains: searchTerm, mode: 'insensitive' }
      }

      if (filters?.dateFrom) {
        dmWhere.createdAt = { gte: new Date(filters.dateFrom) }
      }
      if (filters?.dateTo) {
        dmWhere.createdAt = { ...dmWhere.createdAt, lte: new Date(filters.dateTo) }
      }
      if (filters?.hasAttachments) {
        dmWhere.attachments = { not: null }
      }

      const directMessages = await prisma.directMessage.findMany({
        where: dmWhere,
        include: {
          sender: {
            select: { name: true, preferredName: true }
          },
          recipient: {
            select: { name: true, preferredName: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 50
      })

      for (const msg of directMessages) {
        const otherUser = msg.senderId === session.user.id ? msg.recipient : msg.sender
        results.push({
          id: msg.id,
          type: 'DIRECT',
          content: msg.content,
          createdAt: msg.createdAt,
          sender: {
            name: msg.sender.name,
            preferredName: msg.sender.preferredName
          },
          conversationName: otherUser.preferredName || otherUser.name || 'Unknown',
          hasAttachments: !!msg.attachments
        })
      }
    }

    // Search group messages
    if (!filters?.type || filters.type === 'GROUP' || filters.type === 'ALL') {
      // First get groups user is member of
      const memberships = await prisma.groupMember.findMany({
        where: {
          userId: session.user.id,
          isActive: true
        },
        select: { groupId: true }
      })

      const groupIds = memberships.map(m => m.groupId)

      // If groupId filter is specified, use only that group
      const targetGroupIds = filters?.groupId ? [filters.groupId] : groupIds

      if (targetGroupIds.length > 0) {
        const gmWhere: any = {
          groupId: { in: targetGroupIds },
          content: { contains: searchTerm, mode: 'insensitive' }
        }

        if (filters?.dateFrom) {
          gmWhere.createdAt = { ...gmWhere.createdAt, gte: new Date(filters.dateFrom) }
        }
        if (filters?.dateTo) {
          gmWhere.createdAt = { ...gmWhere.createdAt, lte: new Date(filters.dateTo) }
        }
        if (filters?.hasAttachments) {
          gmWhere.attachments = { not: null }
        }

        const groupMessages = await prisma.groupMessage.findMany({
          where: gmWhere,
          include: {
            sender: {
              select: { name: true, preferredName: true }
            },
            group: {
              select: { name: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 50
        })

        for (const msg of groupMessages) {
          results.push({
            id: msg.id,
            type: 'GROUP',
            content: msg.content,
            createdAt: msg.createdAt,
            sender: {
              name: msg.sender.name,
              preferredName: msg.sender.preferredName
            },
            groupName: msg.group.name,
            hasAttachments: !!msg.attachments
          })
        }
      }
    }

    // Sort by date descending
    results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    // Highlight matching text
    const highlightedResults = results.map(result => ({
      ...result,
      content: result.content.replace(
        new RegExp(`(${searchTerm})`, 'gi'),
        '<mark class="bg-yellow-200">$1</mark>'
      )
    }))

    return { success: true, data: highlightedResults }
  } catch (error) {
    console.error("Search error:", error)
    return { error: "Failed to search messages" }
  }
}
