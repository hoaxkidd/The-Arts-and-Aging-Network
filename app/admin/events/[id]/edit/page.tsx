import { prisma } from "@/lib/prisma"
import { EventForm } from "@/components/admin/EventForm"

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
    <div className="h-full flex flex-col">
       <div className="flex-1 min-h-0 overflow-auto pt-4">
         <EventForm
            locations={locations}
            initialData={event}
            formTemplates={formTemplates}
            backHref="/admin/events"
          />
        </div>
     </div>
  )
}
