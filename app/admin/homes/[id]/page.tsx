import { prisma } from "@/lib/prisma"
import { safeJsonParse } from "@/lib/utils"
import { auth } from "@/auth"
import { notFound, redirect } from "next/navigation"
import { HomeDetailsClient } from "./HomeDetailsClient"
import type { Personnel } from "@/types"

export default async function HomeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') redirect('/login')

  const { id } = await params

  const home = await prisma.geriatricHome.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      address: true,
      latitude: true,
      longitude: true,
      residentCount: true,
      maxCapacity: true,
      type: true,
      region: true,
      specialNeeds: true,
      emergencyProtocol: true,
      triggerWarnings: true,
      accommodations: true,
      photoPermissions: true,
      accessibilityInfo: true,
      feedbackFormUrl: true,
      isPartner: true,
      newsletterSub: true,
      contactName: true,
      contactEmail: true,
      contactPhone: true,
      contactPosition: true,
      additionalContacts: true,
      createdAt: true,
      updatedAt: true,
      user: {
        select: {
          id: true,
          userCode: true,
          name: true,
          email: true,
          status: true,
          createdAt: true,
        },
      },
      events: {
        orderBy: { startDateTime: 'desc' },
        take: 10,
        select: {
          id: true,
          title: true,
          startDateTime: true,
          status: true,
          _count: { select: { attendances: true } }
        }
      },
      _count: { select: { events: true } }
    }
  })

  if (!home) return notFound()

  const normalizedHome = {
    ...home,
    user: {
      ...home.user,
      email: home.user.email ?? '',
    },
    additionalContacts: safeJsonParse<Personnel[]>(home.additionalContacts, [])
  }

  return (
    <HomeDetailsClient home={normalizedHome} />
  )
}
