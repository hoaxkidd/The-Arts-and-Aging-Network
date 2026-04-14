'use server'

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { logger } from '@/lib/logger'
import {
  BOOKINGS_ACCESS_POLICY_TEMPLATE_TYPE,
  DEFAULT_BOOKINGS_ACCESS_POLICY_CONFIG,
  normalizeBookingsAllowedRoles,
  parseBookingsAccessPolicyConfig,
} from '@/lib/bookings-access-policy'

async function readBookingsAccessPolicyConfigFromDb() {
  const template = await prisma.emailTemplate.findUnique({
    where: { type: BOOKINGS_ACCESS_POLICY_TEMPLATE_TYPE },
    select: { content: true },
  })

  return parseBookingsAccessPolicyConfig(template?.content)
}

export async function getBookingsAccessPolicyConfig() {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    return { error: 'Unauthorized' }
  }

  try {
    const config = await readBookingsAccessPolicyConfigFromDb()
    return { success: true, data: config }
  } catch (error) {
    logger.error('Get bookings access policy config error:', error)
    return { error: 'Failed to load bookings access policy' }
  }
}

export async function updateBookingsAccessAllowedRoles(roles: string[]) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN' || !session.user.id) {
    return { error: 'Unauthorized' }
  }

  const normalizedRoles = normalizeBookingsAllowedRoles(roles)

  try {
    const nextConfig = {
      ...DEFAULT_BOOKINGS_ACCESS_POLICY_CONFIG,
      allowedRoles: normalizedRoles,
    }

    await prisma.$transaction(async (tx) => {
      await tx.emailTemplate.upsert({
        where: { type: BOOKINGS_ACCESS_POLICY_TEMPLATE_TYPE },
        update: {
          name: 'Bookings Access Policy Config',
          subject: 'internal-config',
          content: JSON.stringify(nextConfig),
          isActive: true,
        },
        create: {
          type: BOOKINGS_ACCESS_POLICY_TEMPLATE_TYPE,
          name: 'Bookings Access Policy Config',
          subject: 'internal-config',
          content: JSON.stringify(nextConfig),
          isActive: true,
        },
      })

      await tx.auditLog.create({
        data: {
          action: 'BOOKINGS_ACCESS_POLICY_UPDATED',
          userId: session.user.id,
          details: JSON.stringify({ allowedRoles: normalizedRoles }),
        },
      })
    })

    revalidatePath('/admin/settings')
    revalidatePath('/bookings')
    revalidatePath('/staff/bookings')
    revalidatePath('/facilitator/bookings')
    revalidatePath('/board/bookings')
    revalidatePath('/partner/bookings')

    return { success: true, data: nextConfig }
  } catch (error) {
    logger.error('Update bookings access policy error:', error)
    return { error: 'Failed to update bookings access policy' }
  }
}
