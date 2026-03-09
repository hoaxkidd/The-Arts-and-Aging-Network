import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { notFound, redirect } from "next/navigation"
import { HomeDetailsClient } from "./HomeDetailsClient"

export default async function HomeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') redirect('/login')

  const { id } = await params

  const home = await prisma.geriatricHome.findUnique({
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

  const additionalContacts = home.additionalContacts
    ? JSON.parse(home.additionalContacts)
    : []

  return (
    <HomeDetailsClient
      home={home as never}
    />
  )
}
