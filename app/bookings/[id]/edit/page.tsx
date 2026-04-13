import { prisma } from "@/lib/prisma"
import { EventForm } from "@/components/admin/EventForm"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default async function StaffEditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  
  // Strict Role Check for Staff Page
  if (session?.user?.role !== 'PAYROLL' && session?.user?.role !== 'ADMIN') {
    redirect('/bookings')
  }

  const event = await prisma.event.findUnique({
    where: { id },
  })
  
  const locations = await prisma.location.findMany({
    orderBy: { name: 'asc' }
  })

  if (!event) return <div>Booking not found</div>

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link href={`/bookings/${id}`} className="text-gray-500 hover:text-gray-700 flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to Event
        </Link>
      </div>
      <EventForm locations={locations} initialData={event} />
    </div>
  )
}