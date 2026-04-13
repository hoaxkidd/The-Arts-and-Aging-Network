import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { CreateGroupForm } from "@/components/messaging/CreateGroupForm"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { STYLES } from "@/lib/styles"
import { cn } from "@/lib/utils"

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

  // Get all events for event-based groups (both upcoming and recent past)
  const events = await prisma.event.findMany({
    where: {
      status: { in: ['DRAFT', 'PUBLISHED'] }
    },
    select: {
      id: true,
      title: true,
      startDateTime: true,
      status: true
    },
    orderBy: { startDateTime: 'desc' },
    take: 100
  })

  return (
    <div className={cn(STYLES.pageTemplateRoot, "h-full flex flex-col") }>
      <div className="flex-shrink-0">
        <Link href="/admin/communication" className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeft className="w-4 h-4" /> Back to Communication Hub
        </Link>
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        <CreateGroupForm staff={staff} events={events} />
      </div>
    </div>
  )
}
