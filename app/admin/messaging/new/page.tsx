import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { CreateGroupForm } from "@/components/messaging/CreateGroupForm"

export default async function NewMessageGroupPage() {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') redirect('/dashboard')

  // Get all staff users for initial members selection
  const staff = await prisma.user.findMany({
    where: {
      role: { in: ['FACILITATOR', 'PAYROLL'] },
      status: 'ACTIVE'
    },
    select: {
      id: true,
      name: true,
      preferredName: true,
      email: true,
      role: true,
      image: true
    },
    orderBy: { name: 'asc' }
  })

  // Get all active events for event-based groups
  const events = await prisma.event.findMany({
    where: {
      status: 'PUBLISHED',
      startDateTime: { gte: new Date() }
    },
    select: {
      id: true,
      title: true,
      startDateTime: true
    },
    orderBy: { startDateTime: 'asc' },
    take: 50
  })

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0 overflow-auto">
        <CreateGroupForm staff={staff} events={events} />
      </div>
    </div>
  )
}
