import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { EventForm } from "@/components/admin/EventForm"

export default async function NewEventPage() {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN' && session?.user?.role !== 'PAYROLL') redirect('/dashboard')

  const [locations, formTemplates] = await Promise.all([
    prisma.location.findMany({ orderBy: { name: 'asc' } }),
    prisma.formTemplate.findMany({
      where: { isActive: true, isFillable: true },
      select: { id: true, title: true },
      orderBy: { title: 'asc' },
    }),
  ])

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0 overflow-auto pt-4">
        <EventForm
          locations={locations}
          formTemplates={formTemplates}
          backHref="/admin/bookings"
          currentUser={session?.user ? { name: session.user.name ?? '', email: session.user.email ?? '', role: session.user.role ?? '' } : null}
        />
      </div>
    </div>
  )
}
