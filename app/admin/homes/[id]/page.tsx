import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { notFound, redirect } from "next/navigation"
import { HomeDetailsClient } from "./HomeDetailsClient"

const db = prisma as any

export default async function HomeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') redirect('/login')

  const { id } = await params

  const home = await db.geriatricHome.findUnique({
    where: { id },
    include: {
      user: true,
      events: {
        orderBy: { startDateTime: 'desc' },
        take: 10,
        include: {
          _count: { select: { attendances: true } }
        }
      },
      _count: { select: { events: true } }
    }
  })

  if (!home) return notFound()

  // Parse additional contacts
  const additionalContacts = home.additionalContacts
    ? JSON.parse(home.additionalContacts)
    : []

  return (
    <HomeDetailsClient
      home={{
        ...home,
        additionalContacts,
        createdAt: home.createdAt.toISOString(),
        updatedAt: home.updatedAt.toISOString(),
        accessibilityInfo: (home as any).accessibilityInfo ?? null,
        accommodations: (home as any).accommodations ?? null,
        feedbackFormUrl: (home as any).feedbackFormUrl ?? null,
        isPartner: (home as any).isPartner ?? false,
        newsletterSub: (home as any).newsletterSub ?? false,
        user: {
          ...home.user,
          createdAt: home.user.createdAt.toISOString()
        },
        events: home.events.map((e: any) => ({
          ...e,
          startDateTime: e.startDateTime.toISOString(),
          endDateTime: e.endDateTime?.toISOString(),
          _count: { attendance: (e as any)._count?.attendances ?? 0 }
        }))
      }}
    />
  )
}
