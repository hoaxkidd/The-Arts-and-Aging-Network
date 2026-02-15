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
      role: { in: ['FACILITATOR', 'CONTRACTOR', 'PAYROLL'] },
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
    <div className="h-full flex flex-col p-6">
      <div className="flex-shrink-0 mb-6">
        <Link
          href="/admin/communication"
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 mb-2"
        >
          <ArrowLeft className="w-3 h-3" /> Back to Communication Hub
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Create Message Group</h1>
        <p className="text-sm text-gray-500">Set up a new group for team communication</p>
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        <CreateGroupForm staff={staff} events={events} />
      </div>
    </div>
  )
}
