import { prisma } from "@/lib/prisma"
import { EventForm } from "@/components/admin/EventForm"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [event, locations, formTemplates] = await Promise.all([
    prisma.event.findUnique({ where: { id } }),
    prisma.location.findMany({ orderBy: { name: 'asc' } }),
    prisma.formTemplate.findMany({
      where: { isActive: true, isFillable: true },
      select: { id: true, title: true },
      orderBy: { title: 'asc' },
    }),
  ])

  if (!event) return <div>Event not found</div>

  return (
    <div className="max-w-3xl mx-auto space-y-6">
       <Link href="/admin/events" className="text-gray-500 hover:text-gray-700 flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to Events
       </Link>
       
       <EventForm
         locations={locations}
         initialData={event}
         formTemplates={formTemplates}
       />
    </div>
  )
}