import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { EventForm } from "@/components/admin/EventForm"
import Link from "next/link"
import { ArrowLeft, Calendar } from "lucide-react"

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
      <header className="flex-shrink-0 pb-4 border-b border-gray-200">
        <div className="space-y-3">
          <Link href="/admin/events" className="text-gray-500 hover:text-gray-700 flex items-center gap-2 text-sm">
            <ArrowLeft className="w-4 h-4" /> Back to Events
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-primary-100 text-primary-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-gray-900">Create Event</h1>
              <p className="text-xs text-gray-500">Add an event, assign location, and set required forms</p>
            </div>
          </div>
        </div>
      </header>
      <div className="flex-1 min-h-0 overflow-auto pt-4">
        <EventForm
          locations={locations}
          formTemplates={formTemplates}
          currentUser={session?.user ? { name: session.user.name ?? '', email: session.user.email ?? '', role: session.user.role ?? '' } : null}
        />
      </div>
    </div>
  )
}
